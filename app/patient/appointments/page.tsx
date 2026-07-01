/* eslint-disable react/jsx-key */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import api from "@/services/api";

export default function Appointments() {
  const [appointments, setAppointments] = useState<any[]>([]);

  useEffect(() => {
    api
      .get("/patient/appointments")

      .then((res) => {
        setAppointments(res.data);
      });
  }, []);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-5">My Appointments</h1>

      <div className="bg-white rounded-xl shadow">
        <table className="w-full">
          <thead>
            <tr>
              <th className="p-4">Doctor</th>

              <th>Date</th>

              <th>Status</th>
            </tr>
          </thead>

          <tbody>
            {appointments.map((item) => (
              <tr className="border-t">
                <td className="p-4">{item.doctor.name}</td>

                <td>{new Date(item.date).toDateString()}</td>

                <td>{item.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
