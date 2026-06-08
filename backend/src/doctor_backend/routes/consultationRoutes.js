/* eslint-disable @typescript-eslint/no-require-imports */
//  backend/src/Doctor_Backend/routes/consultationRoutes.js

const express = require("express");

const router = express.Router();

const {
  getConsultations,
  createConsultation,
} = require("../controllers/consultationController");

const authMiddleware = require("../middleware/authMiddleware");

router.get("/", authMiddleware, getConsultations);

router.post("/", authMiddleware, createConsultation);

module.exports = router;
