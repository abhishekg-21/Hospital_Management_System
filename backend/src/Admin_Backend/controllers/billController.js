/* eslint-disable @typescript-eslint/no-require-imports */
const prisma = require("../../database/prisma");

/*
GET ALL BILLS
*/

exports.getBills = async (req, res) => {
  try {
    const bills = await prisma.bill.findMany({
      include: {
        patient: true,
      },

      orderBy: {
        createdAt: "desc",
      },
    });

    res.json(bills);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

/*
CREATE BILL
*/

exports.createBill = async (req, res) => {
  try {
    const {
      patientId,

      consultationFee,

      medicineFee,

      labFee,

      roomFee,

      paymentMethod,
    } = req.body;

    const count = await prisma.bill.count();

    const billCode = `BILL${String(count + 1).padStart(4, "0")}`;

    const totalAmount =
      Number(consultationFee || 0) +
      Number(medicineFee || 0) +
      Number(labFee || 0) +
      Number(roomFee || 0);

    const bill = await prisma.bill.create({
      data: {
        billCode,

        patientId,

        consultationFee: Number(consultationFee),

        medicineFee: Number(medicineFee),

        labFee: Number(labFee),

        roomFee: Number(roomFee),

        totalAmount,

        paymentMethod,
      },
    });

    res.status(201).json(bill);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

/*
UPDATE PAYMENT STATUS
*/

exports.updateBill = async (req, res) => {
  try {
    const bill = await prisma.bill.update({
      where: {
        id: req.params.id,
      },

      data: req.body,
    });

    res.json(bill);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

/*
DELETE BILL
*/

exports.deleteBill = async (req, res) => {
  try {
    await prisma.bill.delete({
      where: {
        id: req.params.id,
      },
    });

    res.json({
      message: "Bill deleted",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};
