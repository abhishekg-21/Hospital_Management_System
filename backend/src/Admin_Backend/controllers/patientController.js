/* eslint-disable @typescript-eslint/no-require-imports */
const prisma = require("../../database/prisma");
const bcrypt = require("bcryptjs");

/*
================================
CREATE PATIENT
================================
*/

exports.createPatient = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      age,
      gender,
      bloodGroup,
      phone,
      email,
      address,
      emergencyPhone,
      allergies,
      diseaseHistory,
    } = req.body;

    // Generate Patient Code

    const count = await prisma.patient.count();

    const patientCode = `PAT${String(count + 1).padStart(4, "0")}`;

    // Create Patient

    const patient = await prisma.patient.create({
      data: {
        patientCode,

        firstName,
        lastName,

        age: Number(age),

        gender,

        bloodGroup,

        phone,

        email,

        address,

        emergencyPhone,

        allergies,

        diseaseHistory,
      },
    });

    res.status(201).json({
      success: true,

      message: "Patient registered successfully",

      data: patient,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,

      message: error.message,
    });
  }
};

/*
================================
GET PATIENTS
================================
*/

exports.getPatients = async (req, res) => {
  try {
    const {
      search = "",

      gender = "",

      page = 1,

      limit = 20,

      sortBy = "createdAt",

      sortOrder = "desc",
    } = req.query;

    const where = {
      AND: [
        search
          ? {
              OR: [
                {
                  firstName: {
                    contains: search,
                    mode: "insensitive",
                  },
                },

                {
                  lastName: {
                    contains: search,
                    mode: "insensitive",
                  },
                },

                {
                  patientCode: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
              ],
            }
          : {},

        gender
          ? {
              gender,
            }
          : {},
      ],
    };

    const patients = await prisma.patient.findMany({
      where,

      skip: (Number(page) - 1) * Number(limit),

      take: Number(limit),

      orderBy: {
        [sortBy]: sortOrder,
      },
    });

    const total = await prisma.patient.count({
      where,
    });

    res.json({
      success: true,

      data: {
        patients,

        pagination: {
          total,

          page: Number(page),

          limit: Number(limit),

          totalPages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,

      message: error.message,
    });
  }
};

/*
================================
UPDATE PATIENTS
================================
*/

exports.updatePatient = async (req, res) => {
  try {
    const patient = await prisma.patient.update({
      where: {
        id: req.params.id,
      },

      data: req.body,
    });

    res.json({
      success: true,

      message: "Patient updated successfully",

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
================================
DELETE PATIENTS
================================
*/

exports.deletePatient = async (req, res) => {
  try {
    await prisma.patient.delete({
      where: {
        id: req.params.id,
      },
    });

    res.json({
      success: true,

      message: "Patient deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,

      message: error.message,
    });
  }
};
