export default function Reports() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Lab Reports</h1>

      <div className="bg-white rounded-xl shadow p-6">
        <div className="flex justify-between">
          <p>CBC Blood Test</p>

          <button className="bg-blue-600 text-white px-4 py-2 rounded">
            Download
          </button>
        </div>
      </div>
    </div>
  );
}
