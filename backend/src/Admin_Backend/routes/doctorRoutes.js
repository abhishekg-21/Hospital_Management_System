/* eslint-disable @typescript-eslint/no-require-imports */
// backend/src/Admin_Backend/routes/doctorRoutes.js

const express = require("express");
const router = express.Router();

const {
  getDoctors,
  getDoctorById,
  createDoctor,
  updateDoctor,
  deleteDoctor,
  getDoctorSlots,
} = require("../controllers/doctorController");

const authMiddleware = require("../middleware/authMiddleware");

/*
  IMPORTANT: Static paths (/slots would conflict if it existed here)
  must be declared BEFORE dynamic /:id routes so Express doesn't
  consume string segments as id parameters.
*/

/* ── Collection routes ─────────────────────────────────────── */
router.get("/", authMiddleware, getDoctors); // existing + enhanced (search/filter/pagination)
router.post("/", authMiddleware, createDoctor); // existing + fixed (validation, duplicate check, returns department)

/* ── Single-resource routes ────────────────────────────────── */
router.get("/:id", authMiddleware, getDoctorById); // new — full profile with stats
router.put("/:id", authMiddleware, updateDoctor); // existing + fixed (field whitelist, duplicate checks)
router.delete("/:id", authMiddleware, deleteDoctor); // existing + fixed (active appointment guard)

/* ── Slot availability ─────────────────────────────────────── */
router.get("/:id/slots", authMiddleware, getDoctorSlots); // new — GET /api/doctors/:id/slots?date=YYYY-MM-DD

module.exports = router;
