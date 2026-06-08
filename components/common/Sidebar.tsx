//  components/common/Sidebar.tsx

"use client";

import Link from "next/link";
import { useState } from "react";

import {
  FaBars,
  FaTimes,
  FaUserInjured,
  FaUserMd,
  FaCalendarCheck,
  FaMoneyBillWave,
  FaChartBar,
  FaUsers,
} from "react-icons/fa";

export default function Sidebar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile Topbar */}
      <div className="lg:hidden flex items-center justify-between bg-blue-700 text-white p-4 fixed top-0 left-0 w-full z-50">
        <h1 className="text-xl font-bold">HMS</h1>

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
          fixed top-0 left-0 h-screen w-64 bg-blue-700 text-white p-5 z-50
          transform transition-transform duration-300
          ${open ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0
        `}
      >
        {/* Close Button */}
        <div className="flex items-center justify-between mb-10 lg:hidden">
          <h1 className="text-2xl font-bold">HMS</h1>

          <button onClick={() => setOpen(false)}>
            <FaTimes size={22} />
          </button>
        </div>

        {/* Desktop Title */}
        <h1 className="text-2xl font-bold mb-10 hidden lg:block">HMS Admin</h1>

        {/* Navigation */}
        <nav className="flex flex-col gap-4">
          <Link
            href="/admin/dashboard"
            className="flex items-center gap-3 hover:bg-blue-600 p-3 rounded-xl"
          >
            <FaChartBar />
            Dashboard
          </Link>

          <Link
            href="/admin/users"
            className="flex items-center gap-3 hover:bg-blue-600 p-3 rounded-xl"
          >
            <FaUsers />
            Users
          </Link>

          <Link
            href="/admin/patients"
            className="flex items-center gap-3 hover:bg-blue-600 p-3 rounded-xl"
          >
            <FaUserInjured />
            Patients
          </Link>

          <Link
            href="/admin/departments"
            className="flex items-center gap-3 hover:bg-blue-600 p-3 rounded-xl"
          >
            Departments
          </Link>

          <Link
            href="/admin/doctors"
            className="flex items-center gap-3 hover:bg-blue-600 p-3 rounded-xl"
          >
            <FaUserMd />
            Doctors
          </Link>

          <Link
            href="/admin/appointments"
            className="flex items-center gap-3 hover:bg-blue-600 p-3 rounded-xl"
          >
            <FaCalendarCheck />
            Appointments
          </Link>

          <Link
            href="/admin/billing"
            className="flex items-center gap-3 hover:bg-blue-600 p-3 rounded-xl"
          >
            <FaMoneyBillWave />
            Billing
          </Link>
        </nav>
      </div>
    </>
  );
}
