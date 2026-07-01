/* eslint-disable @typescript-eslint/no-require-imports */
//  backend/src/patient_backend/routes/patientRoutes.js

const express = require("express");

const router = express.Router();

const controller = require("../controllers/patientController");

const auth = require("../middleware/authMiddleware");

router.get("/profile", auth, controller.getProfile);

router.get("/appointments", auth, controller.getAppointments);

router.get("/prescriptions", auth, controller.getPrescriptions);

router.get("/reports", auth, controller.getReports);

router.get("/payments", auth, controller.getPayments);

router.get("/dashboard", auth, controller.getDashboard);

module.exports = router;
