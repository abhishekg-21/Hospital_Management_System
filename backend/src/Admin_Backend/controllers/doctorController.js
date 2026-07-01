/* eslint-disable @typescript-eslint/no-require-imports */
const prisma = require("../../database/prisma");

/* =========================
   GET ALL DOCTORS
========================= */

exports.getDoctors = async (req, res) => {
  try {
    const doctors = await prisma.doctor.findMany({
      include: {
        department: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json(doctors);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

/* =========================
   CREATE DOCTOR
========================= */

exports.createDoctor = async (req, res) => {
  try {
    const {
      name,
      email,
      specialization,
      experience,
      qualification,
      phone,
      gender,
      address,
      departmentId,
    } = req.body;

    const count = await prisma.doctor.count();

    const doctorCode = `DOC${String(count + 1).padStart(4, "0")}`;

    const doctor = await prisma.doctor.create({
      data: {
        doctorCode,
        name,
        email,
        specialization,
        experience: Number(experience),
        qualification,
        phone,
        gender,
        address,
        departmentId,
      },
    });

    res.status(201).json(doctor);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

/* =========================
   UPDATE DOCTOR
========================= */

exports.updateDoctor = async (req, res) => {
  try {
    const doctor = await prisma.doctor.update({
      where: {
        id: req.params.id,
      },
      data: req.body,
    });

    res.json(doctor);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

/* =========================
   DELETE DOCTOR
========================= */

exports.deleteDoctor = async (req, res) => {
  try {
    await prisma.doctor.delete({
      where: {
        id: req.params.id,
      },
    });

    res.json({
      message: "Doctor deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};
