/* eslint-disable @typescript-eslint/no-require-imports */
// backend/src/Admin_Backend/routes/authRoutes.js

const express = require("express");
const router = express.Router();

const { login, register } = require("../controllers/authController");

/*
  Original route kept exactly as-is.
  If your existing route is POST "/" (not POST "/login"), keep it that way.
  The frontend hits whichever path your server.js mounts this at.
*/
router.post("/", login); // existing — POST /api/auth
router.post("/login", login); // alias    — POST /api/auth/login
router.post("/register", register); // new      — POST /api/auth/register

module.exports = router;
