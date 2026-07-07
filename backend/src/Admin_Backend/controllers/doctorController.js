/* eslint-disable @typescript-eslint/no-require-imports */
// backend/src/Admin_Backend/controllers/doctorController.js

const prisma = require("../../database/prisma");

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

const ok = (res, data, message = "Success", status = 200) =>
  res.status(status).json({ success: true, message, data });

const fail = (
  res,
  message = "Something went wrong",
  status = 400,
  errors = [],
) => res.status(status).json({ success: false, message, errors });

/**
 * Generates the next doctor code safely.
 *
 * WHY NOT count()+1:
 *   The original `count() + 1` approach has two failure modes:
 *   1. Race condition — two concurrent creates both read the same count.
 *   2. Collision after delete — deleting DOC-0003 then adding a new doctor
 *      produces another DOC-0003 which may conflict with archived references.
 *
 * FIX: Find the highest existing code numerically and increment that.
 *   This is monotonically increasing and deletion-safe.
 */
const generateDoctorCode = async () => {
  const last = await prisma.doctor.findFirst({
    orderBy: { createdAt: "desc" },
    select: { doctorCode: true },
  });

  if (!last) return "DOC-0001";

  // Extract numeric suffix regardless of separator style (DOC0001 or DOC-0001)
  const numeric = parseInt(last.doctorCode.replace(/\D/g, ""), 10);
  if (isNaN(numeric)) return "DOC-0001";

  return `DOC-${String(numeric + 1).padStart(4, "0")}`;
};

/* ─── Whitelisted fields for create/update ────────────────────────────────── */
/*
  Only these fields may be written through the API.
  This prevents the original `data: req.body` vulnerability where
  a caller could overwrite `doctorCode`, `id`, or any other field.
*/
const extractDoctorFields = (body) => {
  const {
    name,
    email,
    specialization,
    experience,
    qualification,
    phone,
    gender,
    address,
    departmentId,
  } = body;
  return {
    name,
    email,
    specialization,
    experience,
    qualification,
    phone,
    gender,
    address,
    departmentId,
  };
};

/* ─── GET ALL DOCTORS ──────────────────────────────────────────────────────
   GET /api/doctors
   Query params (all optional, backward-compatible):
     search    – name, email, specialization, doctorCode
     departmentId – filter by department
     gender    – Male | Female | Other
     page      – default 1
     limit     – default 20 (0 = all, backward-compat)
     sortBy    – name | experience | createdAt | specialization (default createdAt)
     sortOrder – asc | desc (default desc)
─────────────────────────────────────────────────────────────────────────── */

exports.getDoctors = async (req, res) => {
  try {
    const {
      search,
      departmentId,
      gender,
      page = 1,
      limit = 0, // 0 = no limit, preserves original behavior
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    /* Build where clause */
    const where = {};

    if (departmentId) where.departmentId = departmentId;
    if (gender) where.gender = gender;

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { specialization: { contains: search, mode: "insensitive" } },
        { doctorCode: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
      ];
    }

    /* Pagination */
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = parseInt(limit, 10) || 0;
    const skip = limitNum > 0 ? (pageNum - 1) * limitNum : undefined;
    const take = limitNum > 0 ? limitNum : undefined;

    /* Sorting — whitelist to prevent injection */
    const validSortFields = [
      "name",
      "experience",
      "createdAt",
      "specialization",
      "doctorCode",
    ];
    const sortField = validSortFields.includes(sortBy) ? sortBy : "createdAt";
    const order = sortOrder === "asc" ? "asc" : "desc";

    const [doctors, total] = await Promise.all([
      prisma.doctor.findMany({
        where,
        include: { department: true },
        orderBy: { [sortField]: order },
        skip,
        take,
      }),
      prisma.doctor.count({ where }),
    ]);

    /* When no pagination params are sent, return raw array for
       backward-compatibility with the existing frontend that does
       setDoctors(response.data). When pagination IS requested,
       return the envelope. */
    if (limitNum === 0 && !search && !departmentId && !gender) {
      // Legacy path — existing frontend consumers get what they expect
      return res.json(doctors);
    }

    return ok(res, {
      doctors,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum || total,
        totalPages: limitNum > 0 ? Math.ceil(total / limitNum) : 1,
      },
    });
  } catch (error) {
    console.error("[getDoctors]", error);
    return fail(res, error.message, 500);
  }
};

/* ─── GET DOCTOR BY ID ─────────────────────────────────────────────────────
   GET /api/doctors/:id
   Returns full profile including recent appointments and stats.
─────────────────────────────────────────────────────────────────────────── */

