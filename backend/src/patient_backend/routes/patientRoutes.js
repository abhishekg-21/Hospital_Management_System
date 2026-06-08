/* eslint-disable @typescript-eslint/no-require-imports */
//  backend/src/patient_backend/routes/patientRoutes.js

const express = require("express");

const router = express.Router();

const {
  getPatients,
  getPatient,
  createPatient,
  updatePatient,
  deletePatient,
} = require("../controllers/patientController");

const authMiddleware = require("../middleware/authMiddleware");

router.use(authMiddleware);

router.get("/", getPatients);

router.get("/:id", getPatient);

router.post("/", createPatient);

router.put("/:id", updatePatient);

router.delete("/:id", deletePatient);

module.exports = router;
