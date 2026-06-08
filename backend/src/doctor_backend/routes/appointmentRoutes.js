/* eslint-disable @typescript-eslint/no-require-imports */
//  src/Doctor_Backend/routes/appointmentRoutes.js

const express = require("express");

const router = express.Router();

const { getAppointments } = require("../controllers/appointmentController");

const authMiddleware = require("../middleware/authMiddleware");

router.get("/", authMiddleware, getAppointments);

module.exports = router;
