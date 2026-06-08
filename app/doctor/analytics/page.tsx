export default function AnalyticsPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Analytics</h1>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow">
          Patients Seen Today
          <h2 className="text-4xl font-bold mt-2">24</h2>
        </div>

        <div className="bg-white p-6 rounded-xl shadow">
          Monthly Consultations
          <h2 className="text-4xl font-bold mt-2">320</h2>
        </div>

        <div className="bg-white p-6 rounded-xl shadow">
          Follow-Ups
          <h2 className="text-4xl font-bold mt-2">45</h2>
        </div>
      </div>
    </div>
  );
}
