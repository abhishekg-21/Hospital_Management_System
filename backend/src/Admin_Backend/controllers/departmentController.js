/* eslint-disable @typescript-eslint/no-require-imports */
//  backed/src/Admin_Backend/controllers/departmentController.js

const prisma = require("../config/prisma");

/* =========================
   GET ALL DEPARTMENTS
========================= */

exports.getDepartments = async (req, res) => {
  try {
    const departments = await prisma.department.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json(departments);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

/* =========================
   CREATE DEPARTMENT
========================= */

exports.createDepartment = async (req, res) => {
  try {
    const { name, description } = req.body;

    const exists = await prisma.department.findUnique({
      where: {
        name,
      },
    });

    if (exists) {
      return res.status(400).json({
        message: "Department already exists",
      });
    }

    const department = await prisma.department.create({
      data: {
        name,
        description,
      },
    });

    res.status(201).json(department);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

/* =========================
   UPDATE DEPARTMENT
========================= */

exports.updateDepartment = async (req, res) => {
  try {
    const department = await prisma.department.update({
      where: {
        id: req.params.id,
      },
      data: req.body,
    });

    res.json(department);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

/* =========================
   DELETE DEPARTMENT
========================= */

exports.deleteDepartment = async (req, res) => {
  try {
    await prisma.department.delete({
      where: {
        id: req.params.id,
      },
    });

    res.json({
      message: "Department deleted",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};
