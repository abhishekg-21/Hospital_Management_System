/* eslint-disable @typescript-eslint/no-require-imports */
//  backend/src/doctor_backend/routes/admissionRoutes.js

const express = require("express");

const router = express.Router();

const {
  getAdmissions,
  createAdmission,
  dischargePatient,
} = require("../controllers/admissionController");

const authMiddleware = require("../middleware/authMiddleware");

router.get("/", authMiddleware, getAdmissions);

router.post("/", authMiddleware, createAdmission);

router.put("/discharge/:id", authMiddleware, dischargePatient);

module.exports = router;
