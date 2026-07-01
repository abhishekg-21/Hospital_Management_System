/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-require-imports */
//  backend/src/controllers/appointmentController.js

const prisma = require("../../database/prisma");

/* =============================================================
   HELPERS
============================================================= */

/**
 * Derives a display code from the appointment's cuid.
 * e.g. "clx4r2k9f0000abc" → "APT-0000ABC"
 * Kept short and readable for the frontend badge.
 */
const toAppointmentCode = (id) => "APT-" + id.slice(-7).toUpperCase();

/**
 * Wraps a Prisma appointment row so every response includes
 * a stable `appointmentCode` string the frontend can display
 * and copy without the schema needing a new column.
 */
const withCode = (appointment) => ({
  ...appointment,
  appointmentCode: toAppointmentCode(appointment.id),
});

const withCodes = (appointments) => appointments.map(withCode);

/**
 * Builds a normalised success envelope.
 */
const ok = (res, data, message = "Success", status = 200) =>
  res.status(status).json({ success: true, message, data });

/**
 * Builds a normalised error envelope.
 */
const fail = (
  res,
  message = "Something went wrong",
  status = 400,
  errors = [],
) => res.status(status).json({ success: false, message, errors });

/**
 * Standard Prisma include block reused in every query so the
 * response shape is always consistent.
 */
const APPOINTMENT_INCLUDE = {
  patient: true,
  doctor: {
    include: {
      department: true,
    },
  },
};

/**
 * Returns midnight (00:00:00.000) of the given date in UTC
 * so date-only comparisons work regardless of time stored.
 */
const dayStart = (date) => {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

const dayEnd = (date) => {
  const d = new Date(date);
  d.setUTCHours(23, 59, 59, 999);
  return d;
};

/* =============================================================
   GET ALL APPOINTMENTS  (existing — enhanced)
   GET /api/appointments
   Query params (all optional, backward-compatible):
     search    – patient name, doctor name, or appointment code
     status    – PENDING | CONFIRMED | CHECKED_IN | COMPLETED | CANCELLED
     date      – YYYY-MM-DD  (exact date filter)
     doctorId  – filter by doctor
     patientId – filter by patient
     page      – page number (default 1)
     limit     – items per page (default 50, 0 = no limit)
     sortBy    – createdAt | date (default createdAt)
     sortOrder – asc | desc (default desc)
============================================================= */

exports.getAppointments = async (req, res) => {
  try {
    const {
      search,
      status,
      date,
      doctorId,
      patientId,
      page = 1,
      limit = 50,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    /* ── Build where clause ─────────────────────────────── */
    const where = {};

    if (status) {
      where.status = status.toUpperCase();
    }

    if (doctorId) {
      where.doctorId = doctorId;
    }

    if (patientId) {
      where.patientId = patientId;
    }

    if (date) {
      const d = new Date(date);
      where.date = { gte: dayStart(d), lte: dayEnd(d) };
    }

    if (search) {
      where.OR = [
        { patient: { firstName: { contains: search, mode: "insensitive" } } },
        { patient: { lastName: { contains: search, mode: "insensitive" } } },
        { patient: { patientCode: { contains: search, mode: "insensitive" } } },
        { doctor: { name: { contains: search, mode: "insensitive" } } },
      ];
    }

    /* ── Pagination ─────────────────────────────────────── */
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = parseInt(limit, 10) || 50;
    const skip = limitNum > 0 ? (pageNum - 1) * limitNum : undefined;
    const take = limitNum > 0 ? limitNum : undefined;

    /* ── Sorting ─────────────────────────────────────────── */
    const validSortFields = ["createdAt", "date"];
    const sortField = validSortFields.includes(sortBy) ? sortBy : "createdAt";
    const order = sortOrder === "asc" ? "asc" : "desc";

    /* ── Query ───────────────────────────────────────────── */
    const [appointments, total] = await Promise.all([
      prisma.appointment.findMany({
        where,
        include: APPOINTMENT_INCLUDE,
        orderBy: { [sortField]: order },
        skip,
        take,
      }),
      prisma.appointment.count({ where }),
    ]);

    return ok(res, {
      appointments: withCodes(appointments),
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: limitNum > 0 ? Math.ceil(total / limitNum) : 1,
      },
    });
  } catch (error) {
    console.error("[getAppointments]", error);
    return fail(res, error.message, 500);
  }
};

/* =============================================================
   GET SINGLE APPOINTMENT  (new)
   GET /api/appointments/:id
============================================================= */

exports.getAppointmentById = async (req, res) => {
  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id: req.params.id },
      include: {
        ...APPOINTMENT_INCLUDE,
        consultation: {
          include: { prescriptions: true },
        },
      },
    });

    if (!appointment) {
      return fail(res, "Appointment not found", 404);
    }

    return ok(res, withCode(appointment));
  } catch (error) {
    console.error("[getAppointmentById]", error);
    return fail(res, error.message, 500);
  }
};

