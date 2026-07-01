//  app/receptionist/checkin/page.tsx
/* eslint-disable react-hooks/immutability */
"use client";

import { useEffect, useState } from "react";

import axios from "axios";

interface Appointment {
  id: string;

  time: string;

  status: string;

  tokenNumber: number;

  patient: {
    firstName: string;

    lastName: string;

    phone: string;
  };

  doctor: {
    name: string;
  };
}

export default function CheckInPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  useEffect(() => {
    loadAppointments();
  }, []);

  const loadAppointments = async () => {
    const token = localStorage.getItem("token");

    const res = await axios.get(
      "http://localhost:5000/api/appointments",

      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    setAppointments(res.data);
  };

  const checkIn = async (id: string) => {
    const token = localStorage.getItem("token");

    await axios.put(
      `http://localhost:5000/api/appointments/checkin/${id}`,

      {},

      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    alert("Patient Checked In");

    loadAppointments();
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Patient Check-In</h1>

      <div className="bg-white rounded-xl shadow">
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-4">Token</th>

              <th>Patient</th>

              <th>Doctor</th>

              <th>Time</th>

              <th>Status</th>

              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {appointments.map((a) => (
              <tr key={a.id} className="border-t">
                <td className="p-4">#{a.tokenNumber}</td>

                <td>
                  {a.patient.firstName} {a.patient.lastName}
                </td>

                <td>Dr. {a.doctor.name}</td>

                <td>{a.time}</td>

                <td>
                  <span className="px-3 py-1 rounded bg-yellow-200">
                    {a.status}
                  </span>
                </td>

                <td>
                  {a.status !== "CHECKED_IN" && (
                    <button
                      onClick={() => checkIn(a.id)}
                      className="bg-green-600 text-white px-4 py-2 rounded"
                    >
                      Check-In
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
