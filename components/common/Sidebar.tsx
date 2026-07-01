/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface MenuItem {
  name: string;
  path: string;
}

export default function Sidebar() {
  const pathname = usePathname();

  const router = useRouter();

  const [role, setRole] = useState("");

  useEffect(() => {
    const userRole = localStorage.getItem("role");

    if (userRole) {
      setRole(userRole);
    }
  }, []);

  const logout = () => {
    localStorage.clear();

    router.push("/login");
  };

  const menus: Record<string, MenuItem[]> = {
    ADMIN: [
      {
        name: "Dashboard",
        path: "/admin/dashboard",
      },

      {
        name: "Users",
        path: "/admin/users",
      },

      {
        name: "Patients",
        path: "/admin/patients",
      },

      {
        name: "Doctors",
        path: "/admin/doctors",
      },

      {
        name: "Departments",
        path: "/admin/departments",
      },

      {
        name: "Appointments",
        path: "/admin/appointments",
      },

      {
        name: "Billing",
        path: "/admin/billing",
      },

      {
        name: "IPD Management",
        path: "/admin/ipd",
      },
    ],

    SUPER_ADMIN: [
      {
        name: "Dashboard",
        path: "/admin/dashboard",
      },

      {
        name: "User Management",
        path: "/admin/users",
      },

      {
        name: "Department Management",
        path: "/admin/departments",
      },

      {
        name: "Doctor Management",
        path: "/admin/doctors",
      },

      {
        name: "Patients",
        path: "/admin/patients",
      },

      {
        name: "Appointments",
        path: "/admin/appointments",
      },

      {
        name: "Billing",
        path: "/admin/billing",
      },
    ],

    DOCTOR: [
      {
        name: "Dashboard",
        path: "/doctor/dashboard",
      },

      {
        name: "Appointments",
        path: "/doctor/appointments",
      },

      {
        name: "Patients",
        path: "/doctor/patients",
      },

      {
        name: "Consultations",
        path: "/doctor/consultations",
      },

      {
        name: "Prescriptions",
        path: "/doctor/prescriptions",
      },

      {
        name: "Lab Reports",
        path: "/doctor/lab-reports",
      },

      {
        name: "IPD Patients",
        path: "/doctor/ipd",
      },

      {
        name: "Follow Ups",
        path: "/doctor/followups",
      },

      {
        name: "Messages",
        path: "/doctor/messages",
      },

      {
        name: "Analytics",
        path: "/doctor/analytics",
      },
    ],

    RECEPTIONIST: [
      {
        name: "Dashboard",
        path: "/receptionist/dashboard",
      },

      {
        name: "Register Patient",
        path: "/receptionist/patients",
      },

      {
        name: "Book Appointment",
        path: "/receptionist/appointments",
      },

      {
        name: "Check-In",
        path: "/receptionist/checkin",
      },

      {
        name: "Billing",
        path: "/receptionist/billing",
      },
    ],

    PATIENT: [
      {
        name: "Dashboard",
        path: "/patient/dashboard",
      },

      {
        name: "Appointments",
        path: "/patient/appointments",
      },

      {
        name: "Prescriptions",
        path: "/patient/prescriptions",
      },

      {
        name: "Reports",
        path: "/patient/reports",
      },

      {
        name: "Payments",
        path: "/patient/payments",
      },
    ],
  };

  return (
    <div className="w-64 min-h-screen bg-white shadow-lg flex flex-col">
      {/* LOGO */}

      <div className="p-6 border-b">
        <h1 className="text-3xl font-bold text-blue-600">HMS</h1>

        <p className="text-sm text-gray-500">Hospital Management</p>
      </div>

      {/* MENU */}

      <div className="flex-1 p-4 space-y-2">
        {menus[role]?.map((item) => (
          <Link
            key={item.path}
            href={item.path}
            className={`block px-4 py-3 rounded-lg transition

${
  pathname === item.path
    ? "bg-blue-600 text-white"
    : "text-gray-700 hover:bg-gray-100"
}

`}
          >
            {item.name}
          </Link>
        ))}
      </div>

      {/* USER */}

      <div className="p-4 border-t">
        <button
          onClick={logout}
          className="w-full bg-red-500 text-white py-2 rounded-lg hover:bg-red-600"
        >
          Logout
        </button>
      </div>
    </div>
  );
}
