// components/dashboard/RecentTransactions.tsx

import { format } from "date-fns";
import React from 'react';  // Add this import

interface RecentTransactionsProps {
    data: any[];
  }
  
  export default function RecentTransactions({ data }: RecentTransactionsProps) {
    return (
      <div className=" overflow-y-auto ">
        {data.length > 0 ? (
          <table className="min-w-full divide-y   divide-gray-200">
            <thead>
              <tr>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                  Total Amount
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.map((transaction: any) => (
                <tr key={transaction.id}>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                  {format(new Date(transaction.date), 'MM/dd/yyyy')}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                    {transaction.customer?.name || 'N/A'}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                    ₹{transaction.totalPrice.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-gray-500">No recent transactions.</p>
        )}
      </div>
    );
  }
  