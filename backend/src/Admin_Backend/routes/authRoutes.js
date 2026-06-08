/* eslint-disable @typescript-eslint/no-require-imports */
const express = require("express");

const router = express.Router();

const { register, login } = require("../controllers/authController");

const authMiddleware = require("../middleware/authMiddleware");

/* Auth Routes */

router.post("/register", register);

router.post("/login", login);

/* Protected Route */

router.get("/profile", authMiddleware, (req, res) => {
  res.json({
    message: "Protected Route",
    user: req.user,
  });
});

module.exports = router;
