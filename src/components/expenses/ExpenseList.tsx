// src/components/expenses/ExpenseList.tsx
"use client";

import useSWR, { mutate } from 'swr';
import { format } from 'date-fns';
import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Expense } from '@/app/(dashboard)/expenses/page'; // Import the shared type

// Define the props for this component
interface ExpenseListProps {
  onEdit: (expense: Expense) => void;
}

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function ExpenseList({ onEdit }: ExpenseListProps) {
  const { data, error, isLoading } = useSWR<Expense[]>('/api/expenses', fetcher);

  const handleDelete = async (expenseId: number) => {
    if (!confirm('Are you sure you want to delete this expense? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/expenses/${expenseId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete the expense.');
      
      alert('Expense deleted successfully!');
      mutate('/api/expenses');
    } catch (err) {
      console.error(err);
      alert('An error occurred while deleting the expense.');
    }
  };

  if (isLoading) return <div className="text-center p-8">Loading expenses...</div>;
  if (error) return <div className="text-center p-8 text-red-500">Failed to load expenses. Please try again.</div>;
  if (!Array.isArray(data)) {
    console.error("Data received from API is not an array:", data);
    return <div className="text-center p-8 text-red-500">Received invalid data from the server.</div>;
  }
  
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
                  <Button variant="outline" size="icon" onClick={() => onEdit(expense)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={() => handleDelete(expense.id)}>
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