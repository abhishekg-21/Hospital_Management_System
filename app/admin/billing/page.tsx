"use client";

import { useState } from "react";
import { FaPlus, FaSearch, FaEdit, FaTrash, FaEye } from "react-icons/fa";

export default function PatientsPage() {
  const [search, setSearch] = useState("");

  const patients = [
    {
      id: "P001",
      name: "Rahul Sharma",
      age: 25,
      gender: "Male",
      phone: "9876543210",
      disease: "Fever",
    },
    {
      id: "P002",
      name: "Priya Patel",
      age: 32,
      gender: "Female",
      phone: "9876543211",
      disease: "Diabetes",
    },
  ];

  return (
    <div className="space-y-6">
      {/* HEADER */}

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Patients</h1>

          <p className="text-gray-500">Manage all hospital patients</p>
        </div>

        <button className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl flex items-center gap-2">
          <FaPlus />
          Add Patient
        </button>
      </div>

      {/* STATS */}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white p-6 rounded-2xl shadow">
          <h3 className="text-gray-500">Total Patients</h3>

          <p className="text-4xl font-bold mt-2">245</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow">
          <h3 className="text-gray-500">New This Month</h3>

          <p className="text-4xl font-bold mt-2">32</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow">
          <h3 className="text-gray-500">Active Patients</h3>

          <p className="text-4xl font-bold mt-2">189</p>
        </div>
      </div>

      {/* SEARCH */}

      <div className="bg-white p-4 rounded-2xl shadow flex items-center gap-3">
        <FaSearch className="text-gray-400" />

        <input
          type="text"
          placeholder="Search patient..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full outline-none"
        />
      </div>

      {/* TABLE */}

      <div className="bg-white rounded-2xl shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-4 text-left">Patient ID</th>

              <th className="p-4 text-left">Name</th>

              <th className="p-4 text-left">Age</th>

              <th className="p-4 text-left">Gender</th>

              <th className="p-4 text-left">Phone</th>

              <th className="p-4 text-left">Disease</th>

              <th className="p-4 text-center">Actions</th>
            </tr>
          </thead>

          <tbody>
            {patients.map((patient) => (
              <tr key={patient.id} className="border-t hover:bg-gray-50">
                <td className="p-4">{patient.id}</td>

                <td className="p-4 font-medium">{patient.name}</td>

                <td className="p-4">{patient.age}</td>

                <td className="p-4">{patient.gender}</td>

                <td className="p-4">{patient.phone}</td>

                <td className="p-4">{patient.disease}</td>

                <td className="p-4">
                  <div className="flex justify-center gap-2">
                    <button className="bg-green-500 text-white p-2 rounded-lg">
                      <FaEye />
                    </button>

                    <button className="bg-yellow-500 text-white p-2 rounded-lg">
                      <FaEdit />
                    </button>

                    <button className="bg-red-500 text-white p-2 rounded-lg">
                      <FaTrash />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
