/* eslint-disable @typescript-eslint/no-require-imports */
const prisma = require("../config/prisma");

exports.getDashboardStats = async (req, res) => {
  try {
    const totalUsers = await prisma.user.count();

    const totalDoctors = await prisma.user.count({
      where: {
        role: "DOCTOR",
      },
    });

    const totalPatients = await prisma.patient.count();

    const totalReceptionists = await prisma.user.count({
      where: {
        role: "RECEPTIONIST",
      },
    });

    res.json({
      totalUsers,
      totalDoctors,
      totalPatients,
      totalReceptionists,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};
