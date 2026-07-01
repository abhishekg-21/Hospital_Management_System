/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-require-imports */
//  backend/src/routes/appointmentRoutes.js

const express = require("express");

const router = express.Router();

const {
  getAppointments,
  getAppointmentById,
  getTodaysAppointments,
  getUpcomingAppointments,
  getAvailableSlots,
  getPatientHistory,
  createAppointment,
  updateAppointment,
  cancelAppointment,
  deleteAppointment,
} = require("../controllers/appointmentController");

const authMiddleware = require("../middleware/authMiddleware");

/* ----------------------------------------------------------
   NOTE: Specific static paths (/today, /upcoming, /slots,
   /search) MUST be registered before the dynamic /:id route,
   otherwise Express would match "today" as an id and call
   getAppointmentById instead.
---------------------------------------------------------- */

/* ── Specialised read routes (new) ─────────────────────── */
router.get("/today", authMiddleware, getTodaysAppointments);
router.get("/upcoming", authMiddleware, getUpcomingAppointments);
router.get("/slots", authMiddleware, getAvailableSlots); // ?doctorId=&date=

/* ── Collection routes (existing + enhanced) ───────────── */
router.get("/", authMiddleware, getAppointments); // supports search/filter/pagination
router.post("/", authMiddleware, createAppointment); // conflict-checked

/* ── Per-patient history (new) ──────────────────────────── */
router.get("/patient/:patientId/history", authMiddleware, getPatientHistory);

/* ── Single-resource routes ─────────────────────────────── */
router.get("/:id", authMiddleware, getAppointmentById); // new
router.put("/:id", authMiddleware, updateAppointment); // existing, enhanced
router.patch("/:id/cancel", authMiddleware, cancelAppointment); // new convenience
router.delete("/:id", authMiddleware, deleteAppointment); // existing

module.exports = router;
