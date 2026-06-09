/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useState } from "react";
import axios from "axios";

interface Patient {
  id: string;
  patientCode: string;
  firstName: string;
  lastName: string;
}

interface Doctor {
  id: string;
  doctorCode: string;
  name: string;
}

interface Appointment {
  id: string;
  appointmentCode: string;

  patient: Patient;

  doctor: Doctor;

  date: string;
  time: string;
  status: string;
}

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  const [patients, setPatients] = useState<Patient[]>([]);

  const [doctors, setDoctors] = useState<Doctor[]>([]);

  const [showModal, setShowModal] = useState(false);

  const [formData, setFormData] = useState({
    patientId: "",
    doctorId: "",
    date: "",
    time: "",
  });

  /* =======================
     FETCH APPOINTMENTS
  ======================= */

  const fetchAppointments = async () => {
    try {
      const token = localStorage.getItem("token");

      const response = await axios.get(
        "http://localhost:5000/api/doctor_appointmentRoutes/appointments",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      setAppointments(response.data);
    } catch (error) {
      console.log(error);
    }
  };

  /* =======================
     FETCH PATIENTS
  ======================= */

  const fetchPatients = async () => {
    try {
      const token = localStorage.getItem("token");

      const response = await axios.get("http://localhost:5000/api/patients", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setPatients(response.data);
    } catch (error) {
      console.log(error);
    }
  };

  /* =======================
     FETCH DOCTORS
  ======================= */

  const fetchDoctors = async () => {
    try {
      const token = localStorage.getItem("token");

      const response = await axios.get("http://localhost:5000/api/doctors", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setDoctors(response.data);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    fetchAppointments();
    fetchPatients();
    fetchDoctors();
  }, []);

  /* =======================
     HANDLE INPUT
  ======================= */

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  /* =======================
     CREATE APPOINTMENT
  ======================= */

  const createAppointment = async () => {
    try {
      const token = localStorage.getItem("token");

      await axios.post("http://localhost:5000/api/appointment", formData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      fetchAppointments();

      setShowModal(false);

      setFormData({
        patientId: "",
        doctorId: "",
        date: "",
        time: "",
      });
    } catch (error) {
      console.log(error);
    }
  };

  /* =======================
     DELETE APPOINTMENT
  ======================= */

  const deleteAppointment = async (id: string) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this appointment?",
    );

    if (!confirmDelete) return;

    try {
      const token = localStorage.getItem("token");

      await axios.delete(`http://localhost:5000/api/appointment/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      fetchAppointments();
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <div>
      {/* HEADER */}

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Appointment Management</h1>

        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 text-white px-5 py-2 rounded-lg"
        >
          Book Appointment
        </button>
      </div>

      {/* TABLE */}

      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-4">Code</th>
              <th className="p-4">Patient</th>
              <th className="p-4">Doctor</th>
              <th className="p-4">Date</th>
              <th className="p-4">Time</th>
              <th className="p-4">Status</th>
              <th className="p-4">Action</th>
            </tr>
          </thead>

          <tbody>
            {appointments.map((appointment) => (
              <tr key={appointment.id} className="border-t">
                <td className="p-4">{appointment.appointmentCode}</td>

                <td className="p-4">
                  {appointment.patient.firstName} {appointment.patient.lastName}
                </td>

                <td className="p-4">{appointment.doctor.name}</td>

                <td className="p-4">
                  {new Date(appointment.date).toLocaleDateString()}
                </td>

                <td className="p-4">{appointment.time}</td>

                <td className="p-4">
                  <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full">
                    {appointment.status}
                  </span>
                </td>

                <td className="p-4">
                  <button
                    onClick={() => deleteAppointment(appointment.id)}
                    className="bg-red-500 text-white px-4 py-1 rounded"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* CREATE MODAL */}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center">
          <div className="bg-white w-full max-w-lg rounded-xl p-6">
            <h2 className="text-2xl font-bold mb-5">Book Appointment</h2>

            <div className="space-y-4">
              <select
                name="patientId"
                value={formData.patientId}
                onChange={handleChange}
                className="w-full border p-3 rounded-lg"
              >
                <option value="">Select Patient</option>

                {patients.map((patient) => (
                  <option key={patient.id} value={patient.id}>
                    {patient.patientCode} - {patient.firstName}{" "}
                    {patient.lastName}
                  </option>
                ))}
              </select>

              <select
                name="doctorId"
                value={formData.doctorId}
                onChange={handleChange}
                className="w-full border p-3 rounded-lg"
              >
                <option value="">Select Doctor</option>

                {doctors.map((doctor) => (
                  <option key={doctor.id} value={doctor.id}>
                    {doctor.doctorCode} - {doctor.name}
                  </option>
                ))}
              </select>

              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                className="w-full border p-3 rounded-lg"
              />

              <input
                type="time"
                name="time"
                value={formData.time}
                onChange={handleChange}
                className="w-full border p-3 rounded-lg"
              />

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowModal(false)}
                  className="bg-gray-300 px-5 py-2 rounded-lg"
                >
                  Cancel
                </button>

                <button
                  onClick={createAppointment}
                  className="bg-blue-600 text-white px-5 py-2 rounded-lg"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
