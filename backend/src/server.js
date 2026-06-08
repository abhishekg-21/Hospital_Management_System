/* eslint-disable @typescript-eslint/no-require-imports */
//  backend/src/server.js
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const authRoutes = require("./Admin_Backend/routes/authRoutes");

const app = express();

/* Middleware */
app.use(cors());
app.use(express.json());

/* Test Route */
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Hospital Management Backend Running",
  });
});

/* API Routes */
app.use("/api/auth", authRoutes);

/* Server */
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

const userRoutes = require("./Admin_Backend/routes/userRoutes");

app.use("/api/users", userRoutes);

/* Admin Dashboard Overview */
const dashboardRoutes = require("./Admin_Backend/routes/dashboardRoutes");

/* API Route of Admin Dashboard */
app.use("/api/dashboard", dashboardRoutes);

/* Admin Dashboard Appointment Overview */
const appointmentRoutes = require("./Admin_Backend/routes/appointmentRoutes");

/* API Route of Admin Dashboard Appointment */
app.use("/api/appointments", appointmentRoutes);

/* Admin Dashboard Overview doctor_department */
const departmentRoutes = require("./Admin_Backend/routes/departmentRoutes");

/* API Route of Admin Dashboard doctor_department */
app.use("/api/departments", departmentRoutes);

/* Doctor Dashboard Overview */
// const appointmentRoutes = require("./Doctor_Backend/routes/appointmentRoutes");

/* API Route of Doctor Dashboard */
// app.use("/api/appointments", appointmentRoutes);

/* Patient Dashboard Overview */
const patientRoutes = require("./patient_backend/routes/patientRoutes");

/* API Route of Patient Dashboard */
app.use("/api/patients", patientRoutes);

/* Admin Dashboard Doctor Overview */
const doctorRoutes = require("./Admin_Backend/routes/doctorRoutes");

/* API Route of Admin Dashboard Doctor*/
app.use("/Admin_Backend/api/doctors", doctorRoutes);

/* Doctor Dashboard Consultation Overview */
const consultationRoutes = require("./doctor_backend/routes/consultationRoutes");

/* API Route of Doctor Dashboard Consultation*/
app.use("/api/consultations", consultationRoutes);

/* Doctor Dashboard Prescription Overview */
const prescriptionRoutes = require("./doctor_backend/routes/prescriptionRoutes");

/* API Route of Doctor Dashboard Prescription*/
app.use("/api/prescriptions", prescriptionRoutes);

/* Doctor Dashboard lab_reports Overview */
const labRoutes = require("./doctor_backend/routes/labRoutes");

/* API Route of Doctor Dashboard lab_reports*/
app.use("/api/labs", labRoutes);
