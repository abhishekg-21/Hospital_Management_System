/* eslint-disable @typescript-eslint/no-require-imports */
//  backend/src/routes/labRoutes.js

const express = require("express");

const router = express.Router();

const {
  getLabRequests,
  createLabRequest,
} = require("../controllers/labController");

const authMiddleware = require("../middleware/authMiddleware");

router.get("/", authMiddleware, getLabRequests);

router.post("/", authMiddleware, createLabRequest);

module.exports = router;
