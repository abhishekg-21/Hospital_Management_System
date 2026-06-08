/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useState } from "react";
import axios from "axios";

interface Patient {
  id: string;
  patientCode: string;
  firstName: string;
  lastName: string;
  age: number;
  gender: string;
  phone: string;
  bloodGroup?: string;
}

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);

  const [showModal, setShowModal] = useState(false);

  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);

  const [search, setSearch] = useState("");

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    age: "",
    gender: "Male",
    phone: "",
    bloodGroup: "",
    address: "",
  });

  const fetchPatients = async () => {
    try {
      const token = localStorage.getItem("token");

      const response = await axios.get("http://localhost:5000/api/patients", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setPatients(response.data);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleCreatePatient = async () => {
    try {
      const token = localStorage.getItem("token");

      await axios.post("http://localhost:5000/api/patients", formData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      fetchPatients();

      setShowModal(false);
    } catch (error) {
      console.log(error);
    }
  };

  const handleUpdatePatient = async () => {
    if (!editingPatient) return;

    try {
      const token = localStorage.getItem("token");

      await axios.put(
        `http://localhost:5000/api/patients/${editingPatient.id}`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      fetchPatients();

      setShowModal(false);
    } catch (error) {
      console.log(error);
    }
  };

  const handleDeletePatient = async (id: string) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this patient?",
    );

    if (!confirmDelete) return;

    try {
      const token = localStorage.getItem("token");

      await axios.delete(`http://localhost:5000/api/patients/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      fetchPatients();
    } catch (error) {
      console.log(error);
    }
  };

  const openEditModal = (patient: Patient) => {
    setEditingPatient(patient);

    setFormData({
      firstName: patient.firstName,
      lastName: patient.lastName,
      age: patient.age.toString(),
      gender: patient.gender,
      phone: patient.phone,
      bloodGroup: patient.bloodGroup || "",
      address: "",
    });

    setShowModal(true);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Patients</h1>

        <button
          onClick={() => {
            setEditingPatient(null);

            setFormData({
              firstName: "",
              lastName: "",
              age: "",
              gender: "Male",
              phone: "",
              bloodGroup: "",
              address: "",
            });

            setShowModal(true);
          }}
          className="bg-blue-600 text-white px-5 py-2 rounded-lg"
        >
          Add Patient
        </button>
      </div>

      <input
        type="text"
        placeholder="Search Patient..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full border p-3 rounded-lg mb-4"
      />

      <div className="bg-white rounded-xl shadow overflow-auto">
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-4">Code</th>

              <th className="p-4">Name</th>

              <th className="p-4">Age</th>

              <th className="p-4">Gender</th>

              <th className="p-4">Phone</th>

              <th className="p-4">Actions</th>
            </tr>
          </thead>

          <tbody>
            {patients
              .filter((patient) =>
                `${patient.firstName} ${patient.lastName}`
                  .toLowerCase()
                  .includes(search.toLowerCase()),
              )
              .map((patient) => (
                <tr key={patient.id} className="border-t">
                  <td className="p-4">{patient.patientCode}</td>

                  <td className="p-4">
                    {patient.firstName} {patient.lastName}
                  </td>

                  <td className="p-4">{patient.age}</td>

                  <td className="p-4">{patient.gender}</td>

                  <td className="p-4">{patient.phone}</td>

                  <td className="p-4 flex gap-2">
                    <button
                      onClick={() => openEditModal(patient)}
                      className="bg-yellow-500 text-white px-3 py-1 rounded"
                    >
                      Edit
                    </button>

                    <button
                      onClick={() => handleDeletePatient(patient.id)}
                      className="bg-red-500 text-white px-3 py-1 rounded"
                    >
                      Delete
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
