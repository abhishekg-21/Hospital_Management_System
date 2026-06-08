/* eslint-disable @typescript-eslint/no-require-imports */
//  backend/src/patient_backend/controllers/patientController.js

const prisma = require("../config/prisma");

/* GET ALL */

exports.getPatients = async (req, res) => {
  try {
    const patients = await prisma.patient.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json(patients);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

/* GET SINGLE */

exports.getPatient = async (req, res) => {
  try {
    const patient = await prisma.patient.findUnique({
      where: {
        id: req.params.id,
      },
    });

    res.json(patient);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

/* CREATE */

exports.createPatient = async (req, res) => {
  try {
    const count = await prisma.patient.count();

    const patientCode = `PAT${String(count + 1).padStart(4, "0")}`;

    const patient = await prisma.patient.create({
      data: {
        ...req.body,
        patientCode,
      },
    });

    res.status(201).json(patient);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

/* UPDATE */

exports.updatePatient = async (req, res) => {
  try {
    const patient = await prisma.patient.update({
      where: {
        id: req.params.id,
      },
      data: req.body,
    });

    res.json(patient);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

/* DELETE */

exports.deletePatient = async (req, res) => {
  try {
    await prisma.patient.delete({
      where: {
        id: req.params.id,
      },
    });

    res.json({
      message: "Patient deleted",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};
