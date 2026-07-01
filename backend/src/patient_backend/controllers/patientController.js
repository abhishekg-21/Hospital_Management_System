/* eslint-disable @typescript-eslint/no-require-imports */
//  backend/src/patient_backend/controllers/patientController.js

const prisma = require("../../database/prisma");

/*
GET PATIENT PROFILE
*/

exports.getProfile = async (req, res) => {
  try {
    const patient = await prisma.patient.findUnique({
      where: {
        userId: req.user.id,
      },

      include: {
        user: true,
      },
    });

    res.json({
      success: true,

      data: patient,
    });
  } catch (error) {
    res.status(500).json({
      success: false,

      message: error.message,
    });
  }
};

/*
PATIENT APPOINTMENTS
*/

exports.getAppointments = async (req, res) => {
  try {
    const patient = await prisma.patient.findUnique({
      where: {
        userId: req.user.id,
      },
    });

    const appointments = await prisma.appointment.findMany({
      where: {
        patientId: patient.id,
      },

      include: {
        doctor: {
          include: {
            department: true,
          },
        },

        patient: true,
      },

      orderBy: {
        date: "desc",
      },
    });

    res.json({
      success: true,

      data: appointments,
    });
  } catch (error) {
    res.status(500).json({
      success: false,

      message: error.message,
    });
  }
};

/*
PRESCRIPTIONS
*/

exports.getPrescriptions = async (req, res) => {
  try {
    const patient = await prisma.patient.findUnique({
      where: {
        userId: req.user.id,
      },
    });

    const prescriptions = await prisma.prescription.findMany({
      where: {
        consultation: {
          appointment: {
            patientId: patient.id,
          },
        },
      },

      include: {
        consultation: {
          include: {
            appointment: {
              include: {
                doctor: true,
              },
            },
          },
        },
      },
    });

    res.json({
      success: true,

      data: prescriptions,
    });
  } catch (error) {
    res.status(500).json({
      success: false,

      message: error.message,
    });
  }
};

/*
LAB REPORTS
*/

exports.getReports = async (req, res) => {
  try {
    const patient = await prisma.patient.findUnique({
      where: {
        userId: req.user.id,
      },
    });

    const reports = await prisma.labReport.findMany({
      where: {
        patientId: patient.id,
      },
    });

    res.json({
      success: true,

      data: reports,
    });
  } catch (error) {
    res.status(500).json({
      success: false,

      message: error.message,
    });
  }
};

/*
PAYMENT HISTORY
*/

exports.getPayments = async (req, res) => {
  try {
    const patient = await prisma.patient.findUnique({
      where: {
        userId: req.user.id,
      },
    });

    const payments = await prisma.payment.findMany({
      where: {
        patientId: patient.id,
      },

      orderBy: {
        paymentDate: "desc",
      },
    });

    res.json({
      success: true,

      data: payments,
    });
  } catch (error) {
    res.status(500).json({
      success: false,

      message: error.message,
    });
  }
};

/*
PATIENT DASHBOARD
*/

exports.getDashboard = async (req, res) => {
  try {
    const patient = await prisma.patient.findUnique({
      where: {
        userId: req.user.id,
      },
    });

    const appointments = await prisma.appointment.count({
      where: {
        patientId: patient.id,
      },
    });

    const prescriptions = await prisma.prescription.count({
      where: {
        consultation: {
          appointment: {
            patientId: patient.id,
          },
        },
      },
    });

    const reports = await prisma.labReport.count({
      where: {
        patientId: patient.id,
      },
    });

    res.json({
      success: true,

      data: {
        appointments,

        prescriptions,

        reports,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,

      message: error.message,
    });
  }
};
