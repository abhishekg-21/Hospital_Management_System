/* eslint-disable @typescript-eslint/no-require-imports */
//  backed/src/Admin_Backend/routes/departmentRoutes.js
const express = require("express");

const router = express.Router();

const {
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
} = require("../controllers/departmentController");

const authMiddleware = require("../middleware/authMiddleware");

/* GET */

router.get("/", authMiddleware, getDepartments);

/* CREATE */

router.post("/", authMiddleware, createDepartment);

/* UPDATE */

router.put("/:id", authMiddleware, updateDepartment);

/* DELETE */

router.delete("/:id", authMiddleware, deleteDepartment);

module.exports = router;
