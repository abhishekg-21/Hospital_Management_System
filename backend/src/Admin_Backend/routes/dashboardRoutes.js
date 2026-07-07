/* eslint-disable @typescript-eslint/no-require-imports */
// backend/src/Admin_Backend/routes/dashboardRoutes.js

const express = require("express");
const router = express.Router();

const {
  getDashboardStats, // original — kept intact
  getDashboardSummary, // new aggregated endpoint
} = require("../controllers/dashboardController");

const authMiddleware = require("../middleware/authMiddleware");

/* Original endpoint — unchanged, existing frontend keeps working */
router.get("/stats", authMiddleware, getDashboardStats);

/* New single-call aggregated endpoint for the upgraded dashboard */
router.get("/summary", authMiddleware, getDashboardSummary);

module.exports = router;
