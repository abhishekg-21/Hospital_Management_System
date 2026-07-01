/* eslint-disable @typescript-eslint/no-require-imports */
//  backend/src/doctor_backend/controllers/prescriptionController.js

const prisma = require("../../database/prisma");

/* =========================
   GET PRESCRIPTIONS
========================= */

exports.getPrescriptions = async (req, res) => {
  try {
    const prescriptions = await prisma.prescription.findMany({
      include: {
        consultation: true,

        items: true,
      },
    });

    res.json(prescriptions);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

/* =========================
   CREATE PRESCRIPTION
========================= */

exports.createPrescription = async (req, res) => {
  try {
    const { consultationId, medicines } = req.body;

    const prescription = await prisma.prescription.create({
      data: {
        consultationId,

        items: {
          create: medicines,
        },
      },

      include: {
        items: true,
      },
    });

    res.status(201).json(prescription);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};
