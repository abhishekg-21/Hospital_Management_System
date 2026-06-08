/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useState } from "react";
import axios from "axios";

interface Department {
  id: string;
  name: string;
  description: string;
}

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);

  const [showModal, setShowModal] = useState(false);

  const [editingDepartment, setEditingDepartment] = useState<Department | null>(
    null,
  );

  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });

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
    fetchDepartments();
  }, []);

  const handleCreate = async () => {
    const token = localStorage.getItem("token");

    await axios.post("http://localhost:5000/api/departments", formData, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    fetchDepartments();

    setShowModal(false);

    setFormData({
      name: "",
      description: "",
    });
  };

  const handleUpdate = async () => {
    if (!editingDepartment) return;

    const token = localStorage.getItem("token");

    await axios.put(
      `http://localhost:5000/api/departments/${editingDepartment.id}`,
      formData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    fetchDepartments();

    setShowModal(false);

    setEditingDepartment(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this department?")) return;

    const token = localStorage.getItem("token");

    await axios.delete(`http://localhost:5000/api/departments/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    fetchDepartments();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Departments</h1>

        <button
          onClick={() => {
            setEditingDepartment(null);

            setFormData({
              name: "",
              description: "",
            });

            setShowModal(true);
          }}
          className="bg-blue-600 text-white px-5 py-2 rounded-lg"
        >
          Add Department
        </button>
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-4 text-left">Name</th>

              <th className="p-4 text-left">Description</th>

              <th className="p-4 text-left">Actions</th>
            </tr>
          </thead>

          <tbody>
            {departments.map((dept) => (
              <tr key={dept.id} className="border-t">
                <td className="p-4">{dept.name}</td>

                <td className="p-4">{dept.description}</td>

                <td className="p-4 flex gap-3">
                  <button
                    onClick={() => {
                      setEditingDepartment(dept);

                      setFormData({
                        name: dept.name,
                        description: dept.description,
                      });

                      setShowModal(true);
                    }}
                    className="bg-yellow-500 text-white px-4 py-1 rounded"
                  >
                    Edit
                  </button>

                  <button
                    onClick={() => handleDelete(dept.id)}
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

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-xl w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">
              {editingDepartment ? "Update Department" : "Add Department"}
            </h2>

            <input
              type="text"
              placeholder="Department Name"
              value={formData.name}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  name: e.target.value,
                })
              }
              className="w-full border p-3 rounded mb-3"
            />

            <textarea
              placeholder="Description"
              value={formData.description}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  description: e.target.value,
                })
              }
              className="w-full border p-3 rounded mb-4"
            />

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="bg-gray-300 px-4 py-2 rounded"
              >
                Cancel
              </button>

              <button
                onClick={editingDepartment ? handleUpdate : handleCreate}
                className="bg-blue-600 text-white px-4 py-2 rounded"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
