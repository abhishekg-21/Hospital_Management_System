/* eslint-disable @typescript-eslint/no-require-imports */
//  backend/src/server.js
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const authRoutes = require("./Admin_Backend/routes/authRoutes");

const app = express();

/* ── Core Middleware ────────────────────────────────────── */
app.use(cors());
app.use(express.json());

/* ── Health Check ───────────────────────────────────────── */
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Hospital Management Backend Running",
  });
});

/* ── API Routes ─────────────────────────────────────────── */

app.use("/api/auth", authRoutes);

const userRoutes = require("./Admin_Backend/routes/userRoutes");
app.use("/api/users", userRoutes);

/* Admin Dashboard */
const dashboardRoutes = require("./Admin_Backend/routes/dashboardRoutes");
app.use("/api/dashboard", dashboardRoutes);

/* Appointments */
const appointmentRoutes = require("./Admin_Backend/routes/appointmentRoutes");
app.use("/api/appointments", appointmentRoutes);

/* Departments */
const departmentRoutes = require("./Admin_Backend/routes/departmentRoutes");
app.use("/api/departments", departmentRoutes);

/* Doctor Appointments */
app.use(
  "/api/doctor/appointments",
  require("./doctor_backend/routes/doctorAppointmentRoutes"),
);

const patientRoute = require("./Admin_Backend/routes/patientRoutes");

app.use("/api/patients", patientRoute);

/* Patients */
const patientRoutes = require("./patient_backend/routes/patientRoutes");
app.use("/api/patient", patientRoutes);

/* Doctors */
const doctorRoutes = require("./Admin_Backend/routes/doctorRoutes");
app.use("/api/doctors", doctorRoutes);

/* Consultations */
const consultationRoutes = require("./doctor_backend/routes/consultationRoutes");
app.use("/api/consultations", consultationRoutes);

/* Prescriptions */
const prescriptionRoutes = require("./doctor_backend/routes/prescriptionRoutes");
app.use("/api/prescriptions", prescriptionRoutes);

/* Lab */
const labRoutes = require("./doctor_backend/routes/labRoutes");
app.use("/api/labs", labRoutes);

/* Follow-ups */
const followUpRoutes = require("./doctor_backend/routes/followUpRoutes");
app.use("/api/followups", followUpRoutes);

/* Admissions */
const admissionRoutes = require("./doctor_backend/routes/admissionRoutes");
app.use("/api/admissions", admissionRoutes);

/* Billing */
const billRoutes = require("./Admin_Backend/routes/billRoutes");
app.use("/api/bill", billRoutes);

/* ── 404 Handler ────────────────────────────────────────── */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

/* ── Global Error Handler ───────────────────────────────── */
/*
  Catches any error passed via next(error) from any route or
  middleware. Keeps error responses consistent across the whole
  API without touching individual controllers.
*/
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error("[GlobalErrorHandler]", err);

  /* Prisma known-request errors (e.g. record not found) */
  if (err.code === "P2025") {
    return res.status(404).json({
      success: false,
      message: "Record not found.",
    });
  }

  /* Prisma unique constraint violation */
  if (err.code === "P2002") {
    const field = err.meta?.target?.join(", ") || "field";
    return res.status(409).json({
      success: false,
      message: `A record with this ${field} already exists.`,
    });
  }

  /* JWT / auth errors */
  if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token. Please log in again.",
    });
  }

  /* Validation errors (e.g. from express-validator if added later) */
  if (err.type === "validation") {
    return res.status(422).json({
      success: false,
      message: err.message || "Validation failed.",
      errors: err.errors || [],
    });
  }

  /* Default 500 */
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal server error.",
  });
});

/* ── Start Server ───────────────────────────────────────── */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
