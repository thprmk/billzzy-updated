// components/dashboard/RecentTransactions.tsx

import { format } from "date-fns";
import React from 'react';

interface RecentTransactionsProps {
    data: any[];
}

export default function RecentTransactions({ data }: RecentTransactionsProps) {
    return (
        <div className="overflow-x-auto">
            {data.length > 0 ? (
                <div className="min-w-full">
                    {/* Desktop View */}
                    <table className="hidden md:table min-w-full divide-y divide-gray-200">
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

                    {/* Mobile View */}
                    <div className="md:hidden space-y-4">
                        {data.map((transaction: any) => (
                            <div key={transaction.id} className="bg-white p-4 rounded-lg shadow-sm">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm font-medium text-gray-500">
                                        {format(new Date(transaction.date), 'MM/dd/yyyy')}
                                    </span>
                                    <span className="text-sm font-semibold text-gray-900">
                                        ₹{transaction.totalPrice.toFixed(2)}
                                    </span>
                                </div>
                                <div className="text-sm text-gray-600">
                                    {transaction.customer?.name || 'N/A'}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <p className="text-sm text-gray-500 p-4">No recent transactions.</p>
            )}
        </div>
    );
}