/* eslint-disable @typescript-eslint/no-require-imports */
//  backend/src/doctor_backend/routes/followUpRoutes.js

const express = require("express");

const router = express.Router();

const {
  getFollowUps,
  createFollowUp,
  updateFollowUpStatus,
} = require("../controllers/followUpController");

const authMiddleware = require("../middleware/authMiddleware");

router.get("/", authMiddleware, getFollowUps);

router.post("/", authMiddleware, createFollowUp);

router.put("/:id", authMiddleware, updateFollowUpStatus);

module.exports = router;
