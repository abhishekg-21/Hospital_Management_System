/* eslint-disable @typescript-eslint/no-require-imports */
//  backend/src/doctor_backend/controllers/admissionController.js

const prisma = require("../../database/prisma");

/* GET ADMISSIONS */

exports.getAdmissions = async (req, res) => {
  try {
    const admissions = await prisma.admission.findMany({
      include: {
        patient: true,

        doctor: true,

        bed: {
          include: {
            room: {
              include: {
                ward: true,
              },
            },
          },
        },
      },
    });

    res.json(admissions);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

/* CREATE ADMISSION */

exports.createAdmission = async (req, res) => {
  try {
    const { patientId, doctorId, bedId, diagnosis } = req.body;

    const admission = await prisma.admission.create({
      data: {
        patientId,

        doctorId,

        bedId,

        diagnosis,
      },
    });

    await prisma.bed.update({
      where: {
        id: bedId,
      },

      data: {
        status: "OCCUPIED",
      },
    });

    res.status(201).json(admission);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

/* DISCHARGE */

exports.dischargePatient = async (req, res) => {
  try {
    const admission = await prisma.admission.update({
      where: {
        id: req.params.id,
      },

      data: {
        status: "DISCHARGED",

        dischargeDate: new Date(),
      },
    });

    await prisma.bed.update({
      where: {
        id: admission.bedId,
      },

      data: {
        status: "AVAILABLE",
      },
    });

    res.json(admission);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};
