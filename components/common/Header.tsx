/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useState } from "react";

interface User {
  name: string;
  email: string;
  role: string;
}

export default function Header() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");

    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  return (
    <div className="h-16 bg-white shadow flex items-center justify-between px-8">
      <div>
        <h2 className="text-2xl font-bold">Hospital Management System</h2>

        <p className="text-sm text-gray-500">Welcome Back</p>
      </div>

      <div className="flex items-center gap-6">
        {/* User Info */}

        <div className="text-right">
          <p className="font-semibold">{user?.name || "User"}</p>

          <p className="text-sm text-gray-500">{user?.email}</p>

          <p className="text-xs text-blue-600 font-medium">{user?.role}</p>
        </div>

        {/* Avatar */}

        <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
          {user?.name?.charAt(0).toUpperCase() || "U"}
        </div>

        {/* Logout */}

        <button
          onClick={handleLogout}
          className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg"
        >
          Logout
        </button>
      </div>
    </div>
  );
}
