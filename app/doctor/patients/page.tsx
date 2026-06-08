export default function PatientsPage() {
  return (
    <div className="bg-white p-6 rounded-xl shadow">
      <h1 className="text-3xl font-bold mb-6">Patients</h1>

      <table className="w-full">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-4 text-left">Patient ID</th>
            <th className="p-4 text-left">Name</th>
            <th className="p-4 text-left">Age</th>
            <th className="p-4 text-left">Gender</th>
            <th className="p-4 text-left">Status</th>
          </tr>
        </thead>
      </table>
    </div>
  );
}
