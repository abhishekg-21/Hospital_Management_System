"use client";

import { useEffect, useState } from "react";
import api from "@/services/api";

export default function Dashboard() {
  const [data, setData] = useState({
    appointments: 0,

    prescriptions: 0,
  });

  useEffect(() => {
    api
      .get("/patients/dashboard")

      .then((res) => {
        setData(res.data);
      });
  }, []);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Patient Dashboard</h1>

      <div className="grid grid-cols-2 gap-6">
        <Card title="Appointments" value={data.appointments} />

        <Card title="Prescriptions" value={data.prescriptions} />
      </div>
    </div>
  );
}

function Card({
  title,

  value,
}: {
  title: string;

  value: number;
}) {
  return (
    <div className="bg-white p-6 rounded-xl shadow">
      <h2 className="text-gray-500">{title}</h2>

      <p className="text-4xl font-bold">{value}</p>
    </div>
  );
}
