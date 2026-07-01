/* eslint-disable @typescript-eslint/no-require-imports */
const prisma = require("../../database/prisma");
const bcrypt = require("bcryptjs");

/* =========================
   GET ALL USERS
========================= */

exports.getUsers = async (req, res) => {
  try {
    let users;

    /* =========================
       SUPER ADMIN
    ========================= */

    if (req.user.role === "SUPER_ADMIN") {
      users = await prisma.user.findMany();
    } else if (req.user.role === "ADMIN") {
      /* =========================
       NORMAL ADMIN
    ========================= */
      users = await prisma.user.findMany({
        where: {
          NOT: {
            role: "SUPER_ADMIN",
          },
        },
      });
    } else {
      /* =========================
       OTHER USERS
    ========================= */
      users = await prisma.user.findMany({
        where: {
          id: req.user.id,
        },
      });
    }

    res.json(users);
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: error.message,
    });
  }
};

/* =========================
   CREATE USER
========================= */

exports.createUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    const currentUserRole = req.user.role;

    /* ONLY SUPER ADMIN
       CAN CREATE ADMIN */

    if (role === "ADMIN" && currentUserRole !== "SUPER_ADMIN") {
      return res.status(403).json({
        message: "Only Super Admin can create Admin",
      });
    }

    /* CHECK EXISTING USER */

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({
        message: "User already exists",
      });
    }

    /* HASH PASSWORD */

    const hashedPassword = await bcrypt.hash(password, 10);

    /* CREATE USER */

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
      },
    });

    res.status(201).json(user);
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: error.message,
    });
  }
};

/* =========================
   UPDATE USER
========================= */

exports.updateUser = async (req, res) => {
  try {
    const targetUser = await prisma.user.findUnique({
      where: {
        id: req.params.id,
      },
    });

    if (!targetUser) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    /* ADMIN CANNOT EDIT SUPER ADMIN */

    if (req.user.role === "ADMIN" && targetUser.role === "SUPER_ADMIN") {
      return res.status(403).json({
        message: "Admin cannot edit Super Admin",
      });
    }

    const { name, email, password, role } = req.body;

    /* UPDATE DATA */

    let updatedData = {
      name,
      email,
      role,
    };

    /* UPDATE PASSWORD */

    if (password && password.trim() !== "") {
      const hashedPassword = await bcrypt.hash(password, 10);

      updatedData.password = hashedPassword;
    }

    /* UPDATE USER */

    const updatedUser = await prisma.user.update({
      where: {
        id: req.params.id,
      },
      data: updatedData,
    });

    res.json({
      success: true,
      message: "User updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: error.message,
    });
  }
};

/* =========================
   DELETE USER
========================= */

exports.deleteUser = async (req, res) => {
  try {
    const targetUser = await prisma.user.findUnique({
      where: {
        id: req.params.id,
      },
    });

    /* =========================
       ADMIN CANNOT EDIT
       SUPER ADMIN
    ========================= */

    if (req.user.role === "ADMIN" && targetUser.role === "SUPER_ADMIN") {
      return res.status(403).json({
        message: "You cannot delete Super Admin",
      });
    }

    await prisma.user.delete({
      where: {
        id: req.params.id,
      },
    });

    res.json({
      message: "User deleted successfully",
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: error.message,
    });
  }
};
