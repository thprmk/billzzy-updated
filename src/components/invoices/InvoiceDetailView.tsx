// src/components/invoices/InvoiceDetailView.tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Invoice } from '@/types/invoice'; 
import Image from 'next/image';


export function InvoiceDetailView({ invoice }: { invoice: Invoice }) {
  // Use the passed-in invoice as the initial state
  const [currentInvoice, setCurrentInvoice] = useState(invoice);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // Safely handle the 'notes' property, checking if it is null
  const notes = currentInvoice.notes || ''; // Default to an empty string if notes is null
  const customerInfo = notes.split('\n\n')[0];
  const additionalNotes = notes.split('\n\n')[1] || '';

  const handleMarkAsPaid = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/invoices/${currentInvoice.id}/pay`, {
        method: 'PATCH',
      });
      if (!response.ok) {
        throw new Error('Failed to mark invoice as paid');
      }
      const updatedInvoice = await response.json();
      setCurrentInvoice(prevInvoice => ({
        ...prevInvoice!, // This keeps all the old data, including the 'items' array.
        ...updatedInvoice, // This overwrites any updated fields, like 'status'.
      })); // Update local state to re-render the component
      router.refresh(); // Tells Next.js to re-fetch server data for consistency
    } catch (error) {
      console.error(error);
      alert('An error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white p-8 rounded-lg shadow-lg max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
                    {/* --- FIX: DISPLAY THE LOGO --- */}
                    {currentInvoice.logoUrl && (
            <Image 
              src={currentInvoice.logoUrl} 
              alt="Company Logo"
              width={150}
              height={70}
              className="mb-4 object-contain h-auto"
            />
          )}

          <h1 className="text-3xl font-bold text-gray-800">Invoice</h1>
          <p className="text-gray-500">{currentInvoice.invoiceNumber}</p>
        </div>
        <div className="flex flex-col items-end gap-4">
          <div className="text-right">
            {/* --- FIX: USE REAL ORGANISATION DATA --- */}
            <p className="font-semibold">{currentInvoice.organisation.shopName}</p>
            <p className="text-sm text-gray-600">{currentInvoice.organisation.street}, {currentInvoice.organisation.flatNo}</p>
            <p className="text-sm text-gray-600">{currentInvoice.organisation.city}, {currentInvoice.organisation.state} - {currentInvoice.organisation.pincode}</p>
          </div>
          <div className="flex items-center gap-2">
    {/* The existing "Mark as Paid" button */}
    {currentInvoice.status !== 'PAID' && (
      <Button onClick={handleMarkAsPaid} disabled={isLoading}>
        {isLoading ? 'Processing...' : 'Mark as Paid'}
      </Button>
    )}
    
    {/* The new "Download PDF" button */}
    <a 
        href={`/api/invoices/${currentInvoice.id}/download`} 
        target="_blank"
        rel="noopener noreferrer"
      >
      <Button variant="outline">Download PDF</Button> {/* Assuming you have an outline variant */}
    </a>
  </div>
        </div>
      </div>
      
      {/* Details */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        <div>
          <h2 className="font-semibold text-gray-700 mb-2">Bill To:</h2>
          {/* --- FIX: USE REAL CUSTOMER DATA --- */}
          {currentInvoice.customer ? (
            <div className="text-gray-600 whitespace-pre-line">
              <p className="font-semibold">{currentInvoice.customer.name}</p>
              <p>{currentInvoice.customer.street}, {currentInvoice.customer.flatNo}</p>
              <p>{currentInvoice.customer.district}, {currentInvoice.customer.state} - {currentInvoice.customer.pincode}</p>
            </div>
          ) : (
            <p>Walk-in Customer</p>
          )}
      </div>

      <div className="text-right">
          <p><span className="font-semibold">Issue Date:</span> {new Date(currentInvoice.issueDate).toLocaleDateString()}</p>
          <p><span className="font-semibold">Due Date:</span> {new Date(currentInvoice.dueDate).toLocaleDateString()}</p>
          <p><span className={`font-semibold px-3 py-1 rounded-full text-sm mt-2 inline-block ${currentInvoice.status === 'PAID' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{currentInvoice.status}</span></p>
        </div>
      </div>
      
      {/* Items Table */}
      <table className="w-full mb-8">
        <thead>
          <tr className="bg-gray-50">
            <th className="text-left p-3 font-semibold text-gray-600">Description</th>
            <th className="text-center p-3 font-semibold text-gray-600">Quantity</th>
            <th className="text-right p-3 font-semibold text-gray-600">Unit Price</th>
            <th className="text-right p-3 font-semibold text-gray-600">Total</th>
          </tr>
        </thead>
        <tbody>
          {currentInvoice.items.map(item => (
            <tr key={item.id} className="border-b">
              <td className="p-3">{item.description}</td>
              <td className="text-center p-3">{item.quantity}</td>
              <td className="text-right p-3">${item.unitPrice.toFixed(2)}</td>
              <td className="text-right p-3">${item.total.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      
      {/* Totals */}
      <div className="flex justify-end">
        <div className="w-full max-w-sm space-y-2">
          <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>${currentInvoice.subTotal.toFixed(2)}</span></div>
          <div className="flex justify-between text-gray-600"><span>Tax</span><span>${currentInvoice.totalTax.toFixed(2)}</span></div>
          <div className="flex justify-between font-bold text-xl text-gray-800 border-t pt-2 mt-2"><span>Total</span><span>${currentInvoice.totalAmount.toFixed(2)}</span></div>
        </div>
      </div>
      
      {/* Notes */}
      {additionalNotes && (
        <div className="mt-8 border-t pt-4">
          <h3 className="font-semibold mb-2">Notes</h3>
          <p className="text-gray-600 text-sm">{additionalNotes}</p>
        </div>
      )}
    </div>
  );
}