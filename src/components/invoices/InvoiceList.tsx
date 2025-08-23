// src/components/invoices/InvoiceList.tsx
'use client';

import React from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';

// Define the type for an invoice object we expect from the API
interface Invoice {
  id: number;
  invoiceNumber: string;
  status: string;
  totalAmount: number;
  dueDate: string;
  notes: string;
}

// The fetcher function for useSWR
const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function InvoiceList() {
  const { data, error, isLoading } = useSWR<Invoice[]>('/api/invoices', fetcher);

  if (isLoading) return <div>Loading invoices...</div>;
  if (error) return <div>Failed to load invoices. Please try again.</div>;
  if (!data || data.length === 0) {
    return (
      <div className="text-center">
        <p className="mb-4">No invoices found.</p>
        <Link href="/invoices/new">
          <Button>Create Your First Invoice</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">All Invoices</h2>
        <Link href="/invoices/new">
          <Button>Create New Invoice</Button>
        </Link>
      </div>
      <table className="w-full text-left">
        <thead>
          <tr className="border-b">
            <th className="p-2">Invoice #</th>
            <th className="p-2">Customer</th>
            <th className="p-2">Due Date</th>
            <th className="p-2">Status</th>
            <th className="p-2 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {data.map((invoice) => (
            <tr key={invoice.id} className="border-b hover:bg-gray-50">
      <td className="p-2 font-medium">
        <Link href={`/invoices/${invoice.id}`} className="text-indigo-600 hover:underline">
          {invoice.invoiceNumber}
        </Link>
      </td>              <td className="p-2">{invoice.notes.split('\n')[0]}</td> {/* Show first line of notes as customer */}
              <td className="p-2">{new Date(invoice.dueDate).toLocaleDateString()}</td>
              <td className="p-2">
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                  invoice.status === 'PAID' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {invoice.status}
                </span>
              </td>
              <td className="p-2 text-right font-medium">${invoice.totalAmount.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}