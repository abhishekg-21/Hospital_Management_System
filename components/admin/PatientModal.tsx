"use client";

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export default function PatientModal({
  isOpen,
  onClose,
}: Props) {

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">

      <div className="bg-white rounded-2xl w-full max-w-2xl p-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">

          <h2 className="text-2xl font-bold">
            Add Patient
          </h2>

          <button
            onClick={onClose}
            className="text-gray-500 text-xl"
          >
            ✕
          </button>

        </div>

        {/* Form */}
        <form className="grid grid-cols-1 md:grid-cols-2 gap-4">

          <input
            type="text"
            placeholder="Patient Name"
            className="border p-3 rounded-xl"
          />

          <input
            type="number"
            placeholder="Age"
            className="border p-3 rounded-xl"
          />

          <select className="border p-3 rounded-xl">
            <option>Male</option>
            <option>Female</option>
          </select>

          <input
            type="text"
            placeholder="Disease"
            className="border p-3 rounded-xl"
          />

          <input
            type="text"
            placeholder="Blood Group"
            className="border p-3 rounded-xl"
          />

          <input
            type="text"
            placeholder="Phone Number"
            className="border p-3 rounded-xl"
          />

          <textarea
            placeholder="Address"
            className="border p-3 rounded-xl md:col-span-2"
            rows={4}
          />

          {/* Buttons */}
          <div className="md:col-span-2 flex justify-end gap-4 mt-4">

            <button
              type="button"
              onClick={onClose}
              className="px-5 py-3 rounded-xl border"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="bg-blue-600 text-white px-5 py-3 rounded-xl hover:bg-blue-700"
            >
              Save Patient
            </button>

          </div>

        </form>
      </div>
    </div>
  );
}
