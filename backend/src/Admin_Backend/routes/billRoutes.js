exports.createBill = async (req, res) => {
  try {
    const {
      patientId,
      consultationFee,
      labFee,
      roomFee,
      medicineFee,
      otherCharges,
    } = req.body;

    const count = await prisma.bill.count();

    const billNumber = `BILL${String(count + 1).padStart(4, "0")}`;

    const totalAmount =
      Number(consultationFee) +
      Number(labFee) +
      Number(roomFee) +
      Number(medicineFee) +
      Number(otherCharges);

    const bill = await prisma.bill.create({
      data: {
        billNumber,
        patientId,
        consultationFee,
        labFee,
        roomFee,
        medicineFee,
        otherCharges,
        totalAmount,
      },
    });

    res.status(201).json(bill);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};