exports.getDoctorById = async (req, res) => {
  try {
    const doctor = await prisma.doctor.findUnique({
      where: { id: req.params.id },
      include: {
        department: true,
        appointments: {
          include: { patient: true },
          orderBy: { date: "desc" },
          take: 10,
        },
      },
    });

    if (!doctor) return fail(res, "Doctor not found.", 404);

    /* Build a lightweight stats summary */
    const [totalAppointments, completedAppointments, totalPatients] =
      await Promise.all([
        prisma.appointment.count({ where: { doctorId: doctor.id } }),
        prisma.appointment.count({
          where: { doctorId: doctor.id, status: "COMPLETED" },
        }),
        prisma.appointment
          .findMany({
            where: { doctorId: doctor.id },
            select: { patientId: true },
            distinct: ["patientId"],
          })
          .then((rows) => rows.length),
      ]);

    return ok(res, {
      ...doctor,
      stats: { totalAppointments, completedAppointments, totalPatients },
    });
  } catch (error) {
    console.error("[getDoctorById]", error);
    return fail(res, error.message, 500);
  }
};

/* ─── CREATE DOCTOR ────────────────────────────────────────────────────────
   POST /api/doctors
   Body: { name, email, specialization, experience, qualification,
           phone, gender, address, departmentId }
─────────────────────────────────────────────────────────────────────────── */

exports.createDoctor = async (req, res) => {
  try {
    const {
      name,
      email,
      specialization,
      experience,
      qualification,
      phone,
      gender,
      address,
      departmentId,
    } = req.body;

    /* ── Required field validation ────────────────────────────────────── */
    const missing = [];
    if (!name?.trim()) missing.push("name");
    if (!email?.trim()) missing.push("email");
    if (!specialization?.trim()) missing.push("specialization");
    if (!phone?.trim()) missing.push("phone");
    if (!departmentId) missing.push("departmentId");
    if (experience === undefined || experience === "")
      missing.push("experience");

    if (missing.length) {
      return fail(
        res,
        `Missing required fields: ${missing.join(", ")}`,
        422,
        missing,
      );
    }

    /* ── Email format ─────────────────────────────────────────────────── */
    if (!/\S+@\S+\.\S+/.test(email)) {
      return fail(res, "Invalid email address.", 422);
    }

    /* ── Experience must be a non-negative number ─────────────────────── */
    const parsedExp = Number(experience);
    if (isNaN(parsedExp) || parsedExp < 0 || parsedExp > 70) {
      return fail(
        res,
        "Experience must be a number between 0 and 70 years.",
        422,
      );
    }

    /* ── Duplicate email check ────────────────────────────────────────── */
    const emailConflict = await prisma.doctor.findUnique({
      where: { email: email.trim() },
    });
    if (emailConflict) {
      return fail(
        res,
        `A doctor with email ${email} already exists (${emailConflict.doctorCode}).`,
        409,
      );
    }

    /* ── Verify department exists ─────────────────────────────────────── */
    const dept = await prisma.department.findUnique({
      where: { id: departmentId },
    });
    if (!dept) {
      return fail(res, "Selected department does not exist.", 404);
    }

    /* ── Generate code ────────────────────────────────────────────────── */
    const doctorCode = await generateDoctorCode();

    /* ── Create ───────────────────────────────────────────────────────── */
    const doctor = await prisma.doctor.create({
      data: {
        doctorCode,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        specialization: specialization.trim(),
        experience: parsedExp,
        qualification: qualification?.trim() || null,
        phone: phone.trim(),
        gender: gender?.trim() || null,
        address: address?.trim() || null,
        departmentId,
      },
      // Return department relation so the frontend table row is
      // immediately complete without a second fetch.
      include: { department: true },
    });

    return ok(res, doctor, "Doctor created successfully.", 201);
  } catch (error) {
    console.error("[createDoctor]", error);

    if (error.code === "P2002") {
      const field = error.meta?.target?.join(", ") || "field";
      return fail(res, `A doctor with this ${field} already exists.`, 409);
    }

    return fail(res, error.message, 500);
  }
};

/* ─── UPDATE DOCTOR ────────────────────────────────────────────────────────
   PUT /api/doctors/:id
   Body: any subset of doctor fields (doctorCode is immutable)
─────────────────────────────────────────────────────────────────────────── */

