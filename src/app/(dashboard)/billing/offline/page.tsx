// src/app/billing/offline/page.tsx
'use client';

import React, { useState, useEffect, useRef, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// --- Import UI components ---
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import { ProductTable, ProductTableRef } from '@/components/billing/ProductTable';

// --- Define necessary interfaces ---
export interface CustomerDetails {
  id?: number;
  name: string;
  phone: string;
}

export interface BillItem {
  productId: number | null;
  productVariantId: number | null;
  name?: string;
  SKU?: string;
  quantity: number;
  price: number;
  total: number;
}

export interface PaymentDetails {
  method: string;
  amountPaid: string;
}

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'upi', label: 'UPI' },
];

export default function OfflineBillingPage() {
  const router = useRouter();

  // --- Initialize all required states ---
  const [items, setItems] = useState<BillItem[]>([]);
  const [customerDetails, setCustomerDetails] = useState<CustomerDetails>({ name: '', phone: '' });
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails>({ method: 'cash', amountPaid: '' });
  const [notes, setNotes] = useState<string>('');
  const [isWaitingForCustomerScan, setIsWaitingForCustomerScan] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingRecentCustomer, setIsLoadingRecentCustomer] = useState(false);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const productTableRef = useRef<ProductTableRef>(null);

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  const stopPolling = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    if (isWaitingForCustomerScan) {
      setIsWaitingForCustomerScan(false);
    }
  };

  // Function to get recent customer data
  const fetchRecentCustomer = async () => {
    setIsLoadingRecentCustomer(true);
    try {
      const response = await fetch('/api/billing/get-recent-customer');
      const result = await response.json();
      
      if (result.success && result.data?.customer) {
        const { name, phone } = result.data.customer;
        setCustomerDetails({ name, phone });
        toast.success(`Recent customer loaded: ${name} (${phone})`);
      } else {
        toast.info('No recent customer found');
      }
    } catch (error) {
      console.error('Failed to fetch recent customer:', error);
      toast.error('Failed to fetch recent customer data');
    } finally {
      setIsLoadingRecentCustomer(false);
    }
  };

  const startPollingForCustomer = () => {
    stopPolling();
    setIsWaitingForCustomerScan(true);
    
    pollIntervalRef.current = setInterval(async () => {
      try {
        const response = await fetch('/api/billing/get-last-customer-scan');
        if (!response.ok) {
          console.error('Polling failed with status:', response.status);
          return;
        }
        const result = await response.json();
        
        if (result.success && result.data?.customer) {
          stopPolling();
          const { name, phone } = result.data.customer;
          
          // Update customer details in the form
          setCustomerDetails({ name, phone });
          setIsWaitingForCustomerScan(false);
          
          toast.success(`Customer details fetched via QR: ${name} (${phone})`);
        }
      } catch (error) {
        console.error('Polling request error:', error);
      }
    }, 3000); // Poll every 3 seconds
  };

  const handleScanQRClick = () => {
    // Clear existing customer details
    setCustomerDetails({ name: '', phone: '' });
    startPollingForCustomer();
  };

  const handleCancelFetch = () => {
    stopPolling();
    toast.info('Customer scan cancelled');
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + item.total, 0);
  };
  
  // Stop polling if user types in the input fields
  const handleCustomerInputChange = (field: keyof CustomerDetails, value: string) => {
    if (isWaitingForCustomerScan) {
      stopPolling();
      toast.info('QR scan cancelled - manual entry detected');
    }
    setCustomerDetails(prev => ({ ...prev, [field]: value }));
  };

  const handleFinalSubmit = async () => {
    if (items.length === 0) {
      toast.error('Please add at least one item');
      return;
    }
    const amount = parseFloat(paymentDetails.amountPaid);
    if (isNaN(amount) || amount < 0) {
      toast.error('Please enter a valid amount paid');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/billing/offline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items,
          customerDetails,
          paymentDetails: { ...paymentDetails, amountPaid: amount },
          total: calculateTotal(),
          notes: notes.trim() || null,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to create bill');
      }

      toast.success('Bill created successfully! WhatsApp message sent to customer.');

      // Reset form
      setItems([]);
      setCustomerDetails({ name: '', phone: '' });
      setPaymentDetails({ method: 'cash', amountPaid: '' });
      setNotes('');
      productTableRef.current?.resetTable();

    } catch (error: any) {
      toast.error(error.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isWaitingForCustomerScan) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 bg-white shadow-lg rounded-lg text-center max-w-md mx-auto mt-10">
        <div className="animate-spin h-12 w-12 border-4 border-indigo-600 border-t-transparent rounded-full mb-6"></div>
        
        <h2 className="text-2xl font-bold mb-4 text-gray-800">Waiting for QR Scan</h2>
        
        <div className="bg-blue-50 p-4 rounded-lg mb-6">
          <p className="text-gray-700 mb-3">Ask customer to:</p>
          <ol className="text-left text-sm text-gray-600 space-y-1">
            <li>1. Scan the QR code</li>
            <li>2. Send "Magic Bill" to your WhatsApp Business number</li>
          </ol>
        </div>
        
        <div className="flex space-x-3">
          <Button onClick={handleCancelFetch} variant="secondary">
            Cancel Scan
          </Button>
        </div>
        
        <p className="text-xs text-gray-500 mt-4">
          Customer details will appear automatically once scanned
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 md:mt-6">
      {/* Customer Details */}
      <div className="bg-white shadow-sm rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium">Customer Details (Optional)</h2>
          <div className="flex space-x-2">
            <Button 
              onClick={fetchRecentCustomer}
              variant="outline"
              disabled={isLoading || isLoadingRecentCustomer || isWaitingForCustomerScan}
              isLoading={isLoadingRecentCustomer}
            >
              {isLoadingRecentCustomer ? 'Loading...' : 'Load Recent Customer'}
            </Button>
            <Button 
              onClick={handleScanQRClick}
              variant="outline"
              disabled={isLoading || isLoadingRecentCustomer}
            >
              Scan QR for Customer
            </Button>
          </div>
        </div>
        
        {/* Show status if customer details were fetched */}
        {customerDetails.phone && customerDetails.name && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-700">
              Customer details loaded: {customerDetails.name} ({customerDetails.phone})
            </p>
          </div>
        )}
        
        <div className="grid md:grid-cols-2 gap-4">
          <Input 
            label="Phone Number" 
            value={customerDetails.phone} 
            onChange={(e) => handleCustomerInputChange('phone', e.target.value)} 
            placeholder={isWaitingForCustomerScan ? "Waiting for QR scan..." : "Enter phone number or scan QR"}
            disabled={isWaitingForCustomerScan}
          />
          <Input 
            label="Customer Name" 
            value={customerDetails.name} 
            onChange={(e) => handleCustomerInputChange('name', e.target.value)} 
            placeholder={isWaitingForCustomerScan ? "Waiting for QR scan..." : "Enter customer name or scan QR"}
            disabled={isWaitingForCustomerScan}
          />
        </div>
      </div>

      {/* Add Products */}
      <div className="bg-white shadow-sm rounded-lg p-6">
        <h2 className="text-lg font-medium mb-4">Add Products</h2>
        <ProductTable ref={productTableRef} onChange={setItems} />
      </div>

      {/* Payment Details */}
      <div className="bg-white shadow-sm rounded-lg p-6">
        <h2 className="text-lg font-medium mb-4">Payment Details</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
            <Select 
              value={paymentDetails.method} 
              onValueChange={(value) => setPaymentDetails(prev => ({ ...prev, method: value }))}
            >
              <SelectTrigger><SelectValue placeholder="Select a method" /></SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map(m => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
        
        <div className="mt-4">
          <Input 
            label="Notes (Optional)" 
            value={notes} 
            onChange={(e) => setNotes(e.target.value)} 
            placeholder="Add any additional notes..."
          />
        </div>
        
        <div className="mt-4 text-right">
          <p className="text-lg font-semibold">Total: ₹{calculateTotal().toFixed(2)}</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-4">
        <Button 
          variant="secondary" 
          onClick={() => router.back()} 
          disabled={isLoading || isWaitingForCustomerScan}
        >
          Cancel Bill
        </Button>
        <Button 
          onClick={handleFinalSubmit} 
          isLoading={isLoading} 
          disabled={isWaitingForCustomerScan || items.length === 0 || isLoading}
        >
          {isLoading ? 'Creating...' : 'Create Final Bill'}
        </Button>
      </div>
    </div>
  );
}