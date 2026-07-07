/* eslint-disable @typescript-eslint/no-require-imports */
// backend/src/Admin_Backend/controllers/userController.js

const prisma = require("../../database/prisma");
const bcrypt = require("bcryptjs");

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

const ok   = (res, data, message = "Success", status = 200) =>
  res.status(status).json({ success: true, message, data });

const fail = (res, message = "Something went wrong", status = 400, errors = []) =>
  res.status(status).json({ success: false, message, errors });

/**
 * Strips the password hash from any user object before sending it
 * to the client. Called on every outbound user record.
 */
const safeUser = (user) => {
  const { password, ...rest } = user;
  return rest;
};

/* ─── GET ALL USERS ───────────────────────────────────────────────────────
   GET /api/users
   Query params (all optional, backward-compatible):
     search    – name or email
     role      – filter by role
     page      – default 1
     limit     – default 0 (0 = all — preserves original behavior)
     sortBy    – name | createdAt (default createdAt)
     sortOrder – asc | desc (default desc)
─────────────────────────────────────────────────────────────────────────── */

exports.getUsers = async (req, res) => {
  try {
    const {
      search,
      role,
      page      = 1,
      limit     = 0,
      sortBy    = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const where = {};
    if (role)   where.role = role;
    if (search) {
      where.OR = [
        { name:  { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    const pageNum  = Math.max(1, parseInt(page, 10)  || 1);
    const limitNum = parseInt(limit, 10) || 0;
    const skip     = limitNum > 0 ? (pageNum - 1) * limitNum : undefined;
    const take     = limitNum > 0 ? limitNum : undefined;

    const validSortFields = ["name", "createdAt", "email"];
    const sortField = validSortFields.includes(sortBy) ? sortBy : "createdAt";
    const order     = sortOrder === "asc" ? "asc" : "desc";

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { [sortField]: order },
        skip,
        take,
        select: {
          id:        true,
          name:      true,
          email:     true,
          role:      true,
          createdAt: true,
          /* Include linked profile summaries */
          patient: {
            select: { id: true, patientCode: true, phone: true, gender: true },
          },
          doctor: {
            select: { id: true, doctorCode: true, specialization: true, phone: true, department: { select: { name: true } } },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    /* Backward-compat: no params → raw array */
    if (limitNum === 0 && !search && !role) {
      return res.json(users);
    }

    return ok(res, {
      users,
      pagination: {
        total,
        page:       pageNum,
        limit:      limitNum || total,
        totalPages: limitNum > 0 ? Math.ceil(total / limitNum) : 1,
      },
    });
  } catch (error) {
    console.error("[getUsers]", error);
    return fail(res, error.message, 500);
  }
};

/* ─── GET USER BY ID ──────────────────────────────────────────────────────
   GET /api/users/:id
─────────────────────────────────────────────────────────────────────────── */

exports.getUserById = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true, name: true, email: true, role: true, createdAt: true,
        patient: true,
        doctor:  { include: { department: true } },
      },
    });
    if (!user) return fail(res, "User not found.", 404);
    return ok(res, user);
  } catch (error) {
    console.error("[getUserById]", error);
    return fail(res, error.message, 500);
  }
};

/* ─── GET STATS ───────────────────────────────────────────────────────────
   GET /api/users/stats
─────────────────────────────────────────────────────────────────────────── */

exports.getUserStats = async (req, res) => {
  try {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [total, byRole, newThisMonth] = await Promise.all([
      prisma.user.count(),
      prisma.user.groupBy({ by: ["role"], _count: { _all: true } }),
      prisma.user.count({ where: { createdAt: { gte: monthStart } } }),
    ]);

    const roleMap = Object.fromEntries(
      byRole.map((r) => [r.role, r._count._all])
    );

    return ok(res, {
      total,
      newThisMonth,
      byRole: {
        SUPER_ADMIN:  roleMap.SUPER_ADMIN  ?? 0,
        ADMIN:        roleMap.ADMIN        ?? 0,
        DOCTOR:       roleMap.DOCTOR       ?? 0,
        RECEPTIONIST: roleMap.RECEPTIONIST ?? 0,
        PATIENT:      roleMap.PATIENT      ?? 0,
      },
    });
  } catch (error) {
    console.error("[getUserStats]", error);
    return fail(res, error.message, 500);
  }
};

/* ─── CREATE USER ─────────────────────────────────────────────────────────
   POST /api/users
   Body: { name, email, password, role }
   Automatically creates the linked profile record for PATIENT/DOCTOR
   if the required extra fields are also provided.
─────────────────────────────────────────────────────────────────────────── */

const generatePatientCode = async () => {
  const last = await prisma.patient.findFirst({
    orderBy: { createdAt: "desc" },
    select:  { patientCode: true },
  });
  if (!last) return "PAT-0001";
  const n = parseInt(last.patientCode.replace(/\D/g, ""), 10);
  return `PAT-${String((isNaN(n) ? 0 : n) + 1).padStart(4, "0")}`;
};

const generateDoctorCode = async () => {
  const last = await prisma.doctor.findFirst({
    orderBy: { createdAt: "desc" },
    select:  { doctorCode: true },
  });
  if (!last) return "DOC-0001";
  const n = parseInt(last.doctorCode.replace(/\D/g, ""), 10);
  return `DOC-${String((isNaN(n) ? 0 : n) + 1).padStart(4, "0")}`;
};

exports.createUser = async (req, res) => {
  try {
    const {
      name, email, password, role,
      /* Optional profile fields used when creating a PATIENT or DOCTOR */
      phone, gender, age, address,
      departmentId, specialization, experience,
    } = req.body;

    /* ── Validation ── */
    const missing = [];
    if (!name?.trim())     missing.push("name");
    if (!email?.trim())    missing.push("email");
    if (!password)         missing.push("password");
    if (!role)             missing.push("role");
    if (missing.length) return fail(res, `Missing: ${missing.join(", ")}`, 422, missing);

    if (!/\S+@\S+\.\S+/.test(email)) return fail(res, "Invalid email address.", 422);
    if (password.length < 6)          return fail(res, "Password must be at least 6 characters.", 422);

    const validRoles = ["SUPER_ADMIN","ADMIN","DOCTOR","RECEPTIONIST","PATIENT"];
    if (!validRoles.includes(role)) return fail(res, `Invalid role. Must be one of: ${validRoles.join(", ")}`, 422);

    /* ── Duplicate email ── */
    const exists = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (exists) return fail(res, `A user with email ${email} already exists.`, 409);

    const hashed = await bcrypt.hash(password, 10);

    /* ── Create User ── */
    const user = await prisma.user.create({
      data: {
        name:     name.trim(),
        email:    email.trim().toLowerCase(),
        password: hashed,
        role,
      },
    });

    /* ── Auto-create linked profile ── */
    let profile = null;

    if (role === "PATIENT" && phone) {
      const patientCode = await generatePatientCode();
      profile = await prisma.patient.create({
        data: {
          patientCode,
          userId:    user.id,
          firstName: name.trim().split(" ")[0] ?? name.trim(),
          lastName:  name.trim().split(" ").slice(1).join(" ") || "-",
          age:       parseInt(age, 10) || 0,
          gender:    gender || "Unknown",
          phone:     phone.trim(),
          email:     email.trim().toLowerCase(),
          address:   address?.trim() || "",
        },
      });
    }

    if (role === "DOCTOR" && phone && departmentId && specialization) {
      const doctorCode = await generateDoctorCode();
      profile = await prisma.doctor.create({
        data: {
          doctorCode,
          userId:         user.id,
          name:           name.trim(),
          email:          email.trim().toLowerCase(),
          specialization: specialization.trim(),
          experience:     parseInt(experience, 10) || 0,
          phone:          phone.trim(),
          gender:         gender || null,
          address:        address?.trim() || null,
          departmentId,
        },
      });
    }

    return ok(res, { ...safeUser(user), profile }, "User created successfully.", 201);
  } catch (error) {
    console.error("[createUser]", error);
    if (error.code === "P2002") return fail(res, "A user with this email already exists.", 409);
    return fail(res, error.message, 500);
  }
};

/* ─── UPDATE USER ─────────────────────────────────────────────────────────
   PUT /api/users/:id
   Body: { name?, email?, password?, role? }
   Only whitelisted fields — never touches createdAt or id.
   Empty password = keep existing password.
─────────────────────────────────────────────────────────────────────────── */

exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) return fail(res, "User not found.", 404);

    const { name, email, password, role } = req.body;
    const updateData = {};

    if (name  !== undefined) updateData.name  = name.trim();
    if (role  !== undefined) {
      const validRoles = ["SUPER_ADMIN","ADMIN","DOCTOR","RECEPTIONIST","PATIENT"];
      if (!validRoles.includes(role)) return fail(res, "Invalid role.", 422);
      updateData.role = role;
    }

    if (email !== undefined) {
      const newEmail = email.trim().toLowerCase();
      if (!/\S+@\S+\.\S+/.test(newEmail)) return fail(res, "Invalid email address.", 422);
      if (newEmail !== existing.email) {
        const conflict = await prisma.user.findUnique({ where: { email: newEmail } });
        if (conflict) return fail(res, `Email ${email} is already in use.`, 409);
      }
      updateData.email = newEmail;
    }

    /* Password: only hash and update if a non-empty value is provided */
    if (password?.trim()) {
      if (password.length < 6) return fail(res, "Password must be at least 6 characters.", 422);
      updateData.password = await bcrypt.hash(password, 10);
    }

    const user = await prisma.user.update({
      where: { id },
      data:  updateData,
    });

    return ok(res, safeUser(user), "User updated successfully.");
  } catch (error) {
    console.error("[updateUser]", error);
    if (error.code === "P2002") return fail(res, "A user with this email already exists.", 409);
    return fail(res, error.message, 500);
  }
};

/* ─── DELETE USER ─────────────────────────────────────────────────────────
   DELETE /api/users/:id
─────────────────────────────────────────────────────────────────────────── */

exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) return fail(res, "User not found.", 404);

    await prisma.user.delete({ where: { id } });
    return ok(res, null, `User ${existing.name} deleted successfully.`);
  } catch (error) {
    console.error("[deleteUser]", error);
    if (error.code === "P2003") return fail(res, "Cannot delete this user — they have linked records.", 409);
    return fail(res, error.message, 500);
  }
};

/* ─── RESET PASSWORD ──────────────────────────────────────────────────────
   PATCH /api/users/:id/reset-password
   Body: { newPassword }
─────────────────────────────────────────────────────────────────────────── */

exports.resetPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return fail(res, "New password must be at least 6 characters.", 422);
    }

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) return fail(res, "User not found.", 404);

    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id }, data: { password: hashed } });

    return ok(res, null, "Password reset successfully.");
  } catch (error) {
    console.error("[resetPassword]", error);
    return fail(res, error.message, 500);
  }
};