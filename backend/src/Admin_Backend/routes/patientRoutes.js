/* eslint-disable @typescript-eslint/no-require-imports */
const express = require("express");

const router = express.Router();

const patientController = require("../controllers/patientController");

router.post("/", patientController.createPatient);

router.get("/", patientController.getPatients);

router.put("/:id", patientController.updatePatient);

router.delete("/:id", patientController.deletePatient);

module.exports = router;
