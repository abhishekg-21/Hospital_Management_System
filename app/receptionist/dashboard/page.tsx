/* eslint-disable react/no-unescaped-entities */
//  app/receptionist/dashboard/page.tsx

export default function Dashboard() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Reception Dashboard</h1>

      <div className="grid grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded">Today's Patients</div>

        <div className="bg-white p-6 rounded">Appointments</div>

        <div className="bg-white p-6 rounded">Check Ins</div>

        <div className="bg-white p-6 rounded">Billing</div>
      </div>
    </div>
  );
}
