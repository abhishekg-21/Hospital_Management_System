"use client";

import { useEffect, useState } from "react";
import axios from "axios";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);

  const [showModal, setShowModal] = useState(false);

  const [editingUser, setEditingUser] = useState<User | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "DOCTOR",
  });

  /* =========================
     FETCH USERS
  ========================= */

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem("token");

      const response = await axios.get("http://localhost:5000/api/users", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setUsers(response.data);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    const loadUsers = async () => {
      await fetchUsers();
    };

    loadUsers();
  }, []);

  /* =========================
     HANDLE INPUT
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
     CREATE USER
  ========================= */

  const handleCreateUser = async () => {
    try {
      const token = localStorage.getItem("token");

      await axios.post("http://localhost:5000/api/users", formData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      fetchUsers();

      setShowModal(false);

      setFormData({
        name: "",
        email: "",
        password: "",
        role: "DOCTOR",
      });
    } catch (error) {
      console.log(error);
    }
  };

  const userRole =
    typeof window !== "undefined" ? localStorage.getItem("role") : null;

  /* =========================
     UPDATE USER
  ========================= */

  const handleUpdateUser = async () => {
    if (!editingUser) return;

    try {
      const token = localStorage.getItem("token");

      const response = await axios.get("http://localhost:5000/api/users", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      fetchUsers();

      setShowModal(false);

      setEditingUser(null);
    } catch (error) {
      console.log(error);
    }
  };

  /* =========================
     DELETE USER
  ========================= */

  const handleDeleteUser = async (id: string) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this user?",
    );

    if (!confirmDelete) {
      return;
    }

    try {
      const token = localStorage.getItem("token");

      await axios.delete(`http://localhost:5000/api/users/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      fetchUsers();
    } catch (error) {
      console.log(error);
    }
  };

  /* =========================
     OPEN EDIT MODAL
  ========================= */

  const openEditModal = (user: User) => {
    setEditingUser(user);

    setFormData({
      name: user.name,
      email: user.email,
      password: "",
      role: user.role,
    });

    setShowModal(true);
  };

  return (
    <div>
      {/* HEADER */}

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Users Management</h1>

        <button
          onClick={() => {
            setEditingUser(null);

            /* CLEAR FORM */

            setFormData({
              name: "",
              email: "",
              password: "",
              role: "DOCTOR",
            });

            setShowModal(true);
          }}
          className="bg-blue-600 text-white px-5 py-2 rounded-lg"
        >
          Add User
        </button>
      </div>

      {/* USERS TABLE */}

      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-4 text-left">Name</th>

              <th className="p-4 text-left">Email</th>

              <th className="p-4 text-left">Role</th>

              <th className="p-4 text-left">Actions</th>
            </tr>
          </thead>

          <tbody>
            {users
              .filter((user) => {
                /* NORMAL ADMIN CANNOT SEE SUPER ADMIN */

                if (userRole === "ADMIN" && user.role === "SUPER_ADMIN") {
                  return false;
                }

                return true;
              })
              .map((user) => (
                <tr key={user.id} className="border-t">
                  <td className="p-4">{user.name}</td>

                  <td className="p-4">{user.email}</td>

                  <td className="p-4">
                    {user.role === "SUPER_ADMIN" && userRole !== "SUPER_ADMIN"
                      ? "Hidden"
                      : user.role}
                  </td>

                  <td className="p-4 flex gap-3">
                    {/* SUPER ADMIN CAN DO EVERYTHING */}

                    {userRole === "SUPER_ADMIN" && (
                      <>
                        <button
                          onClick={() => openEditModal(user)}
                          className="bg-yellow-500 text-white px-4 py-1 rounded"
                        >
                          Edit
                        </button>

                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          className="bg-red-500 text-white px-4 py-1 rounded"
                        >
                          Delete
                        </button>
                      </>
                    )}

                    {/* NORMAL ADMIN RULES */}

                    {userRole === "ADMIN" &&
                      user.role !== "SUPER_ADMIN" &&
                      user.role !== "ADMIN" && (
                        <>
                          <button
                            onClick={() => openEditModal(user)}
                            className="bg-yellow-500 text-white px-4 py-1 rounded"
                          >
                            Edit
                          </button>

                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            className="bg-red-500 text-white px-4 py-1 rounded"
                          >
                            Delete
                          </button>
                        </>
                      )}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* MODAL */}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center">
          <div className="bg-white w-full max-w-md rounded-xl p-6">
            <h2 className="text-2xl font-bold mb-5">
              {editingUser ? "Update User" : "Add User"}
            </h2>

            <div className="space-y-4">
              <input
                type="text"
                name="name"
                placeholder="Name"
                value={formData.name}
                onChange={handleChange}
                className="w-full border p-3 rounded-lg"
              />

              <input
                type="email"
                name="email"
                placeholder="Email"
                value={formData.email}
                onChange={handleChange}
                className="w-full border p-3 rounded-lg"
              />

              <input
                type="password"
                name="password"
                placeholder={editingUser ? "Enter New Password" : "Password"}
                value={formData.password}
                onChange={handleChange}
                className="w-full border p-3 rounded-lg"
              />

              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="w-full border p-3 rounded-lg"
              >
                {userRole === "SUPER_ADMIN" && (
                  <option value="ADMIN">ADMIN</option>
                )}

                <option value="DOCTOR">DOCTOR</option>

                <option value="RECEPTIONIST">RECEPTIONIST</option>

                <option value="PATIENT">PATIENT</option>
              </select>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowModal(false);
                    setEditingUser(null);
                    setFormData({
                      name: "",
                      email: "",
                      password: "",
                      role: "DOCTOR",
                    });
                  }}
                  className="bg-gray-300 px-5 py-2 rounded-lg"
                >
                  Cancel
                </button>

                <button
                  onClick={editingUser ? handleUpdateUser : handleCreateUser}
                  className="bg-blue-600 text-white px-5 py-2 rounded-lg"
                >
                  {editingUser ? "Update" : "Create"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
