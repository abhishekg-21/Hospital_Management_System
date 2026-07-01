//  app/receptionist/layout.tsx

import Link from "next/link";

export default function ReceptionistLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex">
      <aside className="w-72 bg-blue-700 min-h-screen text-white p-5">
        <h1 className="text-2xl font-bold mb-8">Reception</h1>

        <div className="space-y-3">
          <Link href="/receptionist/dashboard">Dashboard</Link>

          <Link href="/receptionist/patients">Register Patient</Link>

          <Link href="/receptionist/appointments">Appointments</Link>

          <Link href="/receptionist/checkin">Check In</Link>

          <Link href="/receptionist/billing">Billing</Link>
        </div>
      </aside>

      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
