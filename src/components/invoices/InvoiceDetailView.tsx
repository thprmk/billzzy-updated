// src/components/invoices/InvoiceDetailView.tsx
'use client';
import { useState } from 'react'; // Add useState
import { useRouter } from 'next/navigation'; // Import the router for refreshing data
import { Button } from '@/components/ui/Button'; // Import your button

// Same Invoice type definition from the page
interface Invoice {
  id: number;
  invoiceNumber: string;
  status: string;
  issueDate: Date;
  dueDate: Date;
  notes: string;
  subTotal: number;
  totalTax: number;
  totalAmount: number;
  items: {
    id: number;
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }[];
}

export function InvoiceDetailView({ invoice }: { invoice: Invoice }) {
  const customerInfo = invoice.notes.split('\n\n')[0];
  const additionalNotes = invoice.notes.split('\n\n')[1] || '';

  const [currentInvoice, setCurrentInvoice] = useState(invoice);
const [isLoading, setIsLoading] = useState(false);
const router = useRouter();

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
    setCurrentInvoice(updatedInvoice); // Update the local state to change the status display
    router.refresh(); // Tell Next.js to re-fetch server data to keep everything in sync
    
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
    <h1 className="text-3xl font-bold text-gray-800">Invoice</h1>
    <p className="text-gray-500">{currentInvoice.invoiceNumber}</p>
  </div>
  
  {/* --- ADD THIS BUTTON --- */}
  <div className="flex flex-col items-end gap-4">
      <div className="text-right">
          <p className="font-semibold">Your Company Name</p>
          <p className="text-sm text-gray-600">123 Your Street, Your City</p>
      </div>
      {currentInvoice.status !== 'PAID' && (
          <Button onClick={handleMarkAsPaid} disabled={isLoading}>
              {isLoading ? 'Processing...' : 'Mark as Paid'}
          </Button>
      )}
  </div>
  
  </div>y 
      {/* Details */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        <div>
          <h2 className="font-semibold text-gray-700 mb-2">Bill To:</h2>
          <div className="text-gray-600 whitespace-pre-line">{customerInfo}</div>
        </div>
        <div className="text-right">
          <p><span className="font-semibold">Issue Date:</span> {new Date(invoice.issueDate).toLocaleDateString()}</p>
          <p><span className="font-semibold">Due Date:</span> {new Date(invoice.dueDate).toLocaleDateString()}</p>
          <p><span className={`font-semibold px-3 py-1 rounded-full text-sm mt-2 inline-block ${
              invoice.status === 'PAID' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
            }`}>{invoice.status}</span></p>
        </div>
      </div>
      
      {/* Items Table */}
      <table className="w-full mb-8">
        <thead className="bg-gray-50">
          <tr>
            <th className="text-left p-3 font-semibold text-gray-600">Description</th>
            <th className="text-center p-3 font-semibold text-gray-600">Quantity</th>
            <th className="text-right p-3 font-semibold text-gray-600">Unit Price</th>
            <th className="text-right p-3 font-semibold text-gray-600">Total</th>
          </tr>
        </thead>
        <tbody>
          {invoice.items.map(item => (
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
          <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>${invoice.subTotal.toFixed(2)}</span></div>
          <div className="flex justify-between text-gray-600"><span>Tax</span><span>${invoice.totalTax.toFixed(2)}</span></div>
          <div className="flex justify-between font-bold text-xl text-gray-800 border-t pt-2 mt-2"><span>Total</span><span>${invoice.totalAmount.toFixed(2)}</span></div>
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