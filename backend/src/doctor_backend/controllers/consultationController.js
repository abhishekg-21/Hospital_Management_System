/* eslint-disable @typescript-eslint/no-require-imports */
//  backend/src/Doctor_Backend/controllers/consultationController.js

const prisma = require("../../database/prisma");

/* =========================
   GET ALL CONSULTATIONS
========================= */

exports.getConsultations = async (req, res) => {
  try {
    const consultations = await prisma.consultation.findMany({
      include: {
        appointment: {
          include: {
            patient: true,
            doctor: true,
          },
        },
      },
    });

    res.json(consultations);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

/* =========================
   CREATE CONSULTATION
========================= */

exports.createConsultation = async (req, res) => {
  try {
    const {
      appointmentId,
      symptoms,
      diagnosis,
      notes,
      bloodPressure,
      pulse,
      temperature,
      oxygenLevel,
      height,
      weight,
    } = req.body;

    const consultation = await prisma.consultation.create({
      data: {
        appointmentId,
        symptoms,
        diagnosis,
        notes,
        bloodPressure,
        pulse,
        temperature,
        oxygenLevel,
        height,
        weight,
      },
    });

    res.status(201).json(consultation);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};
