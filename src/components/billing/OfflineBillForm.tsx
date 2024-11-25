// src/components/billing/OfflineBillForm.tsx

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ProductSelect } from './ProductTable';
import { BillPreview } from './BillPreview';
import type { BillItem } from '@/types/billing';
import { Select } from '@/components/ui/Select';

interface CustomerInfo {
  name: string;
  phone: string;
}

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'upi', label: 'UPI' },
];

export default function OfflineBillForm() {
  const router = useRouter();
  const [customer, setCustomer] = useState<CustomerInfo>({
    name: '',
    phone: ''
  });
  const [items, setItems] = useState<BillItem[]>([]);
  const [paymentDetails, setPaymentDetails] = useState({
    method: 'cash',
    amountPaid: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddItem = (item: BillItem) => {
    setItems(prev => {
      const existingItem = prev.find(i => i.productId === item.productId);
      if (existingItem) {
        return prev.map(i => 
          i.productId === item.productId
            ? { ...i, quantity: i.quantity + item.quantity, total: (i.quantity + item.quantity) * i.price }
            : i
        );
      }
      return [...prev, item];
    });
  };

  const handleQuantityChange = (productId: number, quantity: number) => {
    setItems(prev =>
      prev.map(item =>
        item.productId === productId
          ? { ...item, quantity, total: quantity * item.price }
          : item
      )
    );
  };

  const handleRemoveItem = (productId: number) => {
    setItems(prev => prev.filter(item => item.productId !== productId));
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + item.total, 0);
  };

  const calculateBalance = () => {
    const total = calculateTotal();
    const paid = parseFloat(paymentDetails.amountPaid) || 0;
    return total - paid;
  };

  const handleSubmit = async () => {
    if (!customer.name || !customer.phone) {
      setError('Please enter customer details');
      return;
    }

    if (items.length === 0) {
      setError('Please add at least one item');
      return;
    }

    if (!paymentDetails.amountPaid) {
      setError('Please enter amount paid');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/billing/offline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer,
          items,
          paymentDetails: {
            ...paymentDetails,
            amountPaid: parseFloat(paymentDetails.amountPaid)
          },
          billingMode: 'offline',
          total: calculateTotal()
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message);
      }

      router.push(`/dashboard`);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create bill');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white shadow-sm rounded-lg p-6">
        <h2 className="text-lg font-medium mb-4">Customer Details</h2>
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Customer Name"
            value={customer.name}
            onChange={(e) => setCustomer(prev => ({ ...prev, name: e.target.value }))}
            required
          />
          <Input
            label="Phone Number"
            value={customer.phone}
            onChange={(e) => setCustomer(prev => ({ ...prev, phone: e.target.value }))}
            pattern="[0-9]{10}"
            required
          />
        </div>
      </div>

      <div className="bg-white shadow-sm rounded-lg p-6">
        <h2 className="text-lg font-medium mb-4">Add Products</h2>
        <ProductSelect onAdd={handleAddItem} />

        {items.length > 0 && (
          <div className="mt-4">
            <BillPreview
              items={items}
              onQuantityChange={handleQuantityChange}
              onRemoveItem={handleRemoveItem}
            />
          </div>
        )}
      </div>

      <div className="bg-white shadow-sm rounded-lg p-6">
        <h2 className="text-lg font-medium mb-4">Payment Details</h2>
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Payment Method"
            value={paymentDetails.method}
            onChange={(e) => setPaymentDetails(prev => ({ ...prev, method: e.target.value }))}
            options={PAYMENT_METHODS}
          />
          <Input
            label="Amount Paid"
            type="number"
            value={paymentDetails.amountPaid}
            onChange={(e) => setPaymentDetails(prev => ({ ...prev, amountPaid: e.target.value }))}
            min="0"
            step="0.01"
            required
          />
        </div>

        <div className="mt-4 text-right">
          <p className="text-lg">
            Total: ₹{calculateTotal().toFixed(2)}
          </p>
          <p className="text-lg text-gray-600">
            Balance: ₹{calculateBalance().toFixed(2)}
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-500 p-4 rounded-md">
          {error}
        </div>
      )}

      <div className="flex justify-end space-x-4">
        <Button
          variant="secondary"
          onClick={() => router.back()}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          isLoading={isLoading}
          disabled={!customer.name || !customer.phone || items.length === 0}
        >
          Create Bill
        </Button>
      </div>
    </div>
  );
}