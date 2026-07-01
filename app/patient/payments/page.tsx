export default function Payments() {
  const payments = [
    {
      id: 1,
      date: "10 June 2026",
      amount: "₹2000",
      status: "Paid",
    },
    {
      id: 2,
      date: "20 June 2026",
      amount: "₹500",
      status: "Pending",
    },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Payment History</h1>

      <div className="bg-white p-6 rounded-xl shadow">
        <table className="w-full">
          {/* HEADER */}

          <thead className="bg-gray-100">
            <tr>
              <th className="p-4 text-left">Date</th>

              <th className="p-4 text-left">Amount</th>

              <th className="p-4 text-left">Status</th>
            </tr>
          </thead>

          {/* BODY */}

          <tbody>
            {payments.map((payment) => (
              <tr key={payment.id} className="border-t">
                <td className="p-4">{payment.date}</td>

                <td className="p-4">{payment.amount}</td>

                <td className="p-4">
                  <span
                    className={
                      payment.status === "Paid"
                        ? "text-green-600"
                        : "text-red-600"
                    }
                  >
                    {payment.status}
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
