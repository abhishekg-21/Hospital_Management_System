/* eslint-disable @typescript-eslint/no-require-imports */
//  backend/src/doctor_backend/controllers/labController.js

const prisma = require("../config/prisma");

/* =========================
   GET LAB REQUESTS
========================= */

exports.getLabRequests = async (req, res) => {
  try {
    const requests = await prisma.labRequest.findMany({
      include: {
        patient: true,
        doctor: true,
        report: true,
      },
    });

    res.json(requests);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

/* =========================
   CREATE LAB REQUEST
========================= */

exports.createLabRequest = async (req, res) => {
  try {
    const { patientId, doctorId, testName, notes } = req.body;

    const request = await prisma.labRequest.create({
      data: {
        patientId,
        doctorId,
        testName,
        notes,
      },
    });

    res.status(201).json(request);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};
