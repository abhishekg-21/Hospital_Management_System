/* eslint-disable @typescript-eslint/no-require-imports */
// backend/src/Admin_Backend/controllers/departmentController.js

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
 * Derives a short department code from the department name.
 * Used for display only — no schema column required.
 *
 * Rules (mirrors real hospital ERP conventions):
 *   "Cardiology"          → "CARD"
 *   "Ear Nose Throat"     → "ENT"
 *   "General Surgery"     → "GS"
 *   "Intensive Care Unit" → "ICU"
 *
 * If the name is a single word: first 4 chars, uppercased.
 * If multiple words: first char of each word, max 5 chars.
 */
const deriveDeptCode = (name) => {
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 4).toUpperCase();
  return words
    .map((w) => w[0])
    .join("")
    .slice(0, 5)
    .toUpperCase();
};

/**
 * Standard include block used across all queries.
 * Returns doctors with their details and the _count of doctors
 * so the frontend never needs a second fetch.
 */
const DEPT_INCLUDE = {
  doctors: {
    select: {
      id: true,
      doctorCode: true,
      name: true,
      specialization: true,
      phone: true,
      gender: true,
    },
    orderBy: { name: "asc" },
  },
  _count: {
    select: {
      doctors: true,
    },
  },
};

/**
 * Attaches a derived `code` field to a department object
 * so the frontend can display e.g. "CARD" without a DB column.
 */
const withCode = (dept) => ({
  ...dept,
  code: deriveDeptCode(dept.name),
  doctorCount: dept._count?.doctors ?? 0,
});

const withCodes = (depts) => depts.map(withCode);

/* ─── GET ALL DEPARTMENTS ─────────────────────────────────────────────────
   GET /api/departments
   Query params (all optional, backward-compatible — no params = raw array):
     search    – name or description
     page      – default 1
     limit     – default 0 (0 = all, preserves original behavior)
     sortBy    – name | createdAt | doctorCount (default createdAt)
     sortOrder – asc | desc (default asc for name, desc for others)
─────────────────────────────────────────────────────────────────────────── */

exports.getDepartments = async (req, res) => {
  try {
    const {
      search,
      page = 1,
      limit = 0,
      sortBy = "name",
      sortOrder,
    } = req.query;

    /* Default sort order: name → asc, others → desc */
    const order = sortOrder ?? (sortBy === "name" ? "asc" : "desc");

    /* Build where clause */
    const where = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    /* Pagination */
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = parseInt(limit, 10) || 0;
    const skip = limitNum > 0 ? (pageNum - 1) * limitNum : undefined;
    const take = limitNum > 0 ? limitNum : undefined;

    /* Sorting — doctorCount is a relation count so we handle it separately */
    const validSortFields = ["name", "createdAt"];
    const sortField = validSortFields.includes(sortBy) ? sortBy : "name";

    const [departments, total] = await Promise.all([
      prisma.department.findMany({
        where,
        include: DEPT_INCLUDE,
        orderBy:
          sortBy === "doctorCount"
            ? { doctors: { _count: order === "asc" ? "asc" : "desc" } }
            : { [sortField]: order },
        skip,
        take,
      }),
      prisma.department.count({ where }),
    ]);

    const enriched = withCodes(departments);

    /*
      Backward-compatibility path:
      When called with no params the original frontend does
      `setDepartments(response.data)` and expects a raw array.
      Return the raw array in that case, with the code field
      added (it's additive — nothing breaks).
    */
    if (!search && limitNum === 0 && !sortOrder) {
      return res.json(enriched);
    }

    return ok(res, {
      departments: enriched,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum || total,
        totalPages: limitNum > 0 ? Math.ceil(total / limitNum) : 1,
      },
    });
  } catch (error) {
    console.error("[getDepartments]", error);
    return fail(res, error.message, 500);
  }
};

/* ─── GET DEPARTMENT BY ID ────────────────────────────────────────────────
   GET /api/departments/:id
   Returns full department with doctors list.
─────────────────────────────────────────────────────────────────────────── */

exports.getDepartmentById = async (req, res) => {
  try {
    const dept = await prisma.department.findUnique({
      where: { id: req.params.id },
      include: DEPT_INCLUDE,
    });

    if (!dept) return fail(res, "Department not found.", 404);

    return ok(res, withCode(dept));
  } catch (error) {
    console.error("[getDepartmentById]", error);
    return fail(res, error.message, 500);
  }
};

/* ─── GET DEPARTMENT STATS ────────────────────────────────────────────────
   GET /api/departments/:id/stats
   Returns enriched stats: doctors, appointments, unique patients, today.
─────────────────────────────────────────────────────────────────────────── */

