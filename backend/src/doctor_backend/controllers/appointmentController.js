/* eslint-disable @typescript-eslint/no-require-imports */
//  src/Doctor_Backend/controllers/appointmentController.js

const prisma = require("..//config/prisma");

exports.getAppointments = async (req, res) => {
  try {
    const appointments = await prisma.appointment.findMany({
      orderBy: {
        date: "asc",
      },
    });

    res.json(appointments);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};
