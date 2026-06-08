/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useState } from "react";
import axios from "axios";

export default function LabReportsPage() {
  const [requests, setRequests] = useState([]);

  const [formData, setFormData] = useState({
    patientId: "",
    doctorId: "",
    testName: "",
    notes: "",
  });

  const fetchRequests = async () => {
    const token = localStorage.getItem("token");

    const res = await axios.get("http://localhost:5000/api/labs", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    setRequests(res.data);
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const createRequest = async () => {
    const token = localStorage.getItem("token");

    await axios.post("http://localhost:5000/api/labs", formData, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    fetchRequests();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Lab Requests</h1>

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

          <select
            className="border p-3 rounded-lg"
            onChange={(e) =>
              setFormData({
                ...formData,
                testName: e.target.value,
              })
            }
          >
            <option>Select Test</option>

            <option>CBC</option>

            <option>Blood Sugar</option>

            <option>X-Ray</option>

            <option>MRI</option>

            <option>CT Scan</option>
          </select>

          <textarea
            placeholder="Notes"
            className="border p-3 rounded-lg"
            onChange={(e) =>
              setFormData({
                ...formData,
                notes: e.target.value,
              })
            }
          />
        </div>

        <button
          onClick={createRequest}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg mt-4"
        >
          Request Test
        </button>
      </div>

      <div className="bg-white rounded-xl shadow">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-3">Test</th>

              <th className="p-3">Patient</th>

              <th className="p-3">Doctor</th>

              <th className="p-3">Status</th>
            </tr>
          </thead>

          <tbody>
            {requests.map((req: any) => (
              <tr key={req.id} className="border-t">
                <td className="p-3">{req.testName}</td>

                <td className="p-3">{req.patient?.firstName}</td>

                <td className="p-3">{req.doctor?.name}</td>

                <td className="p-3">{req.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
