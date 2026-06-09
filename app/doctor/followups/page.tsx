/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useState } from "react";
import axios from "axios";

interface FollowUp {
  id: string;
  reason: string;
  nextVisitDate: string;
  status: string;

  patient: {
    firstName: string;
    lastName: string;
  };

  doctor: {
    name: string;
  };
}

export default function FollowUpsPage() {
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);

  const [formData, setFormData] = useState({
    patientId: "",

    doctorId: "",

    nextVisitDate: "",

    reason: "",

    notes: "",
  });

  const fetchFollowUps = async () => {
    const token = localStorage.getItem("token");

    const res = await axios.get("http://localhost:5000/api/followups", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    setFollowUps(res.data);
  };

  useEffect(() => {
    fetchFollowUps();
  }, []);

  const createFollowUp = async () => {
    const token = localStorage.getItem("token");

    await axios.post("http://localhost:5000/api/followups", formData, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    fetchFollowUps();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Follow-Up Management</h1>

      <div className="bg-white p-6 rounded-xl shadow">
        <div className="grid md:grid-cols-2 gap-4">
          <input
            placeholder="Patient ID"
            className="border p-3 rounded-lg"
            onChange={(e) =>
              setFormData({
                ...formData,
                patientId: e.target.value,
              })
            }
          />

          <input
            placeholder="Doctor ID"
            className="border p-3 rounded-lg"
            onChange={(e) =>
              setFormData({
                ...formData,
                doctorId: e.target.value,
              })
            }
          />

          <input
            type="date"
            className="border p-3 rounded-lg"
            onChange={(e) =>
              setFormData({
                ...formData,
                nextVisitDate: e.target.value,
              })
            }
          />

          <input
            placeholder="Reason"
            className="border p-3 rounded-lg"
            onChange={(e) =>
              setFormData({
                ...formData,
                reason: e.target.value,
              })
            }
          />
        </div>

        <textarea
          placeholder="Notes"
          className="border p-3 rounded-lg w-full mt-4"
          onChange={(e) =>
            setFormData({
              ...formData,
              notes: e.target.value,
            })
          }
        />

        <button
          onClick={createFollowUp}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg mt-4"
        >
          Schedule Follow-Up
        </button>
      </div>

      <div className="bg-white rounded-xl shadow">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-3">Patient</th>

              <th className="p-3">Doctor</th>

              <th className="p-3">Next Visit</th>

              <th className="p-3">Reason</th>

              <th className="p-3">Status</th>
            </tr>
          </thead>

          <tbody>
            {followUps.map((followUp) => (
              <tr key={followUp.id} className="border-t">
                <td className="p-3">
                  {followUp.patient.firstName} {followUp.patient.lastName}
                </td>

                <td className="p-3">{followUp.doctor.name}</td>

                <td className="p-3">
                  {new Date(followUp.nextVisitDate).toLocaleDateString()}
                </td>

                <td className="p-3">{followUp.reason}</td>

                <td className="p-3">{followUp.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
