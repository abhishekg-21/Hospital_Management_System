/* eslint-disable @typescript-eslint/no-require-imports */
const express = require("express");

const router = express.Router();

/* CONTROLLER */

const { getDashboardStats } = require("../controllers/dashboardController");

/* MIDDLEWARE */

const authMiddleware = require("../middleware/authMiddleware");

/* ROUTE */

router.get("/stats", authMiddleware, getDashboardStats);

module.exports = router;
