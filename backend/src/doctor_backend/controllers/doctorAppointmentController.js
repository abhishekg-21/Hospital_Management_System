/* eslint-disable @typescript-eslint/no-require-imports */
//  src/Doctor_Backend/controllers/appointmentController.js

const prisma = require("../../database/prisma");

/*
=================================
GET TODAY CHECKED-IN PATIENTS
FOR DOCTOR DASHBOARD
=================================
*/

exports.getTodayPatients = async (req, res) => {
  try {
    const doctorId = req.user.id;

    const today = new Date();

    const start = new Date(today.setHours(0, 0, 0, 0));

    const end = new Date(today.setHours(23, 59, 59, 999));

    const appointments = await prisma.appointment.findMany({
      where: {
        doctorId,

        date: {
          gte: start,

          lte: end,
        },

        status: "CHECKED_IN",
      },

      include: {
        patient: true,
      },

      orderBy: {
        time: "asc",
      },
    });

    res.json(appointments);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};
exports.getTodayAppointments = async (req, res) => {
  try {
    const today = new Date();

    const appointments = await prisma.appointment.findMany({
      where: {
        date: {
          gte: new Date(today.setHours(0, 0, 0, 0)),

          lte: new Date(today.setHours(23, 59, 59, 999)),
        },

        status: "CHECKED_IN",
      },

      include: {
        patient: true,

        doctor: true,
      },
    });

    res.json(appointments);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};