/* =============================================================
   TODAY'S APPOINTMENTS  (new)
   GET /api/appointments/today
============================================================= */

exports.getTodaysAppointments = async (req, res) => {
  try {
    const now = new Date();

    const appointments = await prisma.appointment.findMany({
      where: {
        date: { gte: dayStart(now), lte: dayEnd(now) },
      },
      include: APPOINTMENT_INCLUDE,
      orderBy: { time: "asc" },
    });

    return ok(res, {
      appointments: withCodes(appointments),
      total: appointments.length,
      date: now.toISOString().slice(0, 10),
    });
  } catch (error) {
    console.error("[getTodaysAppointments]", error);
    return fail(res, error.message, 500);
  }
};

/* =============================================================
   UPCOMING APPOINTMENTS  (new)
   GET /api/appointments/upcoming
   Returns all PENDING / CONFIRMED appointments from tomorrow
   onwards, up to 30 days ahead by default.
   Query: days (default 30), limit (default 50)
============================================================= */

exports.getUpcomingAppointments = async (req, res) => {
  try {
    const days = Math.min(365, Math.max(1, parseInt(req.query.days, 10) || 30));
    const limit = Math.min(
      200,
      Math.max(1, parseInt(req.query.limit, 10) || 50),
    );

    const from = new Date();
    from.setDate(from.getDate() + 1); // start from tomorrow

    const to = new Date(from);
    to.setDate(to.getDate() + days);

    const appointments = await prisma.appointment.findMany({
      where: {
        date: { gte: dayStart(from), lte: dayEnd(to) },
        status: { in: ["PENDING", "CONFIRMED"] },
      },
      include: APPOINTMENT_INCLUDE,
      orderBy: [{ date: "asc" }, { time: "asc" }],
      take: limit,
    });

    return ok(res, {
      appointments: withCodes(appointments),
      total: appointments.length,
      range: {
        from: from.toISOString().slice(0, 10),
        to: to.toISOString().slice(0, 10),
      },
    });
  } catch (error) {
    console.error("[getUpcomingAppointments]", error);
    return fail(res, error.message, 500);
  }
};

/* =============================================================
   CREATE APPOINTMENT  (existing — enhanced)
   POST /api/appointments
   Body: { patientId, doctorId, date, time }
============================================================= */