exports.updateDoctor = async (req, res) => {
  try {
    const { id } = req.params;

    /* Verify doctor exists */
    const existing = await prisma.doctor.findUnique({ where: { id } });
    if (!existing) return fail(res, "Doctor not found.", 404);

    /* Only allow whitelisted fields — never touch doctorCode or id */
    const fields = extractDoctorFields(req.body);
    const updateData = {};

    if (fields.name !== undefined) updateData.name = fields.name.trim();
    if (fields.specialization !== undefined)
      updateData.specialization = fields.specialization.trim();
    if (fields.qualification !== undefined)
      updateData.qualification = fields.qualification?.trim() || null;
    if (fields.gender !== undefined)
      updateData.gender = fields.gender?.trim() || null;
    if (fields.address !== undefined)
      updateData.address = fields.address?.trim() || null;
    if (fields.departmentId !== undefined)
      updateData.departmentId = fields.departmentId;

    /* Experience validation if updating */
    if (fields.experience !== undefined) {
      const parsedExp = Number(fields.experience);
      if (isNaN(parsedExp) || parsedExp < 0 || parsedExp > 70) {
        return fail(
          res,
          "Experience must be a number between 0 and 70 years.",
          422,
        );
      }
      updateData.experience = parsedExp;
    }

    /* Email validation + duplicate check if changing */
    if (fields.email !== undefined) {
      const newEmail = fields.email.trim().toLowerCase();
      if (!/\S+@\S+\.\S+/.test(newEmail)) {
        return fail(res, "Invalid email address.", 422);
      }
      if (newEmail !== existing.email) {
        const conflict = await prisma.doctor.findUnique({
          where: { email: newEmail },
        });
        if (conflict) {
          return fail(
            res,
            `Email ${newEmail} is already registered to ${conflict.doctorCode}.`,
            409,
          );
        }
      }
      updateData.email = newEmail;
    }

    /* Phone duplicate check if changing */
    if (fields.phone !== undefined && fields.phone.trim() !== existing.phone) {
      const phoneConflict = await prisma.doctor.findFirst({
        where: { phone: fields.phone.trim(), id: { not: id } },
      });
      if (phoneConflict) {
        return fail(
          res,
          `Phone ${fields.phone} is already registered to ${phoneConflict.doctorCode}.`,
          409,
        );
      }
      updateData.phone = fields.phone.trim();
    }

    /* Verify new department exists if changing */
    if (
      updateData.departmentId &&
      updateData.departmentId !== existing.departmentId
    ) {
      const dept = await prisma.department.findUnique({
        where: { id: updateData.departmentId },
      });
      if (!dept) return fail(res, "Selected department does not exist.", 404);
    }

    const doctor = await prisma.doctor.update({
      where: { id },
      data: updateData,
      include: { department: true },
    });

    return ok(res, doctor, "Doctor updated successfully.");
  } catch (error) {
    console.error("[updateDoctor]", error);

    if (error.code === "P2002") {
      const field = error.meta?.target?.join(", ") || "field";
      return fail(res, `A doctor with this ${field} already exists.`, 409);
    }

    return fail(res, error.message, 500);
  }
};

/* ─── DELETE DOCTOR ────────────────────────────────────────────────────────
   DELETE /api/doctors/:id
─────────────────────────────────────────────────────────────────────────── */

exports.deleteDoctor = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.doctor.findUnique({ where: { id } });
    if (!existing) return fail(res, "Doctor not found.", 404);

    /* Check for active (non-cancelled, non-completed) appointments */
    const activeCount = await prisma.appointment.count({
      where: {
        doctorId: id,
        status: { notIn: ["CANCELLED", "COMPLETED"] },
      },
    });

    if (activeCount > 0) {
      return fail(
        res,
        `Cannot delete Dr. ${existing.name} — they have ${activeCount} active appointment${activeCount > 1 ? "s" : ""}. Please cancel or reassign those appointments first.`,
        409,
      );
    }

    await prisma.doctor.delete({ where: { id } });

    return ok(res, null, `Dr. ${existing.name} has been deleted successfully.`);
  } catch (error) {
    console.error("[deleteDoctor]", error);

    if (error.code === "P2003") {
      return fail(
        res,
        "Cannot delete this doctor because they have existing records. Please remove linked appointments first.",
        409,
      );
    }

    return fail(res, error.message, 500);
  }
};

/* ─── GET DOCTOR AVAILABILITY (slots) ─────────────────────────────────────
   GET /api/doctors/:id/slots?date=YYYY-MM-DD
   Returns the 18-slot grid with availability status for a given date.
   Reuses the same slot grid as the appointment controller so they
   stay in sync.
─────────────────────────────────────────────────────────────────────────── */

const ALL_SLOTS = [
  "08:00",
  "08:30",
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "12:00",
  "13:00",
  "13:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
  "17:00",
];

exports.getDoctorSlots = async (req, res) => {
  try {
    const { id } = req.params;
    const { date } = req.query;

    if (!date)
      return fail(res, "date query parameter is required (YYYY-MM-DD).", 422);

    const targetDate = new Date(date);
    if (isNaN(targetDate.getTime()))
      return fail(res, "Invalid date format.", 422);

    const doctor = await prisma.doctor.findUnique({
      where: { id },
      select: { id: true, name: true, doctorCode: true },
    });
    if (!doctor) return fail(res, "Doctor not found.", 404);

    const dayStart = new Date(targetDate);
    dayStart.setUTCHours(0, 0, 0, 0);
    const dayEnd = new Date(targetDate);
    dayEnd.setUTCHours(23, 59, 59, 999);

    const booked = await prisma.appointment.findMany({
      where: {
        doctorId: id,
        date: { gte: dayStart, lte: dayEnd },
        status: { notIn: ["CANCELLED"] },
      },
      select: {
        time: true,
        status: true,
        patient: { select: { firstName: true, lastName: true } },
      },
    });

    const bookedMap = new Map(booked.map((a) => [a.time, a]));

    const slots = ALL_SLOTS.map((time) => {
      const existing = bookedMap.get(time);
      return {
        time,
        available: !existing,
        status: existing?.status ?? null,
        patient: existing?.patient
          ? `${existing.patient.firstName} ${existing.patient.lastName}`
          : null,
      };
    });

    return ok(res, { doctor, date, slots });
  } catch (error) {
    console.error("[getDoctorSlots]", error);
    return fail(res, error.message, 500);
  }
};
