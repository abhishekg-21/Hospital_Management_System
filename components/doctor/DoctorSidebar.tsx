"use client";

import Link from "next/link";
import { useState } from "react";

import {
  FaBars,
  FaTimes,
  FaTachometerAlt,
  FaCalendarCheck,
  FaUserInjured,
  FaStethoscope,
  FaPrescriptionBottleAlt,
  FaFlask,
  FaProcedures,
  FaHistory,
  FaComments,
  FaChartLine,
  FaCog,
  FaSignOutAlt,
} from "react-icons/fa";

export default function DoctorSidebar() {
  const [open, setOpen] = useState(false);

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  return (
    <>
      {/* Mobile Topbar */}

      <div className="lg:hidden fixed top-0 left-0 w-full bg-blue-700 text-white p-4 flex justify-between items-center z-50">
        <h1 className="text-xl font-bold">HMS Doctor</h1>

        <button onClick={() => setOpen(true)}>
          <FaBars size={22} />
        </button>
      </div>

      {/* Overlay */}

      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}

      <div
        className={`
          fixed top-0 left-0 h-screen w-72 bg-blue-700 text-white p-5 z-50
          transform transition-transform duration-300
          ${open ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0
        `}
      >
        {/* Mobile Header */}

        <div className="flex items-center justify-between mb-8 lg:hidden">
          <h1 className="text-2xl font-bold">HMS</h1>

          <button onClick={() => setOpen(false)}>
            <FaTimes size={22} />
          </button>
        </div>

        {/* Desktop Header */}

        <div className="hidden lg:block mb-10">
          <h1 className="text-2xl font-bold">HMS Doctor</h1>

          <p className="text-sm text-blue-100 mt-1">Doctor Portal</p>
        </div>

        {/* Navigation */}

        <nav className="flex flex-col gap-2">
          <Link
            href="/doctor/dashboard"
            className="flex items-center gap-3 hover:bg-blue-600 p-3 rounded-xl"
          >
            <FaTachometerAlt />
            Dashboard
          </Link>

          <Link
            href="/doctor/appointments"
            className="flex items-center gap-3 hover:bg-blue-600 p-3 rounded-xl"
          >
            <FaCalendarCheck />
            Appointments
          </Link>

          <Link
            href="/doctor/patients"
            className="flex items-center gap-3 hover:bg-blue-600 p-3 rounded-xl"
          >
            <FaUserInjured />
            Patients
          </Link>

          <Link
            href="/doctor/consultations"
            className="flex items-center gap-3 hover:bg-blue-600 p-3 rounded-xl"
          >
            <FaStethoscope />
            Consultations
          </Link>

          <Link
            href="/doctor/prescriptions"
            className="flex items-center gap-3 hover:bg-blue-600 p-3 rounded-xl"
          >
            <FaPrescriptionBottleAlt />
            Prescriptions
          </Link>

          <Link
            href="/doctor/lab-reports"
            className="flex items-center gap-3 hover:bg-blue-600 p-3 rounded-xl"
          >
            <FaFlask />
            Lab Reports
          </Link>

          <Link
            href="/doctor/ipd"
            className="flex items-center gap-3 hover:bg-blue-600 p-3 rounded-xl"
          >
            <FaProcedures />
            IPD Patients
          </Link>

          <Link
            href="/doctor/followups"
            className="flex items-center gap-3 hover:bg-blue-600 p-3 rounded-xl"
          >
            <FaHistory />
            Follow-Ups
          </Link>

          <Link
            href="/doctor/messages"
            className="flex items-center gap-3 hover:bg-blue-600 p-3 rounded-xl"
          >
            <FaComments />
            Messages
          </Link>

          <Link
            href="/doctor/analytics"
            className="flex items-center gap-3 hover:bg-blue-600 p-3 rounded-xl"
          >
            <FaChartLine />
            Analytics
          </Link>

          <Link
            href="/doctor/settings"
            className="flex items-center gap-3 hover:bg-blue-600 p-3 rounded-xl"
          >
            <FaCog />
            Settings
          </Link>
        </nav>
      </div>
    </>
  );
}
