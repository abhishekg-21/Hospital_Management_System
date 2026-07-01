export default function Prescriptions() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">My Prescriptions</h1>

      <div className="bg-white p-6 rounded-xl shadow">
        <table className="w-full">
          <tr>
            <th>Medicine</th>

            <th>Dosage</th>

            <th>Duration</th>
          </tr>

          <tr className="border-t">
            <td>Paracetamol</td>

            <td>500mg</td>

            <td>5 Days</td>
          </tr>
        </table>
      </div>
    </div>
  );
}
