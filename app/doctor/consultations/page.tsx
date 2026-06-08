"use client";

import { useState } from "react";
import axios from "axios";

export default function ConsultationsPage() {
  const [formData, setFormData] = useState({
    appointmentId: "",

    symptoms: "",
    diagnosis: "",
    notes: "",

    bloodPressure: "",
    pulse: "",
    temperature: "",
    oxygenLevel: "",

    height: "",
    weight: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const saveConsultation = async () => {
    try {
      const token = localStorage.getItem("token");

      await axios.post("http://localhost:5000/api/consultations", formData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      alert("Consultation Saved Successfully");
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Consultation Form</h1>

      {/* VITALS */}

      <div className="bg-white p-6 rounded-xl shadow">
        <h2 className="text-xl font-semibold mb-4">Patient Vitals</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            name="bloodPressure"
            placeholder="Blood Pressure"
            onChange={handleChange}
            className="border p-3 rounded-lg"
          />

          <input
            name="pulse"
            placeholder="Pulse"
            onChange={handleChange}
            className="border p-3 rounded-lg"
          />

          <input
            name="temperature"
            placeholder="Temperature"
            onChange={handleChange}
            className="border p-3 rounded-lg"
          />

          <input
            name="oxygenLevel"
            placeholder="Oxygen Level"
            onChange={handleChange}
            className="border p-3 rounded-lg"
          />

          <input
            name="height"
            placeholder="Height"
            onChange={handleChange}
            className="border p-3 rounded-lg"
          />

          <input
            name="weight"
            placeholder="Weight"
            onChange={handleChange}
            className="border p-3 rounded-lg"
          />
        </div>
      </div>

      {/* SYMPTOMS */}

      <div className="bg-white p-6 rounded-xl shadow">
        <h2 className="text-xl font-semibold mb-4">Symptoms</h2>

        <textarea
          name="symptoms"
          rows={4}
          onChange={handleChange}
          className="w-full border p-3 rounded-lg"
        />
      </div>

      {/* DIAGNOSIS */}

      <div className="bg-white p-6 rounded-xl shadow">
        <h2 className="text-xl font-semibold mb-4">Diagnosis</h2>

        <textarea
          name="diagnosis"
          rows={4}
          onChange={handleChange}
          className="w-full border p-3 rounded-lg"
        />
      </div>

      {/* CLINICAL NOTES */}

      <div className="bg-white p-6 rounded-xl shadow">
        <h2 className="text-xl font-semibold mb-4">Clinical Notes</h2>

        <textarea
          name="notes"
          rows={5}
          onChange={handleChange}
          className="w-full border p-3 rounded-lg"
        />
      </div>

      <button
        onClick={saveConsultation}
        className="bg-blue-600 text-white px-8 py-3 rounded-lg"
      >
        Save Consultation
      </button>
    </div>
  );
}
