/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useState } from "react";
import axios from "axios";

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalDoctors: 0,
    totalPatients: 0,
    totalReceptionists: 0,
  });

  /* =========================
     FETCH DASHBOARD DATA
  ========================= */

  const fetchDashboardStats = async () => {
    try {
      const token = localStorage.getItem("token");

      const response = await axios.get(
        "http://localhost:5000/api/dashboard/stats",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      setStats(response.data);
    } catch (error) {
      console.log(error);
    }
  };

  /* =========================
     REAL TIME AUTO REFRESH
  ========================= */

  useEffect(() => {
    fetchDashboardStats();

    const interval = setInterval(() => {
      fetchDashboardStats();
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Dashboard Overview</h1>

      {/* CARDS */}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* TOTAL USERS */}

        <div className="bg-white shadow rounded-2xl p-6">
          <h2 className="text-gray-500">Total Users</h2>

          <p className="text-4xl font-bold mt-3">{stats.totalUsers}</p>
        </div>

        {/* DOCTORS */}

        <div className="bg-white shadow rounded-2xl p-6">
          <h2 className="text-gray-500">Doctors</h2>

          <p className="text-4xl font-bold mt-3">{stats.totalDoctors}</p>
        </div>

        {/* PATIENTS */}

        <div className="bg-white shadow rounded-2xl p-6">
          <h2 className="text-gray-500">Patients</h2>

          <p className="text-4xl font-bold mt-3">{stats.totalPatients}</p>
        </div>

        {/* RECEPTIONISTS */}

        <div className="bg-white shadow rounded-2xl p-6">
          <h2 className="text-gray-500">Receptionists</h2>

          <p className="text-4xl font-bold mt-3">{stats.totalReceptionists}</p>
        </div>
      </div>
    </div>
  );
}