exports.createAppointment = async (req, res) => {
  try {
    const { patientId, doctorId, date, time } = req.body;

    /* ── Required field validation ───────────────────────── */
    const missing = [];
    if (!patientId) missing.push("patientId");
    if (!doctorId) missing.push("doctorId");
    if (!date) missing.push("date");
    if (!time) missing.push("time");

    if (missing.length > 0) {
      return fail(
        res,
        `Missing required fields: ${missing.join(", ")}`,
        422,
        missing,
      );
    }

    /* ── Past date check ─────────────────────────────────── */
    const appointmentDate = new Date(date);
    if (isNaN(appointmentDate.getTime())) {
      return fail(res, "Invalid date format. Use YYYY-MM-DD.", 422);
    }

    const today = dayStart(new Date());
    if (appointmentDate < today) {
      return fail(res, "Cannot book an appointment for a past date.", 422);
    }

    /* ── Verify patient exists ───────────────────────────── */
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
    });
    if (!patient) {
      return fail(res, "Patient not found.", 404);
    }

    /* ── Verify doctor exists ────────────────────────────── */
    const doctor = await prisma.doctor.findUnique({ where: { id: doctorId } });
    if (!doctor) {
      return fail(res, "Doctor not found.", 404);
    }

    /* ── Slot conflict check (doctor) ────────────────────── */
    const doctorConflict = await prisma.appointment.findFirst({
      where: {
        doctorId,
        date: { gte: dayStart(appointmentDate), lte: dayEnd(appointmentDate) },
        time,
        status: { notIn: ["CANCELLED"] },
      },
    });

    if (doctorConflict) {
      return fail(
        res,
        `Dr. ${doctor.name} already has an appointment at ${time} on this date. Please choose a different time slot.`,
        409,
      );
    }

    /* ── Duplicate appointment check (same patient+doctor+date) ── */
    const patientConflict = await prisma.appointment.findFirst({
      where: {
        patientId,
        doctorId,
        date: { gte: dayStart(appointmentDate), lte: dayEnd(appointmentDate) },
        status: { notIn: ["CANCELLED"] },
      },
    });

    if (patientConflict) {
      return fail(
        res,
        `${patient.firstName} ${patient.lastName} already has an appointment with Dr. ${doctor.name} on this date.`,
        409,
      );
    }

    /* ── Create ──────────────────────────────────────────── */
    const appointment = await prisma.appointment.create({
      data: {
        patientId,
        doctorId,
        date: appointmentDate,
        time,
      },
      // Return full relations so the frontend table row is
      // immediately complete without a second fetch.
      include: APPOINTMENT_INCLUDE,
    });

    return ok(
      res,
      withCode(appointment),
      "Appointment booked successfully",
      201,
    );
  } catch (error) {
    console.error("[createAppointment]", error);
    return fail(res, error.message, 500);
  }
};

/* =============================================================
   UPDATE APPOINTMENT  (existing — enhanced)
   PUT /api/appointments/:id
   Body: any subset of { date, time, status, doctorId, patientId }
============================================================= */

