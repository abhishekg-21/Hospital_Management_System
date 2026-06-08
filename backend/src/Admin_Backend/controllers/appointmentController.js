/* eslint-disable @typescript-eslint/no-require-imports */
//  backend/src/controllers/appointmentController.js

const prisma = require("../config/prisma");

/* =========================
   GET APPOINTMENTS
========================= */

exports.getAppointments = async (req, res) => {
  try {
    const appointments = await prisma.appointment.findMany({
      include: {
        patient: true,
        doctor: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json(appointments);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

/* =========================
   CREATE APPOINTMENT
========================= */

exports.createAppointment = async (req, res) => {
  try {
    const { patientId, doctorId, date, time } = req.body;

    const count = await prisma.appointment.count();

    const appointmentCode = `APT${String(count + 1).padStart(4, "0")}`;

    const appointment = await prisma.appointment.create({
      data: {
        patientId,
        doctorId,
        date: new Date(date),
        time,
      },
    });

    res.status(201).json(appointment);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

/* =========================
   UPDATE STATUS
========================= */

exports.updateAppointment = async (req, res) => {
  try {
    const appointment = await prisma.appointment.update({
      where: {
        id: req.params.id,
      },
      data: req.body,
    });

    res.json(appointment);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

/* =========================
   DELETE
========================= */

exports.deleteAppointment = async (req, res) => {
  try {
    await prisma.appointment.delete({
      where: {
        id: req.params.id,
      },
    });

    res.json({
      message: "Appointment Deleted",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};
