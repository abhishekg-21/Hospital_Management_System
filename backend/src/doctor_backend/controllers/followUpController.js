/* eslint-disable @typescript-eslint/no-require-imports */
//  backend/src/docto_backend/controllers/followUpController.js

const prisma = require("../config/prisma");

/* =========================
   GET FOLLOWUPS
========================= */

exports.getFollowUps = async (req, res) => {
  try {
    const followUps = await prisma.followUp.findMany({
      include: {
        patient: true,
        doctor: true,
      },

      orderBy: {
        nextVisitDate: "asc",
      },
    });

    res.json(followUps);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

/* =========================
   CREATE FOLLOWUP
========================= */

exports.createFollowUp = async (req, res) => {
  try {
    const { patientId, doctorId, nextVisitDate, reason, notes } = req.body;

    const followUp = await prisma.followUp.create({
      data: {
        patientId,
        doctorId,
        nextVisitDate: new Date(nextVisitDate),

        reason,

        notes,
      },
    });

    res.status(201).json(followUp);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

/* =========================
   UPDATE STATUS
========================= */

exports.updateFollowUpStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const followUp = await prisma.followUp.update({
      where: {
        id: req.params.id,
      },

      data: {
        status,
      },
    });

    res.json(followUp);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};