exports.updateAppointment = async (req, res) => {
  try {
    const { id } = req.params;

    /* ── Verify appointment exists ───────────────────────── */
    const existing = await prisma.appointment.findUnique({ where: { id } });
    if (!existing) {
      return fail(res, "Appointment not found.", 404);
    }

    /* ── Prevent editing a cancelled appointment ─────────── */
    if (existing.status === "CANCELLED") {
      return fail(res, "Cannot modify a cancelled appointment.", 422);
    }

    const updateData = { ...req.body };

    /* ── If rescheduling, validate new date/time ─────────── */
    if (updateData.date) {
      const newDate = new Date(updateData.date);
      if (isNaN(newDate.getTime())) {
        return fail(res, "Invalid date format. Use YYYY-MM-DD.", 422);
      }
      if (newDate < dayStart(new Date())) {
        return fail(res, "Cannot reschedule to a past date.", 422);
      }
      updateData.date = newDate;

      /* Check slot conflict on the new date/time if rescheduling */
      const newTime = updateData.time || existing.time;
      const targetDocId = updateData.doctorId || existing.doctorId;

      const conflict = await prisma.appointment.findFirst({
        where: {
          id: { not: id }, // exclude self
          doctorId: targetDocId,
          date: { gte: dayStart(newDate), lte: dayEnd(newDate) },
          time: newTime,
          status: { notIn: ["CANCELLED"] },
        },
      });

      if (conflict) {
        return fail(
          res,
          "The selected time slot is already booked for this doctor.",
          409,
        );
      }
    }

    /* ── Validate status enum if provided ────────────────── */
    const validStatuses = [
      "PENDING",
      "CONFIRMED",
      "CHECKED_IN",
      "COMPLETED",
      "CANCELLED",
    ];
    if (
      updateData.status &&
      !validStatuses.includes(updateData.status.toUpperCase())
    ) {
      return fail(
        res,
        `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
        422,
      );
    }
    if (updateData.status) {
      updateData.status = updateData.status.toUpperCase();
    }

    const appointment = await prisma.appointment.update({
      where: { id },
      data: updateData,
      include: APPOINTMENT_INCLUDE,
    });

    return ok(res, withCode(appointment), "Appointment updated successfully");
  } catch (error) {
    console.error("[updateAppointment]", error);
    return fail(res, error.message, 500);
  }
};

/* =============================================================
   CANCEL APPOINTMENT  (new — convenience route)
   PATCH /api/appointments/:id/cancel
============================================================= */

exports.cancelAppointment = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.appointment.findUnique({ where: { id } });
    if (!existing) {
      return fail(res, "Appointment not found.", 404);
    }

    if (existing.status === "CANCELLED") {
      return fail(res, "Appointment is already cancelled.", 422);
    }

    if (existing.status === "COMPLETED") {
      return fail(res, "Cannot cancel a completed appointment.", 422);
    }

    const appointment = await prisma.appointment.update({
      where: { id },
      data: { status: "CANCELLED" },
      include: APPOINTMENT_INCLUDE,
    });

    return ok(res, withCode(appointment), "Appointment cancelled successfully");
  } catch (error) {
    console.error("[cancelAppointment]", error);
    return fail(res, error.message, 500);
  }
};

/* =============================================================
   DELETE APPOINTMENT  (existing — unchanged logic, new envelope)
   DELETE /api/appointments/:id
============================================================= */

exports.deleteAppointment = async (req, res) => {
  try {
    const existing = await prisma.appointment.findUnique({
      where: { id: req.params.id },
    });

    if (!existing) {
      return fail(res, "Appointment not found.", 404);
    }

    await prisma.appointment.delete({ where: { id: req.params.id } });

    return ok(res, null, "Appointment deleted successfully");
  } catch (error) {
    console.error("[deleteAppointment]", error);
    return fail(res, error.message, 500);
  }
};

/* =============================================================
   GET AVAILABLE TIME SLOTS FOR A DOCTOR ON A DATE  (new)
   GET /api/appointments/slots?doctorId=&date=
   Returns the standard 30-minute slot grid minus already-booked
   slots, so the frontend can disable taken slots in real time.
============================================================= */

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

exports.getAvailableSlots = async (req, res) => {
  try {
    const { doctorId, date } = req.query;

    if (!doctorId || !date) {
      return fail(res, "doctorId and date are required query parameters.", 422);
    }

    const targetDate = new Date(date);
    if (isNaN(targetDate.getTime())) {
      return fail(res, "Invalid date format. Use YYYY-MM-DD.", 422);
    }

    /* Fetch already-booked (non-cancelled) slots for this doctor on this date */
    const booked = await prisma.appointment.findMany({
      where: {
        doctorId,
        date: { gte: dayStart(targetDate), lte: dayEnd(targetDate) },
        status: { notIn: ["CANCELLED"] },
      },
      select: { time: true },
    });

    const bookedTimes = new Set(booked.map((a) => a.time));

    const slots = ALL_SLOTS.map((time) => ({
      time,
      available: !bookedTimes.has(time),
    }));

    return ok(res, { doctorId, date, slots });
  } catch (error) {
    console.error("[getAvailableSlots]", error);
    return fail(res, error.message, 500);
  }
};

/* =============================================================
   APPOINTMENT HISTORY FOR A PATIENT  (new)
   GET /api/appointments/patient/:patientId/history
============================================================= */

exports.getPatientHistory = async (req, res) => {
  try {
    const { patientId } = req.params;

    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
    });
    if (!patient) {
      return fail(res, "Patient not found.", 404);
    }

    const appointments = await prisma.appointment.findMany({
      where: { patientId },
      include: APPOINTMENT_INCLUDE,
      orderBy: { date: "desc" },
    });

    return ok(res, {
      patient,
      appointments: withCodes(appointments),
      total: appointments.length,
    });
  } catch (error) {
    console.error("[getPatientHistory]", error);
    return fail(res, error.message, 500);
  }
};
