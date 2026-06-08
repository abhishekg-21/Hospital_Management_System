"use client";

import { useState } from "react";
import axios from "axios";

interface Medicine {
  medicine: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

export default function PrescriptionsPage() {
  const [consultationId, setConsultationId] = useState("");

  const [medicines, setMedicines] = useState<Medicine[]>([
    {
      medicine: "",
      dosage: "",
      frequency: "",
      duration: "",
      instructions: "",
    },
  ]);

  const handleChange = (
    index: number,
    field: keyof Medicine,
    value: string,
  ) => {
    const updated = [...medicines];

    updated[index][field] = value;

    setMedicines(updated);
  };

  const addMedicine = () => {
    setMedicines([
      ...medicines,
      {
        medicine: "",
        dosage: "",
        frequency: "",
        duration: "",
        instructions: "",
      },
    ]);
  };

  const savePrescription = async () => {
    try {
      const token = localStorage.getItem("token");

      await axios.post(
        "http://localhost:5000/api/prescriptions",
        {
          consultationId,
          medicines,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      alert("Prescription Saved");
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Prescription Generator</h1>

      <input
        type="text"
        placeholder="Consultation ID"
        value={consultationId}
        onChange={(e) => setConsultationId(e.target.value)}
        className="border p-3 rounded-lg w-full"
      />

      {medicines.map((medicine, index) => (
        <div key={index} className="bg-white p-5 rounded-xl shadow">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              placeholder="Medicine"
              value={medicine.medicine}
              onChange={(e) => handleChange(index, "medicine", e.target.value)}
              className="border p-3 rounded-lg"
            />

            <input
              placeholder="Dosage"
              value={medicine.dosage}
              onChange={(e) => handleChange(index, "dosage", e.target.value)}
              className="border p-3 rounded-lg"
            />

            <input
              placeholder="Frequency"
              value={medicine.frequency}
              onChange={(e) => handleChange(index, "frequency", e.target.value)}
              className="border p-3 rounded-lg"
            />

            <input
              placeholder="Duration"
              value={medicine.duration}
              onChange={(e) => handleChange(index, "duration", e.target.value)}
              className="border p-3 rounded-lg"
            />
          </div>

          <textarea
            placeholder="Instructions"
            value={medicine.instructions}
            onChange={(e) =>
              handleChange(index, "instructions", e.target.value)
            }
            className="border p-3 rounded-lg w-full mt-4"
          />
        </div>
      ))}

      <div className="flex gap-4">
        <button
          onClick={addMedicine}
          className="bg-green-600 text-white px-6 py-3 rounded-lg"
        >
          Add Medicine
        </button>

        <button
          onClick={savePrescription}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg"
        >
          Save Prescription
        </button>
      </div>
    </div>
  );
}
