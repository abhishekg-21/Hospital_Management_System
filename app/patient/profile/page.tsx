/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";

export default function Profile() {
  const [user, setUser] = useState<any>();

  useEffect(() => {
    setUser(JSON.parse(localStorage.getItem("user") || "{}"));
  }, []);

  return (
    <div>
      <h1 className="text-3xl font-bold">My Profile</h1>

      <div className="bg-white mt-6 p-6 rounded-xl shadow">
        <p>Name : {user?.name}</p>

        <p>Email : {user?.email}</p>

        <p>Role : Patient</p>
      </div>
    </div>
  );
}
