/* eslint-disable react/no-unescaped-entities */
/* eslint-disable react-hooks/immutability */
"use client";

import { useEffect, useState } from "react";

import axios from "axios";

interface Appointment {
  id: string;

  time: string;

  patient: {
    firstName: string;

    lastName: string;

    age: number;

    gender: string;
  };

  status: string;
}

export default function DoctorDashboard() {
  const [patients, setPatients] = useState<Appointment[]>([]);

  useEffect(() => {
    loadPatients();
  }, []);

  const loadPatients = async () => {
    const token = localStorage.getItem("token");

    const response = await axios.get(
      "http://localhost:5000/api/doctor/appointments/today",

      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    setPatients(response.data);
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Today's Patients</h1>

      <div className="bg-white shadow rounded-xl">
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-4">Time</th>

              <th>Patient</th>

              <th>Age</th>

              <th>Gender</th>

              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {patients.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="p-4">{p.time}</td>

                <td>
                  {p.patient.firstName} {p.patient.lastName}
                </td>

                <td>{p.patient.age}</td>

                <td>{p.patient.gender}</td>

                <td>
                  <button className="bg-blue-600 text-white px-4 py-2 rounded">
                    Start Consultation
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
