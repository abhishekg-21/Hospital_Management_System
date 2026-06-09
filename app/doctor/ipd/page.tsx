/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useState } from "react";
import axios from "axios";

interface Admission {
  id: string;

  diagnosis: string;

  status: string;

  admissionDate: string;

  patient: {
    patientCode: string;
    firstName: string;
    lastName: string;
  };

  doctor: {
    name: string;
  };

  bed: {
    bedNumber: string;

    room: {
      roomNumber: string;

      ward: {
        name: string;
      };
    };
  };
}

export default function IPDPage() {
  const [admissions, setAdmissions] = useState<Admission[]>([]);

  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");

  const fetchAdmissions = async () => {
    try {
      const token = localStorage.getItem("token");

      const response = await axios.get("http://localhost:5000/api/admissions", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setAdmissions(response.data);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmissions();
  }, []);

  const dischargePatient = async (id: string) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to discharge this patient?",
    );

    if (!confirmDelete) return;

    try {
      const token = localStorage.getItem("token");

      await axios.put(
        `http://localhost:5000/api/admissions/discharge/${id}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      fetchAdmissions();
    } catch (error) {
      console.log(error);
    }
  };

  const filteredAdmissions = admissions.filter(
    (admission) =>
      admission.patient.firstName
        .toLowerCase()
        .includes(search.toLowerCase()) ||
      admission.patient.lastName.toLowerCase().includes(search.toLowerCase()) ||
      admission.patient.patientCode
        .toLowerCase()
        .includes(search.toLowerCase()),
  );

  const totalAdmissions = admissions.length;

  const admittedPatients = admissions.filter(
    (a) => a.status === "ADMITTED",
  ).length;

  const dischargedPatients = admissions.filter(
    (a) => a.status === "DISCHARGED",
  ).length;

  return (
    <div className="space-y-6">
      {/* HEADER */}

      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">IPD Management</h1>

        <button
          className="
          bg-blue-600
          hover:bg-blue-700
          text-white
          px-5
          py-2
          rounded-lg
        "
        >
          Admit Patient
        </button>
      </div>

      {/* CARDS */}

      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow">
          <h3 className="text-gray-500">Total Admissions</h3>

          <p className="text-3xl font-bold mt-2">{totalAdmissions}</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow">
          <h3 className="text-gray-500">Currently Admitted</h3>

          <p className="text-3xl font-bold mt-2 text-green-600">
            {admittedPatients}
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow">
          <h3 className="text-gray-500">Discharged</h3>

          <p className="text-3xl font-bold mt-2 text-blue-600">
            {dischargedPatients}
          </p>
        </div>
      </div>

      {/* SEARCH */}

      <div className="bg-white p-4 rounded-xl shadow">
        <input
          type="text"
          placeholder="Search Patient..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="
            w-full
            border
            rounded-lg
            p-3
          "
        />
      </div>

      {/* TABLE */}

      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-4 text-left">Patient</th>

              <th className="p-4 text-left">Doctor</th>

              <th className="p-4 text-left">Ward</th>

              <th className="p-4 text-left">Room</th>

              <th className="p-4 text-left">Bed</th>

              <th className="p-4 text-left">Diagnosis</th>

              <th className="p-4 text-left">Status</th>

              <th className="p-4 text-left">Admission Date</th>

              <th className="p-4 text-left">Action</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className="p-8 text-center">
                  Loading...
                </td>
              </tr>
            ) : (
              filteredAdmissions.map((admission) => (
                <tr key={admission.id} className="border-t">
                  <td className="p-4">
                    <div>
                      <p className="font-medium">
                        {admission.patient.firstName}{" "}
                        {admission.patient.lastName}
                      </p>

                      <p className="text-sm text-gray-500">
                        {admission.patient.patientCode}
                      </p>
                    </div>
                  </td>

                  <td className="p-4">{admission.doctor.name}</td>

                  <td className="p-4">{admission.bed.room.ward.name}</td>

                  <td className="p-4">{admission.bed.room.roomNumber}</td>

                  <td className="p-4">{admission.bed.bedNumber}</td>

                  <td className="p-4">{admission.diagnosis}</td>

                  <td className="p-4">
                    <span
                      className={`
                          px-3
                          py-1
                          rounded-full
                          text-sm
                          ${
                            admission.status === "ADMITTED"
                              ? "bg-green-100 text-green-700"
                              : "bg-blue-100 text-blue-700"
                          }
                        `}
                    >
                      {admission.status}
                    </span>
                  </td>

                  <td className="p-4">
                    {new Date(admission.admissionDate).toLocaleDateString()}
                  </td>

                  <td className="p-4">
                    {admission.status === "ADMITTED" && (
                      <button
                        onClick={() => dischargePatient(admission.id)}
                        className="
                          bg-red-500
                          hover:bg-red-600
                          text-white
                          px-3
                          py-1
                          rounded
                        "
                      >
                        Discharge
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
