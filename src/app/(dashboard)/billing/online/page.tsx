'use client';

import React, { useState, useRef } from 'react';
import { CustomerForm } from '@/components/billing/CustomerSearch';
import { ProductTable } from '@/components/billing/ProductTable';
import { Button } from '@/components/ui/Button';
import type { CustomerDetails, BillItem } from '@/types/billing';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';

export default function OnlineBillPage() {
  const router = useRouter();
  const [customer, setCustomer] = useState<CustomerDetails | null>(null);
  const [items, setItems] = useState<BillItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState<string>('');
  
  const customerFormRef = useRef<{ resetForm: () => void }>(null);
  const productTableRef = useRef<{ 
    resetTable: () => void;
    focusFirstProductInput: () => void;
  }>(null);

  const resetForm = async () => {
    setCustomer(null);
    setItems([]);
    setNotes('');
    setError(null);
    
    if (customerFormRef.current) {
      customerFormRef.current.resetForm();
    }
    if (productTableRef.current) {
      productTableRef.current.resetTable();
    }
  };

  const handleSubmit = async () => {
    if (!customer) {
      setError('Please enter customer details.');
      toast.error('Please enter customer details.');
      return;
    }

    if (items.length === 0) {
      setError('Please add at least one item.');
      toast.error('Please add at least one item.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let customerId = customer.id;

      if (!customer.id) {
        const createCustomerResponse = await fetch('/api/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(customer),
        });

        const createCustomerData = await createCustomerResponse.json();

        if (!createCustomerResponse.ok) {
          throw new Error(createCustomerData.message || 'Failed to create customer');
        }

        customerId = createCustomerData.id;
      }

      const response = await fetch('/api/billing/online', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          items,
          billingMode: 'online',
          notes: notes.trim() || null
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.details || 'Failed to create bill');
      }

      await resetForm();
      toast.success('Bill created successfully');
      router.refresh();

    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create bill');
      toast.error(error instanceof Error ? error.message : 'Failed to create bill');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-4">
      <div className="bg-white shadow-sm rounded-lg p-6">
        <h2 className="text-lg font-medium mb-4">Customer Details</h2>
        <CustomerForm 
          ref={customerFormRef}
          onCustomerChange={setCustomer}
          onExistingCustomer={() => {
            setTimeout(() => {
              productTableRef.current?.focusFirstProductInput();
            }, 100);
          }}
        />
      </div>

      <div className="bg-white shadow-sm rounded-lg p-6">
        <h2 className="text-lg font-medium mb-4">Add Products</h2>
        <ProductTable 
          ref={productTableRef}
          onChange={setItems}
          onCreateBill={handleSubmit} 
        />
      </div>

      <div className="bg-white shadow-sm rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-lg font-medium">Notes</h2>
          <span className="text-sm text-gray-500">(Optional)</span>
        </div>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add any additional notes here..."
          className="w-full min-h-[100px] p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>

      <div className="flex justify-end space-x-4">
        <Button
          variant="secondary"
          onClick={() => router.back()}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          isLoading={isLoading}
          disabled={!customer || items.length === 0 || isLoading}
        >
          {isLoading ? 'Creating Bill...' : 'Create Bill'}
        </Button>
      </div>
    </div>
  );
}