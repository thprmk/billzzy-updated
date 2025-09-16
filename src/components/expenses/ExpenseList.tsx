// src/components/expenses/ExpenseList.tsx
"use client";

import useSWR from 'swr';
import { format } from 'date-fns';
import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';

// Define the structure of an Expense object for TypeScript
interface Expense {
  id: number;
  date: string;
  amount: number;
  notes: string | null;
  paymentMode: string;
  category: {
    id: number;
    name: string;
  };
  vendor: {
    id: number;
    name: string;
  } | null;
}

const fetcher = (url: string) => fetch(url).then(res => {
  if (!res.ok) {
    throw new Error('An error occurred while fetching the data.');
  }
  return res.json();
});

export default function ExpenseList() {
  // CORRECTED: We get 'data' from useSWR, not 'expenses' directly
  const { data, error, isLoading } = useSWR<Expense[]>('/api/expenses', fetcher);

  if (isLoading) {
    return <div className="text-center p-8">Loading expenses...</div>;
  }

  if (error) {
    return <div className="text-center p-8 text-red-500">Failed to load expenses. Please try again later.</div>;
  }

  // Now, we can safely work with the 'data' variable.
  // We also handle the case where data might not be an array.
  if (!Array.isArray(data)) {
      console.error("Data received from API is not an array:", data);
      return <div className="text-center p-8 text-red-500">Received invalid data from the server.</div>;
  }
  
  // If we've passed all checks, we can now call our data 'expenses'
  const expenses = data;

  if (expenses.length === 0) {
    return (
      <div className="text-center p-8 border border-dashed rounded-lg">
        <h3 className="text-xl font-semibold">No Expenses Found</h3>
        <p className="text-muted-foreground mt-2">
          Click the "Add Expense" button to log your first expense.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border shadow-sm">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor</th>
            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
            <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {expenses.map((expense) => (
            <tr key={expense.id}>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{format(new Date(expense.date), 'dd MMM yyyy')}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{expense.category.name}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{expense.vendor?.name || 'N/A'}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(expense.amount)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 max-w-xs truncate">{expense.notes || '-'}</td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" size="icon" disabled> {/* Disabled for now */}
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" disabled> {/* Disabled for now */}
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}