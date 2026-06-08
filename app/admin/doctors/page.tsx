/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useState } from "react";
import axios from "axios";

interface Department {
  id: string;
  name: string;
}

interface Doctor {
  id: string;
  doctorCode: string;
  name: string;
  email: string;
  specialization: string;
  experience: number;
  qualification: string;
  phone: string;
  gender: string;
  address: string;
  departmentId: string;
  department: Department;
}

export default function DoctorsPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  const [showModal, setShowModal] = useState(false);

  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    specialization: "",
    experience: "",
    qualification: "",
    phone: "",
    gender: "",
    address: "",
    departmentId: "",
  });

  /* =========================
     FETCH DOCTORS
  ========================= */

  const fetchDoctors = async () => {
    try {
      const token = localStorage.getItem("token");

      const response = await axios.get("http://localhost:5000/api/doctors", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setDoctors(response.data);
    } catch (error) {
      console.log(error);
    }
  };

  /* =========================
     FETCH DEPARTMENTS
  ========================= */

  const fetchDepartments = async () => {
    try {
      const token = localStorage.getItem("token");

      const response = await axios.get(
        "http://localhost:5000/api/departments",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      setDepartments(response.data);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    fetchDoctors();
    fetchDepartments();
  }, []);

  /* =========================
     HANDLE CHANGE
  ========================= */

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  /* =========================
     CREATE DOCTOR
  ========================= */

  const handleCreateDoctor = async () => {
    try {
      const token = localStorage.getItem("token");

      await axios.post("http://localhost:5000/api/doctors", formData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      fetchDoctors();

      setShowModal(false);

      clearForm();
    } catch (error) {
      console.log(error);
    }
  };

  /* =========================
     UPDATE DOCTOR
  ========================= */

  const handleUpdateDoctor = async () => {
    if (!editingDoctor) return;

    try {
      const token = localStorage.getItem("token");

      await axios.put(
        `http://localhost:5000/api/doctors/${editingDoctor.id}`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      fetchDoctors();

      setShowModal(false);

      clearForm();

      setEditingDoctor(null);
    } catch (error) {
      console.log(error);
    }
  };

  /* =========================
     DELETE DOCTOR
  ========================= */

  const handleDeleteDoctor = async (id: string) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this doctor?",
    );

    if (!confirmDelete) return;

    try {
      const token = localStorage.getItem("token");

      await axios.delete(`http://localhost:5000/api/doctors/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      fetchDoctors();
    } catch (error) {
      console.log(error);
    }
  };

  /* =========================
     EDIT
  ========================= */

  const openEditModal = (doctor: Doctor) => {
    setEditingDoctor(doctor);

    setFormData({
      name: doctor.name,
      email: doctor.email,
      specialization: doctor.specialization,
      experience: String(doctor.experience),
      qualification: doctor.qualification || "",
      phone: doctor.phone,
      gender: doctor.gender || "",
      address: doctor.address || "",
      departmentId: doctor.departmentId,
    });

    setShowModal(true);
  };

  /* =========================
     CLEAR FORM
  ========================= */

  const clearForm = () => {
    setFormData({
      name: "",
      email: "",
      specialization: "",
      experience: "",
      qualification: "",
      phone: "",
      gender: "",
      address: "",
      departmentId: "",
    });
  };

  return (
    <div>
      {/* HEADER */}

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Doctors Management</h1>

        <button
          onClick={() => {
            setEditingDoctor(null);
            clearForm();
            setShowModal(true);
          }}
          className="bg-blue-600 text-white px-5 py-2 rounded-lg"
        >
          Add Doctor
        </button>
      </div>

      {/* TABLE */}

      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-4">Code</th>
              <th className="p-4">Name</th>
              <th className="p-4">Department</th>
              <th className="p-4">Specialization</th>
              <th className="p-4">Experience</th>
              <th className="p-4">Phone</th>
              <th className="p-4">Actions</th>
            </tr>
          </thead>

          <tbody>
            {doctors.map((doctor) => (
              <tr key={doctor.id} className="border-t">
                <td className="p-4">{doctor.doctorCode}</td>

                <td className="p-4">{doctor.name}</td>

                <td className="p-4">{doctor.department?.name}</td>

                <td className="p-4">{doctor.specialization}</td>

                <td className="p-4">{doctor.experience} yrs</td>

                <td className="p-4">{doctor.phone}</td>

                <td className="p-4 flex gap-2">
                  <button
                    onClick={() => openEditModal(doctor)}
                    className="bg-yellow-500 text-white px-4 py-1 rounded"
                  >
                    Edit
                  </button>

                  <button
                    onClick={() => handleDeleteDoctor(doctor.id)}
                    className="bg-red-500 text-white px-4 py-1 rounded"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL */}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-white w-full max-w-2xl p-6 rounded-xl">
            <h2 className="text-2xl font-bold mb-5">
              {editingDoctor ? "Update Doctor" : "Add Doctor"}
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <input
                name="name"
                placeholder="Doctor Name"
                value={formData.name}
                onChange={handleChange}
                className="border p-3 rounded"
              />

              <input
                name="email"
                placeholder="Email"
                value={formData.email}
                onChange={handleChange}
                className="border p-3 rounded"
              />

              <input
                name="specialization"
                placeholder="Specialization"
                value={formData.specialization}
                onChange={handleChange}
                className="border p-3 rounded"
              />

              <input
                name="experience"
                placeholder="Experience"
                value={formData.experience}
                onChange={handleChange}
                className="border p-3 rounded"
              />

              <input
                name="qualification"
                placeholder="Qualification"
                value={formData.qualification}
                onChange={handleChange}
                className="border p-3 rounded"
              />

              <input
                name="phone"
                placeholder="Phone"
                value={formData.phone}
                onChange={handleChange}
                className="border p-3 rounded"
              />

              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className="border p-3 rounded"
              >
                <option value="">Select Gender</option>

                <option value="Male">Male</option>

                <option value="Female">Female</option>
              </select>

              <select
                name="departmentId"
                value={formData.departmentId}
                onChange={handleChange}
                className="border p-3 rounded"
              >
                <option value="">Select Department</option>

                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>

            <textarea
              name="address"
              placeholder="Address"
              value={formData.address}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  address: e.target.value,
                })
              }
              className="border p-3 rounded w-full mt-4"
            />

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowModal(false);
                  clearForm();
                }}
                className="bg-gray-300 px-5 py-2 rounded"
              >
                Cancel
              </button>

              <button
                onClick={
                  editingDoctor ? handleUpdateDoctor : handleCreateDoctor
                }
                className="bg-blue-600 text-white px-5 py-2 rounded"
              >
                {editingDoctor ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
