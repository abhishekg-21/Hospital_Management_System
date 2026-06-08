"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");

    if (!token || !role) return;

    switch (role) {
      case "SUPER_ADMIN":
      case "ADMIN":
        router.push("/admin/dashboard");
        break;

      case "DOCTOR":
        router.push("/doctor/dashboard");
        break;

      case "RECEPTIONIST":
        router.push("/receptionist/dashboard");
        break;

      case "PATIENT":
        router.push("/patient/dashboard");
        break;

      default:
        localStorage.clear();
        break;
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Navbar */}

      <nav className="flex items-center justify-between px-10 py-5 bg-white shadow">
        <h1 className="text-3xl font-bold text-blue-700">HMS</h1>

        <div className="flex gap-4">
          <Link
            href="/login"
            className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700"
          >
            Login
          </Link>
        </div>
      </nav>

      {/* Hero Section */}

      <div className="flex flex-col items-center justify-center h-[80vh] text-center">
        <h1 className="text-5xl font-bold text-gray-800 mb-4">
          Hospital Management System
        </h1>

        <p className="text-gray-600 text-lg max-w-2xl">
          Manage Patients, Doctors, Appointments, Billing, Medical Records and
          Hospital Operations from one place.
        </p>

        <Link
          href="/login"
          className="mt-8 bg-blue-600 text-white px-8 py-3 rounded-xl hover:bg-blue-700"
        >
          Get Started
        </Link>
      </div>
    </div>
  );
}
