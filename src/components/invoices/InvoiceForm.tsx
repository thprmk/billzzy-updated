// src/components/invoices/InvoiceForm.tsx
'use client';

import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/Button';


// Type for a single line item in our invoice
type InvoiceItem = {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
};

// Define the initial empty state for the form outside the component
// This makes it easy to reuse for resetting the form
const initialInvoiceDetails = {
  customerInfo: '',
  issueDate: new Date().toISOString().split('T')[0],
  dueDate: '',
  notes: '',
  taxRate: 0,
};
const initialItems = [{ description: '', quantity: 1, unitPrice: 0, total: 0 }];

export function InvoiceForm() {
  // --- STATE MANAGEMENT ---
  const [invoiceDetails, setInvoiceDetails] = useState(initialInvoiceDetails);
  const [items, setItems] = useState<InvoiceItem[]>(initialItems);
  const [isLoading, setIsLoading] = useState(false);

  // --- HANDLERS for updating state ---
  const handleDetailsChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setInvoiceDetails(prev => ({ ...prev, [name]: value }));
  };

  const handleItemChange = (index: number, field: keyof InvoiceItem, value: string | number) => {
    const newItems = [...items];
    const item = newItems[index];
    (item[field] as any) = value;
    item.total = Number(item.quantity) * Number(item.unitPrice);
    setItems(newItems);
  };

  const addItem = () => {
    setItems([...items, ...initialItems]); // Add a new empty item
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  // Function to reset the form to its initial state
  const resetForm = () => {
    setInvoiceDetails(initialInvoiceDetails);
    setItems(initialItems);
  };

  // --- CALCULATIONS (Derived State) ---
  const { subTotal, totalTax, totalAmount } = useMemo(() => {
    const subTotal = items.reduce((acc, item) => acc + item.total, 0);
    const taxRate = Number(invoiceDetails.taxRate) / 100;
    const totalTax = subTotal * taxRate;
    const totalAmount = subTotal + totalTax;
    return { subTotal, totalTax, totalAmount };
  }, [items, invoiceDetails.taxRate]);

  // --- FORM SUBMISSION ---
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);

    const payload = {
      issueDate: invoiceDetails.issueDate,
      dueDate: invoiceDetails.dueDate,
      items: items,
      notes: `${invoiceDetails.customerInfo}\n\n${invoiceDetails.notes}`,
      subTotal,
      totalTax,
      totalAmount,
    };

    try {
      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create invoice');
      }

      const newInvoice = await response.json();
      alert(`Invoice ${newInvoice.invoiceNumber} created successfully!`);
      resetForm(); // Reset the form instead of reloading

    } catch (error: any) {
      console.error(error);
      alert(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // --- JSX ---
  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md space-y-8">
      
      {/* --- Section 1: Customer & Dates --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <label htmlFor="customerInfo" className="block text-sm font-medium text-gray-700">Bill To</label>
          <textarea
            id="customerInfo"
            name="customerInfo"
            rows={3}
            value={invoiceDetails.customerInfo}
            onChange={handleDetailsChange}
            placeholder="Customer Name&#10;Customer Address"
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            required
          />
        </div>
        <div className="space-y-4">
          <div>
            <label htmlFor="issueDate">Issue Date</label>
            <input type="date" id="issueDate" name="issueDate" value={invoiceDetails.issueDate} onChange={handleDetailsChange} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"/>
          </div>
          <div>
            <label htmlFor="dueDate">Due Date</label>
            <input type="date" id="dueDate" name="dueDate" value={invoiceDetails.dueDate} onChange={handleDetailsChange} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"/>
          </div>
        </div>
      </div>

      {/* --- Section 2: Items Table --- */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-xl font-semibold">Items</h2>
          <Button type="button" onClick={addItem}>Add Item</Button>
        </div>
        {items.map((item, index) => (
          <div key={index} className="grid grid-cols-12 gap-2 mb-2 items-center">
            <input type="text" placeholder="Description" value={item.description} onChange={(e) => handleItemChange(index, 'description', e.target.value)} className="col-span-6 border p-2 rounded-md"/>
            <input type="number" placeholder="Qty" value={item.quantity} onChange={(e) => handleItemChange(index, 'quantity', e.target.value)} className="col-span-2 border p-2 rounded-md"/>
            <input type="number" placeholder="Price" value={item.unitPrice} onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)} className="col-span-2 border p-2 rounded-md"/>
            <span className="col-span-1 text-right">{item.total.toFixed(2)}</span>
            <button type="button" onClick={() => removeItem(index)} disabled={items.length <= 1} className="col-span-1 text-red-500 disabled:opacity-50 text-2xl">&times;</button>
          </div>
        ))}
      </div>

      {/* --- Section 3: Notes & Totals --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t pt-6">
        <div>
          <label htmlFor="notes">Notes</label>
          <textarea id="notes" name="notes" rows={3} value={invoiceDetails.notes} onChange={handleDetailsChange} placeholder="Additional notes or terms" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"/>
        </div>
        <div className="space-y-2 flex flex-col items-end">
            <div className="flex justify-between w-full max-w-sm">
                <span>Subtotal:</span>
                <span className="font-semibold">{subTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center w-full max-w-sm">
                <span>Tax (%):</span>
                <input type="number" name="taxRate" value={invoiceDetails.taxRate} onChange={handleDetailsChange} className="w-20 border p-1 rounded-md text-right"/>
            </div>
            <div className="flex justify-between w-full max-w-sm">
                <span>Total Tax:</span>
                <span className="font-semibold">{totalTax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between w-full max-w-sm text-xl font-bold border-t pt-2 mt-2">
                <span>Total:</span>
                <span>{totalAmount.toFixed(2)}</span>
            </div>
        </div>
      </div>
      
      {/* --- Submit Button --- */}
      <div className="flex justify-end pt-4">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : 'Save Invoice'}
        </Button>
      </div>
    </form>
  );
}