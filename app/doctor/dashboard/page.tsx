/* eslint-disable react/no-unescaped-entities */
"use client";

import {
  FaUserMd,
  FaCalendarCheck,
  FaClipboardList,
  FaFlask,
  FaBell,
  FaUserInjured,
  FaHeartbeat,
} from "react-icons/fa";

export default function DoctorDashboard() {
  const stats = [
    {
      title: "Today's Appointments",
      value: 24,
      icon: <FaCalendarCheck size={24} />,
    },
    {
      title: "Pending Consultations",
      value: 8,
      icon: <FaClipboardList size={24} />,
    },
    {
      title: "Admitted Patients",
      value: 12,
      icon: <FaUserInjured size={24} />,
    },
    {
      title: "New Lab Reports",
      value: 6,
      icon: <FaFlask size={24} />,
    },
    {
      title: "Pending Prescriptions",
      value: 4,
      icon: <FaHeartbeat size={24} />,
    },
    {
      title: "Emergency Cases",
      value: 2,
      icon: <FaBell size={24} />,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Statistics */}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {stats.map((item, index) => (
          <div key={index} className="bg-white p-6 rounded-2xl shadow">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-gray-500">{item.title}</h3>

                <p className="text-3xl font-bold mt-2">{item.value}</p>
              </div>

              <div className="text-blue-600">{item.icon}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Today's Schedule */}

      <div className="bg-white rounded-2xl shadow p-6">
        <h2 className="text-xl font-bold mb-4">Today's Appointments</h2>

        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left py-3">Patient</th>

              <th className="text-left py-3">Time</th>

              <th className="text-left py-3">Department</th>

              <th className="text-left py-3">Status</th>
            </tr>
          </thead>

          <tbody>
            <tr className="border-b">
              <td className="py-3">John Smith</td>
              <td>10:00 AM</td>
              <td>Cardiology</td>
              <td>Pending</td>
            </tr>

            <tr className="border-b">
              <td className="py-3">Sarah Wilson</td>
              <td>11:30 AM</td>
              <td>Neurology</td>
              <td>Completed</td>
            </tr>

            <tr>
              <td className="py-3">David Lee</td>
              <td>02:00 PM</td>
              <td>General</td>
              <td>Pending</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Notifications */}

      <div className="bg-white rounded-2xl shadow p-6">
        <h2 className="text-xl font-bold mb-4">Notifications</h2>

        <div className="space-y-3">
          <div className="border-l-4 border-red-500 bg-red-50 p-3 rounded">
            Emergency admission received.
          </div>

          <div className="border-l-4 border-blue-500 bg-blue-50 p-3 rounded">
            3 new lab reports available.
          </div>

          <div className="border-l-4 border-green-500 bg-green-50 p-3 rounded">
            Follow-up patient due tomorrow.
          </div>
        </div>
      </div>
    </div>
  );
}
