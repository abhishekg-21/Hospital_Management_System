/* eslint-disable react-hooks/immutability */
/* eslint-disable @typescript-eslint/no-explicit-any */
//  app/receptionist/appointments/page.tsx

"use client";

import { useEffect, useState } from "react";

import axios from "axios";

export default function AppointmentPage() {
  const [patients, setPatients] = useState<any[]>([]);

  const [doctors, setDoctors] = useState<any[]>([]);

  const [form, setForm] = useState({
    patientId: "",

    doctorId: "",

    date: "",

    time: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const token = localStorage.getItem("token");

    const p = await axios.get("http://localhost:5000/api/patients", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const d = await axios.get("http://localhost:5000/api/doctors", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    setPatients(p.data);

    setDoctors(d.data);
  };

  const handleChange = (e: any) => {
    setForm({
      ...form,

      [e.target.name]: e.target.value,
    });
  };

  const bookAppointment = async () => {
    const token = localStorage.getItem("token");

    await axios.post(
      "http://localhost:5000/api/appointments",

      form,

      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    alert("Appointment Booked");
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Book Appointment</h1>

      <div className="space-y-4">
        <select
          name="patientId"
          onChange={handleChange}
          className="border p-3 w-full"
        >
          <option>Select Patient</option>

          {patients.map((p) => (
            <option key={p.id} value={p.id}>
              {p.firstName} {p.lastName}
            </option>
          ))}
        </select>

        <select
          name="doctorId"
          onChange={handleChange}
          className="border p-3 w-full"
        >
          <option>Select Doctor</option>

          {doctors.map((d) => (
            <option key={d.id} value={d.id}>
              Dr. {d.name}
            </option>
          ))}
        </select>

        <input
          type="date"
          name="date"
          onChange={handleChange}
          className="border p-3 w-full"
        />

        <input
          type="time"
          name="time"
          onChange={handleChange}
          className="border p-3 w-full"
        />

        <button
          onClick={bookAppointment}
          className="bg-blue-600 text-white px-5 py-3 rounded"
        >
          Book Appointment
        </button>
      </div>
    </div>
  );
}
