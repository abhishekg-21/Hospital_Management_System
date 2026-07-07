/* eslint-disable @typescript-eslint/no-require-imports */
// backend/src/Admin_Backend/routes/userRoutes.js

const express = require("express");
const router = express.Router();

const {
  getUsers,
  getUserById,
  getUserStats,
  createUser,
  updateUser,
  deleteUser,
  resetPassword,
} = require("../controllers/userController");

const authMiddleware = require("../middleware/authMiddleware");

/* Static routes MUST come before /:id */
router.get("/stats", authMiddleware, getUserStats);

/* Collection */
router.get("/", authMiddleware, getUsers); // backward-compat + search/filter
router.post("/", authMiddleware, createUser);

/* Single resource */
router.get("/:id", authMiddleware, getUserById);
router.put("/:id", authMiddleware, updateUser);
router.delete("/:id", authMiddleware, deleteUser);
router.patch("/:id/reset-password", authMiddleware, resetPassword);

module.exports = router;
