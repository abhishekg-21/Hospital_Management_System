/* eslint-disable @typescript-eslint/no-require-imports */
const prisma = require("../config/prisma");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

/* =========================
   CREATE DEFAULT ADMIN
========================= */

const createDefaultAdmin = async () => {
  try {
    const adminExists = await prisma.user.findUnique({
      where: {
        email: "admin@hms.com",
      },
    });

    if (!adminExists) {
      const hashedPassword = await bcrypt.hash("admin123", 10);

      await prisma.user.create({
        data: {
          name: "Super Admin",
          email: "admin@hms.com",
          password: hashedPassword,
          role: "SUPER_ADMIN",
        },
      });

      console.log("Default Admin Created");
    }
  } catch (error) {
    console.log(error);
  }
};

/* Run Default Admin Function */
createDefaultAdmin();

/* =========================
   REGISTER USER
========================= */

exports.register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    /* Check Existing User */
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists",
      });
    }

    /* Hash Password */
    const hashedPassword = await bcrypt.hash(password, 10);

    /* Create User */
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
      },
    });

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      user,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* =========================
   LOGIN USER
========================= */

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    /* Find User */
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    /* Compare Password */
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    /* Generate JWT Token */
    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      },
    );

    /* Response */
    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
