/* eslint-disable @typescript-eslint/no-require-imports */
//  src/Doctor_Backend/routes/appointmentRoutes.js

const express = require("express");

const router = express.Router();

const {
  getTodayAppointments,
} = require("../controllers/doctorAppointmentController");

// Doctor today's checked-in patients

router.get("/today", getTodayAppointments);

module.exports = router;
