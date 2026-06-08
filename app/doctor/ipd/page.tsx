export default function IPDPage() {
  return (
    <div className="bg-white p-6 rounded-xl shadow">
      <h1 className="text-3xl font-bold mb-6">IPD Patients</h1>

      <table className="w-full">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-4">Patient</th>
            <th className="p-4">Ward</th>
            <th className="p-4">Bed</th>
            <th className="p-4">Status</th>
          </tr>
        </thead>
      </table>
    </div>
  );
}
