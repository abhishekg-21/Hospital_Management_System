export default function SettingsPage() {
  return (
    <div className="bg-white p-6 rounded-xl shadow max-w-3xl">
      <h1 className="text-3xl font-bold mb-6">Settings</h1>

      <div className="space-y-4">
        <input
          type="text"
          placeholder="Doctor Name"
          className="w-full border p-3 rounded-lg"
        />

        <input
          type="email"
          placeholder="Email"
          className="w-full border p-3 rounded-lg"
        />

        <input
          type="password"
          placeholder="New Password"
          className="w-full border p-3 rounded-lg"
        />

        <button className="bg-blue-600 text-white px-5 py-3 rounded-lg">
          Save Changes
        </button>
      </div>
    </div>
  );
}
