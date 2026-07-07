/* eslint-disable @typescript-eslint/no-require-imports */
// backend/src/Admin_Backend/routes/departmentRoutes.js

const express = require("express");
const router = express.Router();

const {
  getDepartments,
  getDepartmentById,
  getDepartmentStats,
  createDepartment,
  updateDepartment,
  deleteDepartment,
} = require("../controllers/departmentController");

const authMiddleware = require("../middleware/authMiddleware");

/*
  Static paths MUST come before /:id to prevent Express from
  treating "stats" as an id parameter value.
*/

/* ── Collection ────────────────────────────────────────────── */
router.get("/", authMiddleware, getDepartments); // existing + search/filter/pagination
router.post("/", authMiddleware, createDepartment); // existing + case-insensitive dupe check

/* ── Single resource ───────────────────────────────────────── */
router.get("/:id", authMiddleware, getDepartmentById); // new — full profile with doctors list
router.get("/:id/stats", authMiddleware, getDepartmentStats); // new — stats for dashboard card
router.put("/:id", authMiddleware, updateDepartment); // existing + field whitelist + name uniqueness
router.delete("/:id", authMiddleware, deleteDepartment); // existing + doctor count safety guard

module.exports = router;
