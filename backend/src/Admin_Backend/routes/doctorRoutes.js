/* eslint-disable @typescript-eslint/no-require-imports */
const express = require("express");

const router = express.Router();

const {
  getDoctors,
  createDoctor,
  updateDoctor,
  deleteDoctor,
} = require("../controllers/doctorController");

const authMiddleware = require("../middleware/authMiddleware");

router.get("/", authMiddleware, getDoctors);

router.post("/", authMiddleware, createDoctor);

router.put("/:id", authMiddleware, updateDoctor);

router.delete("/:id", authMiddleware, deleteDoctor);

module.exports = router;
