/* eslint-disable @typescript-eslint/no-require-imports */
//  backend/src/routes/prescriptionRoutes.js

const express = require("express");

const router = express.Router();

const {
  getPrescriptions,
  createPrescription,
} = require("../controllers/prescriptionController");

const authMiddleware = require("../middleware/authMiddleware");

router.get("/", authMiddleware, getPrescriptions);

router.post("/", authMiddleware, createPrescription);

module.exports = router;
