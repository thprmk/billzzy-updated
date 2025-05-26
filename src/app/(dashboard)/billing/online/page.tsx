'use client';

import React, { useState, useEffect, useRef } from 'react';
import { CustomerForm } from '@/components/billing/CustomerSearch';
import { ProductTable } from '@/components/billing/ProductTable';
import { Button } from '@/components/ui/Button';
import type { CustomerDetails, BillItem } from '@/types/billing';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import { Select } from '@/components/ui/Select';
import { MandateModal } from '@/components/mandate/MandateModal';

interface ShippingMethod {
  id: number;
  name: string;
  type: 'FREE_SHIPPING' | 'COURIER_PARTNER';
  minAmount?: number;
  useWeight: boolean;
  ratePerKg?: number;
  fixedRate?: number;
  isActive: boolean;
}

function calculateTotalWeight(items: BillItem[]): number {
  return items.reduce((sum, item) => sum + (item.productWeight || 0) * item.quantity, 0);
}

export default function OnlineBillPage() {
  const router = useRouter();
  const [customer, setCustomer] = useState<CustomerDetails | null>(null);
  const [items, setItems] = useState<BillItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState<string>('');
  const [shippingMethods, setShippingMethods] = useState<ShippingMethod[]>([]);
  const [selectedShippingId, setSelectedShippingId] = useState<number | null>(null);
  const [shippingCost, setShippingCost] = useState<number>(0);
  const [limitReached, setLimitReached] = useState(false);
  const [nextResetDate, setNextResetDate] = useState<string | null>(null);
  const customerFormRef = useRef<{ resetForm: () => void }>(null);
  const productTableRef = useRef<{ 
    resetTable: () => void;
    focusFirstProductInput: () => void;
  }>(null);

  const [showModal, setShowModal] = useState(false);

  const handleUpgradeClick = () => {
    setShowModal(true); // show the UPI ID popup
  };

  const handleClose = () => {
    setShowModal(false);
  };

  useEffect(() => {
    fetchShippingMethods();
  }, []);

  useEffect(() => {
    calculateShipping();
  }, [selectedShippingId, items, shippingMethods]);

  // Automatically select free shipping if conditions are met
  useEffect(() => {
    if (shippingMethods.length === 0 || items.length === 0) return;

    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const freeShippingMethod = shippingMethods.find(m => m.type === 'FREE_SHIPPING');
    if (freeShippingMethod) {
      // If there's a minAmount, check it
      if (freeShippingMethod.minAmount && subtotal >= freeShippingMethod.minAmount) {
        // Automatically select free shipping method
        setSelectedShippingId(freeShippingMethod.id);
      } else if (!freeShippingMethod.minAmount) {
        // If no minAmount required, always select free shipping
        setSelectedShippingId(freeShippingMethod.id);
      }
    }
  }, [items, shippingMethods]);

  const fetchShippingMethods = async () => {
    try {
      const res = await fetch('/api/settings/shipping/methods');
      if (!res.ok) throw new Error('Failed to fetch shipping methods');
      const data = await res.json();
      setShippingMethods(data.filter((m: ShippingMethod) => m.isActive));
    } catch (err) {
      console.error(err);
      toast.error('Failed to fetch shipping methods');
    }
  };

  const calculateShipping = () => {
    // If no shipping methods or no items, shipping cost = 0
    if (shippingMethods.length === 0 || items.length === 0) {
      setShippingCost(0);
      return;
    }

    if (!selectedShippingId) {
      setShippingCost(0);
      return;
    }

    const method = shippingMethods.find((m) => m.id === selectedShippingId);
    if (!method) {
      setShippingCost(0);
      return;
    }

    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    let cost = 0;

    if (method.type === 'FREE_SHIPPING') {
      // If minAmount is required, check if we meet it. If not met, cost=0 but show message.
      cost = 0;
    } else if (method.type === 'COURIER_PARTNER') {
      if (method.useWeight && method.ratePerKg) {
        const totalWeight = calculateTotalWeight(items);
        cost = totalWeight * method.ratePerKg;
      } else {
        cost = method.fixedRate || 0;
      }
    }

    setShippingCost(cost);
  };

  const resetForm = async () => {
    setCustomer(null);
    setItems([]);
    setNotes('');
    setError(null);
    setSelectedShippingId(null);
    setShippingCost(0);
    
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
  
    if (shippingMethods.length > 0 && !selectedShippingId) {
      setError('Please select a shipping method.');
      toast.error('Please select a shipping method.');
      return;
    }
  
    setIsLoading(true);
    setError(null);
  
    try {
      let customerId = customer.id;
  
      if (customer.id) {
        // 1) Existing customer -> Update
        const updateCustomerResponse = await fetch(`/api/customers/${customer.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(customer),
        });
        
        if (!updateCustomerResponse.ok) {
          const errData = await updateCustomerResponse.json();
          throw new Error(errData.message || 'Failed to update customer');
        }
  
        // Keep the same ID after update
        customerId = customer.id;
      } else {
        // 2) New customer -> Create
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
  
      // 3) Create the online bill
      const response = await fetch('/api/billing/online', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          items,
          billingMode: 'online',
          notes: notes.trim() || null,
          shippingMethodId: shippingMethods.length === 0 ? null : selectedShippingId,
        }),
      });
  
      const data = await response.json();
  
      if (response.status === 403) {
        setLimitReached(true);
        setNextResetDate(data.nextResetDate);
        setIsLoading(false);
        return;
      }
  
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
  
  

  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const totalAmount = subtotal + shippingCost;

  // Check if there's a free shipping method with a minAmount
  const freeShippingMethod = shippingMethods.find(m => m.type === 'FREE_SHIPPING' && m.minAmount);
  const showMinAmountMessage = freeShippingMethod && subtotal < freeShippingMethod.minAmount;

  return (
    <div className="space-y-6 md:p-4 p-0 ">

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
        <h2 className="text-lg font-medium mb-4">Shipping Method</h2>
        {shippingMethods.length === 0 ? (
          <div className="text-gray-700 mb-4">
            No shipping methods found. If no shipping is needed, shipping cost = ₹0 by default.
          </div>
        ) : (
          <>
            <Select
              label="Selected Shipping Method"
              value={selectedShippingId?.toString() || ''}
              onChange={(e) => setSelectedShippingId(e.target.value ? parseInt(e.target.value) : null)}
            >
              <option value="">--Select a method--</option>
              {shippingMethods.map((method) => (
                <option key={method.id} value={method.id}>
                  {method.name}
                </option>
              ))}
            </Select>
            {showMinAmountMessage && (
              <p className="text-red-600 mt-2 text-[12px]">
                Your order hasn't reached the minimum amount (₹{freeShippingMethod!.minAmount}) for free shipping. 
                Please select a courier partner method or add more items.
              </p>
            )}
          </>
        )}
        
        <div className="mt-4 space-y-1">
          <p>Subtotal: ₹{subtotal.toFixed(2)}</p>
          <p>Shipping: ₹{shippingCost.toFixed(2)}</p>
          <p className="font-bold">Total: ₹{totalAmount.toFixed(2)}</p>
        </div>
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
      {limitReached && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4 text-red-700">
          <p className="font-bold">Monthly Limit Reached</p>
          <p>You have reached the free limit of 50 orders this month.</p>
          {nextResetDate && (
            <p>
              Your next cycle resets on: <strong>{new Date(nextResetDate).toLocaleDateString()}</strong>
            </p>
          )}
      <button
        onClick={handleUpgradeClick}
        className="mt-2 inline-flex items-center px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
      >
        Upgrade to Pro
      </button>

      {/* The popup for user to enter their UPI ID */}
      <MandateModal isOpen={showModal} onClose={handleClose} />
        </div>
      )}
    </div>
  );
}
