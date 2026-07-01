/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useState } from "react";

import axios from "axios";

interface Bill {
  id: string;

  billCode: string;

  totalAmount: number;

  paymentStatus: string;

  patient: {
    firstName: string;
    lastName: string;
  };
}

export default function BillingPage() {
  const [bills, setBills] = useState<Bill[]>([]);

  const fetchBills = async () => {
    const res = await axios.get("http://localhost:5000/api/bills");

    setBills(res.data);
  };

  useEffect(() => {
    fetchBills();
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Billing Management</h1>

      <div className="bg-white shadow rounded-xl">
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-4">Bill ID</th>

              <th>Patient</th>

              <th>Amount</th>

              <th>Status</th>
            </tr>
          </thead>

          <tbody>
            {bills.map((bill) => (
              <tr key={bill.id} className="border-t">
                <td className="p-4">{bill.billCode}</td>

                <td>
                  {bill.patient.firstName} {bill.patient.lastName}
                </td>

                <td>₹ {bill.totalAmount}</td>

                <td>
                  <span
                    className={
                      bill.paymentStatus === "PAID"
                        ? "bg-green-200 px-3 py-1 rounded"
                        : "bg-yellow-200 px-3 py-1 rounded"
                    }
                  >
                    {bill.paymentStatus}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
