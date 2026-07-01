//  app/receptionist/patients/page.tsx

"use client";

import { useState } from "react";
import api from "@/services/api";

export default function Patients() {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    age: 0,
    gender: "Male",
    address: "",
  });

  const submit = async () => {
    await api.post("/patients", form);

    alert("Patient Registered");
  };

  return (
    <div>
      <h1 className="text-3xl mb-6">Register Patient</h1>

      <div className="space-y-4">
        <input placeholder="First Name" className="border p-3 w-full" />

        <input placeholder="Phone" className="border p-3 w-full" />

        <select className="border p-3 w-full">
          <option>Male</option>

          <option>Female</option>
        </select>

        <button onClick={submit} className="bg-blue-600 text-white p-3 rounded">
          Register
        </button>
      </div>
    </div>
  );
}
