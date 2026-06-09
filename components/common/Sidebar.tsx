"use client";

import { useEffect, useState } from "react";
import axios from "axios";

interface Bill {
  id: string;
  billNumber: string;
  totalAmount: number;
  paidAmount: number;
  paymentStatus: string;
  createdAt: string;

  patient: {
    patientCode: string;
    firstName: string;
    lastName: string;
  };
}

export default function BillingPage() {
  const [bills, setBills] = useState<Bill[]>([]);

  const [showModal, setShowModal] = useState(false);

  const [search, setSearch] = useState("");

  const [formData, setFormData] = useState({
    patientId: "",
    consultationFee: 0,
    labFee: 0,
    roomFee: 0,
    medicineFee: 0,
    otherCharges: 0,
  });

  const fetchBills = async () => {
    try {
      const token = localStorage.getItem("token");

      const response = await axios.get("http://localhost:5000/api/bills", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setBills(response.data);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    fetchBills();
  }, []);

  const handleCreateBill = async () => {
    try {
      const token = localStorage.getItem("token");

      await axios.post("http://localhost:5000/api/bills", formData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setShowModal(false);

      fetchBills();
    } catch (error) {
      console.log(error);
    }
  };

  const handleDelete = async (id: string) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this bill?",
    );

    if (!confirmDelete) return;

    try {
      const token = localStorage.getItem("token");

      await axios.delete(`http://localhost:5000/api/bills/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      fetchBills();
    } catch (error) {
      console.log(error);
    }
  };

  const filteredBills = bills.filter((bill) =>
    bill.billNumber.toLowerCase().includes(search.toLowerCase()),
  );

  const totalRevenue = bills.reduce((sum, bill) => sum + bill.paidAmount, 0);

  const paidBills = bills.filter(
    (bill) => bill.paymentStatus === "PAID",
  ).length;

  const pendingBills = bills.filter(
    (bill) => bill.paymentStatus === "PENDING",
  ).length;

  return (
    <div className="space-y-6">
      {/* HEADER */}

      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Billing Management</h1>

        <button
          onClick={() => setShowModal(true)}
          className="
            bg-blue-600
            text-white
            px-5
            py-2
            rounded-lg
          "
        >
          Create Bill
        </button>
      </div>

      {/* CARDS */}

      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow">
          <h3 className="text-gray-500">Total Revenue</h3>

          <p className="text-3xl font-bold mt-2">₹{totalRevenue}</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow">
          <h3 className="text-gray-500">Paid Bills</h3>

          <p className="text-3xl font-bold mt-2 text-green-600">{paidBills}</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow">
          <h3 className="text-gray-500">Pending Bills</h3>

          <p className="text-3xl font-bold mt-2 text-red-600">{pendingBills}</p>
        </div>
      </div>

      {/* SEARCH */}

      <div className="bg-white p-4 rounded-xl shadow">
        <input
          type="text"
          placeholder="Search Bill Number..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="
            w-full
            border
            p-3
            rounded-lg
          "
        />
      </div>

      {/* TABLE */}

      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-4 text-left">Bill No</th>

              <th className="p-4 text-left">Patient</th>

              <th className="p-4 text-left">Total</th>

              <th className="p-4 text-left">Paid</th>

              <th className="p-4 text-left">Status</th>

              <th className="p-4 text-left">Date</th>

              <th className="p-4 text-left">Actions</th>
            </tr>
          </thead>

          <tbody>
            {filteredBills.map((bill) => (
              <tr key={bill.id} className="border-t">
                <td className="p-4">{bill.billNumber}</td>

                <td className="p-4">
                  {bill.patient.firstName} {bill.patient.lastName}
                </td>

                <td className="p-4">₹{bill.totalAmount}</td>

                <td className="p-4">₹{bill.paidAmount}</td>

                <td className="p-4">
                  <span
                    className={`
                      px-3 py-1 rounded-full text-sm
                      ${
                        bill.paymentStatus === "PAID"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }
                    `}
                  >
                    {bill.paymentStatus}
                  </span>
                </td>

                <td className="p-4">
                  {new Date(bill.createdAt).toLocaleDateString()}
                </td>

                <td className="p-4 flex gap-2">
                  <button
                    className="
                        bg-yellow-500
                        text-white
                        px-3
                        py-1
                        rounded
                      "
                  >
                    Edit
                  </button>

                  <button
                    onClick={() => handleDelete(bill.id)}
                    className="
                        bg-red-500
                        text-white
                        px-3
                        py-1
                        rounded
                      "
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* CREATE BILL MODAL */}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-xl w-full max-w-lg">
            <h2 className="text-2xl font-bold mb-5">Create Bill</h2>

            <div className="space-y-3">
              <input
                placeholder="Patient ID"
                className="w-full border p-3 rounded-lg"
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    patientId: e.target.value,
                  })
                }
              />

              <input
                type="number"
                placeholder="Consultation Fee"
                className="w-full border p-3 rounded-lg"
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    consultationFee: Number(e.target.value),
                  })
                }
              />

              <input
                type="number"
                placeholder="Lab Fee"
                className="w-full border p-3 rounded-lg"
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    labFee: Number(e.target.value),
                  })
                }
              />

              <input
                type="number"
                placeholder="Room Fee"
                className="w-full border p-3 rounded-lg"
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    roomFee: Number(e.target.value),
                  })
                }
              />

              <input
                type="number"
                placeholder="Medicine Fee"
                className="w-full border p-3 rounded-lg"
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    medicineFee: Number(e.target.value),
                  })
                }
              />

              <input
                type="number"
                placeholder="Other Charges"
                className="w-full border p-3 rounded-lg"
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    otherCharges: Number(e.target.value),
                  })
                }
              />
            </div>

            <div className="flex justify-end gap-3 mt-5">
              <button
                onClick={() => setShowModal(false)}
                className="
                  bg-gray-300
                  px-5
                  py-2
                  rounded-lg
                "
              >
                Cancel
              </button>

              <button
                onClick={handleCreateBill}
                className="
                  bg-blue-600
                  text-white
                  px-5
                  py-2
                  rounded-lg
                "
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
