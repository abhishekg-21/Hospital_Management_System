/* eslint-disable @typescript-eslint/no-require-imports */
// backend/src/Admin_Backend/controllers/authController.js

const prisma = require("../../database/prisma");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

/* ─── Shared helpers ──────────────────────────────────────────────────────── */

const generatePatientCode = async () => {
  const last = await prisma.patient.findFirst({
    orderBy: { createdAt: "desc" },
    select: { patientCode: true },
  });
  if (!last) return "PAT-0001";
  const n = parseInt(last.patientCode.replace(/\D/g, ""), 10);
  return `PAT-${String((isNaN(n) ? 0 : n) + 1).padStart(4, "0")}`;
};

const buildAuthResponse = (user, patient, doctor) => {
  const token = jwt.sign(
    {
      id: user.id,
      role: user.role,
      patientId: patient?.id ?? null,
      doctorId: doctor?.id ?? null,
    },
    process.env.JWT_SECRET,
    { expiresIn: "24h" },
  );
  const profileData = patient ?? doctor ?? null;
  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      profileId: profileData?.id ?? null,
      patientId: patient?.id ?? null,
      doctorId: doctor?.id ?? null,
      profile: profileData,
    },
  };
};

/* ═══════════════════════════════════════════════════════════════════════════
   LOGIN  —  POST /api/auth/login
═══════════════════════════════════════════════════════════════════════════ */

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email?.trim() || !password) {
      return res
        .status(422)
        .json({ message: "Email and password are required." });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      include: {
        patient: {
          select: {
            id: true,
            patientCode: true,
            firstName: true,
            lastName: true,
            phone: true,
            gender: true,
            age: true,
            bloodGroup: true,
          },
        },
        doctor: {
          select: {
            id: true,
            doctorCode: true,
            name: true,
            specialization: true,
            department: { select: { name: true } },
          },
        },
      },
    });

    if (!user)
      return res.status(401).json({ message: "Invalid email or password." });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid)
      return res.status(401).json({ message: "Invalid email or password." });

    let patient = user.patient;
    let doctor = user.doctor;

    // Legacy backfill by email for accounts created before schema migration
    if (user.role === "PATIENT" && !patient) {
      patient = await prisma.patient.findFirst({
        where: { email: user.email },
        select: {
          id: true,
          patientCode: true,
          firstName: true,
          lastName: true,
          phone: true,
          gender: true,
          age: true,
          bloodGroup: true,
        },
      });
      if (patient) {
        await prisma.patient
          .update({ where: { id: patient.id }, data: { userId: user.id } })
          .catch(() => {});
      }
    }

    if (user.role === "DOCTOR" && !doctor) {
      doctor = await prisma.doctor.findFirst({
        where: { email: user.email },
        select: {
          id: true,
          doctorCode: true,
          name: true,
          specialization: true,
          department: { select: { name: true } },
        },
      });
      if (doctor) {
        await prisma.doctor
          .update({ where: { id: doctor.id }, data: { userId: user.id } })
          .catch(() => {});
      }
    }

    return res.json(buildAuthResponse(user, patient, doctor));
  } catch (error) {
    console.error("[login]", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};

/* ═══════════════════════════════════════════════════════════════════════════
   REGISTER  —  POST /api/auth/register
   Creates User (role: PATIENT) + linked Patient in one transaction.
   Returns the same token shape as login — patient is logged in immediately.
═══════════════════════════════════════════════════════════════════════════ */

exports.register = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      password,
      confirmPassword,
      phone,
      gender,
      age,
      address,
      bloodGroup,
      emergencyPhone,
    } = req.body;

    // Required field check
    const missing = [];
    if (!firstName?.trim()) missing.push("firstName");
    if (!lastName?.trim()) missing.push("lastName");
    if (!email?.trim()) missing.push("email");
    if (!password) missing.push("password");
    if (!confirmPassword) missing.push("confirmPassword");
    if (!phone?.trim()) missing.push("phone");
    if (!gender?.trim()) missing.push("gender");
    if (age === undefined || age === null || age === "") missing.push("age");
    if (missing.length) {
      return res.status(422).json({
        success: false,
        message: `Missing fields: ${missing.join(", ")}`,
        errors: missing,
      });
    }

    // Format checks
    if (!/\S+@\S+\.\S+/.test(email)) {
      return res.status(422).json({
        success: false,
        message: "Please enter a valid email address.",
      });
    }
    if (password.length < 6) {
      return res.status(422).json({
        success: false,
        message: "Password must be at least 6 characters.",
      });
    }
    if (password !== confirmPassword) {
      return res
        .status(422)
        .json({ success: false, message: "Passwords do not match." });
    }
    const parsedAge = parseInt(age, 10);
    if (isNaN(parsedAge) || parsedAge < 0 || parsedAge > 120) {
      return res
        .status(422)
        .json({ success: false, message: "Please enter a valid age (0–120)." });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Duplicate checks
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message:
          "An account with this email already exists. Please log in instead.",
      });
    }

    const existingPhone = await prisma.patient.findFirst({
      where: { phone: phone.trim() },
    });
    if (existingPhone) {
      return res.status(409).json({
        success: false,
        message:
          "This phone number is already registered. Please use a different number.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const patientCode = await generatePatientCode();

    // Atomic transaction — both records created or neither
    const [user, patient] = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          name: `${firstName.trim()} ${lastName.trim()}`,
          email: normalizedEmail,
          password: hashedPassword,
          role: "PATIENT",
        },
      });

      const newPatient = await tx.patient.create({
        data: {
          patientCode,
          userId: newUser.id,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          age: parsedAge,
          gender: gender.trim(),
          phone: phone.trim(),
          email: normalizedEmail,
          address: address?.trim() || "",
          bloodGroup: bloodGroup?.trim() || null,
          emergencyPhone: emergencyPhone?.trim() || null,
        },
      });

      return [newUser, newPatient];
    });

    const response = buildAuthResponse(user, patient, null);

    return res.status(201).json({
      success: true,
      message: `Welcome, ${firstName}! Your account has been created successfully.`,
      ...response,
    });
  } catch (error) {
    console.error("[register]", error);
    if (error.code === "P2002") {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }
    return res.status(500).json({
      success: false,
      message: "Registration failed. Please try again.",
    });
  }
};
