/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-explicit-any */
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

  bloodGroup: string;

  phone: string;
  email: string;

  address: string;

  emergencyPhone: string;

  allergies: string;

  diseaseHistory: string;
}

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);

  const [showModal, setShowModal] = useState(false);

  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    age: "",
    gender: "Male",

    bloodGroup: "",
    phone: "",
    email: "",

    address: "",

    emergencyPhone: "",

    allergies: "",

    diseaseHistory: "",
  });

  const fetchPatients = async () => {
    try {
      const token = localStorage.getItem("token");

      const res = await axios.get(
        "http://localhost:5000/api/patients",

        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      setPatients(res.data);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  const handleChange = (e: any) => {
    setFormData({
      ...formData,

      [e.target.name]: e.target.value,
    });
  };

  const savePatient = async () => {
    try {
      const token = localStorage.getItem("token");

      if (editingPatient) {
        await axios.put(
          `http://localhost:5000/api/patients/${editingPatient.id}`,

          formData,

          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );
      } else {
        await axios.post(
          "http://localhost:5000/api/patients",

          formData,

          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );
      }

      fetchPatients();

      closeModal();
    } catch (error) {
      console.log(error);
    }
  };

  const deletePatient = async (id: string) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this patient?",
    );

    if (!confirmDelete) return;

    try {
      const token = localStorage.getItem("token");

      await axios.delete(
        `http://localhost:5000/api/patients/${id}`,

        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      fetchPatients();
    } catch (error) {
      console.log(error);
    }
  };

  const openEdit = (patient: Patient) => {
    setEditingPatient(patient);

    setFormData({
      firstName: patient.firstName,

      lastName: patient.lastName,

      age: String(patient.age),

      gender: patient.gender,

      bloodGroup: patient.bloodGroup,

      phone: patient.phone,

      email: patient.email,

      address: patient.address,

      emergencyPhone: patient.emergencyPhone,

      allergies: patient.allergies,

      diseaseHistory: patient.diseaseHistory,
    });

    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);

    setEditingPatient(null);

    setFormData({
      firstName: "",
      lastName: "",
      age: "",
      gender: "Male",
      bloodGroup: "",
      phone: "",
      email: "",
      address: "",
      emergencyPhone: "",
      allergies: "",
      diseaseHistory: "",
    });
  };

  return (
    <div className="p-8">
      <div className="flex justify-between mb-6">
        <h1 className="text-3xl font-bold">Patient Management</h1>

        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 text-white px-5 py-2 rounded-lg"
        >
          + Add Patient
        </button>
      </div>

      <table className="w-full bg-white shadow rounded-xl">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-4">Code</th>

            <th>Name</th>

            <th>Phone</th>

            <th>Gender</th>

            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {patients.map((patient) => (
            <tr key={patient.id} className="border-t">
              <td className="p-4">{patient.patientCode}</td>

              <td>
                {patient.firstName} {patient.lastName}
              </td>

              <td>{patient.phone}</td>

              <td>{patient.gender}</td>

              <td className="space-x-3">
                <button
                  onClick={() => openEdit(patient)}
                  className="bg-yellow-500 text-white px-3 py-1 rounded"
                >
                  Edit
                </button>

                <button
                  onClick={() => deletePatient(patient.id)}
                  className="bg-red-500 text-white px-3 py-1 rounded"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-xl w-[500px]">
            <h2 className="text-xl font-bold mb-4">
              {editingPatient ? "Update Patient" : "Add Patient"}
            </h2>

            <div className="space-y-3">
              {Object.keys(formData).map((field) => (
                <input
                  key={field}
                  name={field}
                  value={(formData as any)[field]}
                  onChange={handleChange}
                  placeholder={field}
                  className="w-full border p-2 rounded"
                />
              ))}

              <div className="flex justify-end gap-3">
                <button
                  onClick={closeModal}
                  className="bg-gray-300 px-4 py-2 rounded"
                >
                  Cancel
                </button>

                <button
                  onClick={savePatient}
                  className="bg-blue-600 text-white px-4 py-2 rounded"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