exports.getDepartmentStats = async (req, res) => {
  try {
    const { id } = req.params;

    const dept = await prisma.department.findUnique({
      where: { id },
      select: { id: true, name: true },
    });
    if (!dept) return fail(res, "Department not found.", 404);

    /* All doctor IDs in this department */
    const doctorRows = await prisma.doctor.findMany({
      where: { departmentId: id },
      select: { id: true },
    });
    const doctorIds = doctorRows.map((d) => d.id);

    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setUTCHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setUTCHours(23, 59, 59, 999);

    const [
      doctorCount,
      totalAppointments,
      todayAppointments,
      pendingAppointments,
      uniquePatientRows,
    ] = await Promise.all([
      prisma.doctor.count({ where: { departmentId: id } }),

      prisma.appointment.count({
        where: { doctorId: { in: doctorIds } },
      }),

      prisma.appointment.count({
        where: {
          doctorId: { in: doctorIds },
          date: { gte: todayStart, lte: todayEnd },
        },
      }),

      prisma.appointment.count({
        where: {
          doctorId: { in: doctorIds },
          status: { in: ["PENDING", "CONFIRMED"] },
        },
      }),

      prisma.appointment.findMany({
        where: { doctorId: { in: doctorIds } },
        select: { patientId: true },
        distinct: ["patientId"],
      }),
    ]);

    return ok(res, {
      department: dept,
      code: deriveDeptCode(dept.name),
      doctorCount,
      totalAppointments,
      todayAppointments,
      pendingAppointments,
      uniquePatients: uniquePatientRows.length,
    });
  } catch (error) {
    console.error("[getDepartmentStats]", error);
    return fail(res, error.message, 500);
  }
};

/* ─── CREATE DEPARTMENT ───────────────────────────────────────────────────
   POST /api/departments
   Body: { name, description? }
─────────────────────────────────────────────────────────────────────────── */

exports.createDepartment = async (req, res) => {
  try {
    const { name, description } = req.body;

    /* Required field check */
    if (!name?.trim()) {
      return fail(res, "Department name is required.", 422, ["name"]);
    }

    const trimmedName = name.trim();

    /*
      Case-insensitive duplicate check.
      The original `findUnique({ where: { name } })` is case-sensitive —
      "cardiology" and "Cardiology" would both be created.
      Using `findFirst` with mode: "insensitive" prevents that.
    */
    const exists = await prisma.department.findFirst({
      where: { name: { equals: trimmedName, mode: "insensitive" } },
    });

    if (exists) {
      return fail(
        res,
        `A department named "${exists.name}" already exists.`,
        409,
      );
    }

    const department = await prisma.department.create({
      data: {
        name: trimmedName,
        description: description?.trim() || null,
      },
      include: DEPT_INCLUDE,
    });

    return ok(
      res,
      withCode(department),
      "Department created successfully.",
      201,
    );
  } catch (error) {
    console.error("[createDepartment]", error);

    if (error.code === "P2002") {
      return fail(res, "A department with this name already exists.", 409);
    }

    return fail(res, error.message, 500);
  }
};

/* ─── UPDATE DEPARTMENT ───────────────────────────────────────────────────
   PUT /api/departments/:id
   Body: { name?, description? }
   Only `name` and `description` may be updated.
─────────────────────────────────────────────────────────────────────────── */

exports.updateDepartment = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.department.findUnique({ where: { id } });
    if (!existing) return fail(res, "Department not found.", 404);

    /* Build update payload — only whitelisted fields */
    const updateData = {};

    if (req.body.name !== undefined) {
      const trimmedName = req.body.name.trim();
      if (!trimmedName) {
        return fail(res, "Department name cannot be empty.", 422);
      }

      /* Case-insensitive uniqueness check, excluding self */
      if (trimmedName.toLowerCase() !== existing.name.toLowerCase()) {
        const conflict = await prisma.department.findFirst({
          where: {
            name: { equals: trimmedName, mode: "insensitive" },
            id: { not: id },
          },
        });
        if (conflict) {
          return fail(
            res,
            `A department named "${conflict.name}" already exists.`,
            409,
          );
        }
      }
      updateData.name = trimmedName;
    }

    if (req.body.description !== undefined) {
      updateData.description = req.body.description?.trim() || null;
    }

    const department = await prisma.department.update({
      where: { id },
      data: updateData,
      include: DEPT_INCLUDE,
    });

    return ok(res, withCode(department), "Department updated successfully.");
  } catch (error) {
    console.error("[updateDepartment]", error);

    if (error.code === "P2002") {
      return fail(res, "A department with this name already exists.", 409);
    }

    return fail(res, error.message, 500);
  }
};

/* ─── DELETE DEPARTMENT ───────────────────────────────────────────────────
   DELETE /api/departments/:id
   Blocked if the department has doctors assigned.
─────────────────────────────────────────────────────────────────────────── */

exports.deleteDepartment = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.department.findUnique({
      where: { id },
      select: { id: true, name: true },
    });
    if (!existing) return fail(res, "Department not found.", 404);

    /* Safety: count assigned doctors */
    const doctorCount = await prisma.doctor.count({
      where: { departmentId: id },
    });

    if (doctorCount > 0) {
      return fail(
        res,
        `Cannot delete "${existing.name}" — it has ${doctorCount} doctor${
          doctorCount > 1 ? "s" : ""
        } assigned. Please reassign or remove the doctor${
          doctorCount > 1 ? "s" : ""
        } first.`,
        409,
      );
    }

    await prisma.department.delete({ where: { id } });

    return ok(res, null, `Department "${existing.name}" deleted successfully.`);
  } catch (error) {
    console.error("[deleteDepartment]", error);

    /* Foreign key constraint — catches anything Prisma throws */
    if (error.code === "P2003") {
      return fail(
        res,
        "Cannot delete this department because it has linked records. Please remove them first.",
        409,
      );
    }

    return fail(res, error.message, 500);
  }
};
