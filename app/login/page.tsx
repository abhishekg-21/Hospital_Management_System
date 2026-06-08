"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/services/api";
import axios from "axios";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await axios.post(
        "http://localhost:5000/api/auth/login",
        formData,
      );

      /* STORE TOKEN */
      localStorage.setItem("token", response.data.token);

      /* STORE ROLE */
      localStorage.setItem("role", response.data.user.role);

      /* STORE USER */
      localStorage.setItem("user", JSON.stringify(response.data.user));

      const role = response.data.user.role;

      /* ROLE BASED REDIRECT */

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
          alert("Invalid User Role");
          localStorage.clear();
      }
    } catch (error: unknown) {
      console.log(error);

      if (axios.isAxiosError(error)) {
        alert(error.response?.data?.message || "Login Failed");
      } else {
        alert("Something went wrong");
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-2xl shadow w-full max-w-md">
        <h1 className="text-3xl font-bold text-center mb-6">HMS Login</h1>

        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
          />

          <input
            type="password"
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
          />

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-3 rounded-xl hover:bg-blue-700"
          >
            Login
          </button>
        </form>
      </div>
    </div>
  );
}
