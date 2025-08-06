'use client';

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

export interface CustomerSuggestion {
  id: number;
  phone: string;
  name: string;
}

// pages/billing/offline.tsx
import React from 'react';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useDebounce } from '@/hooks/useDebounce';
import { ProductTable, ProductTableRef } from '@/components/billing/ProductTable';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';

import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'upi', label: 'UPI' },
];

const initialCustomerState: CustomerDetails = {
  name: '',
  phone: '',
};

const initialPaymentState: PaymentDetails = {
  method: 'cash',
  amountPaid: '',
};

export default function OfflineBillingPage() {
  const router = useRouter();
  const [items, setItems] = useState<BillItem[]>([]);
  const [customerDetails, setCustomerDetails] = useState<CustomerDetails>(initialCustomerState);
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails>(initialPaymentState);
  const [suggestions, setSuggestions] = useState<CustomerSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState<string>('');
  const [autoDownloadEnabled, setAutoDownloadEnabled] = useState(true); // New state for auto-download toggle

  const productTableRef = useRef<ProductTableRef>(null);
  const debouncedPhone = useDebounce(customerDetails.phone, 300);

  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Add this keyboard handler function
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!suggestions.length) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : 0);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && suggestions[selectedIndex]) {
          handleCustomerSelect(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
  };

  useEffect(() => {
    const fetchCustomerSuggestions = async () => {
      if (debouncedPhone.length < 2) {
        setSuggestions([]);
        return;
      }

      try {
        const response = await fetch(`/api/customers/search?q=${debouncedPhone}`);
        if (!response.ok) {
          throw new Error('Failed to fetch suggestions');
        }

        const data = await response.json();
        setSuggestions(data);
        setShowSuggestions(true);
      } catch (error) {
        console.error('Failed to fetch suggestions:', error);
        toast.error('Failed to fetch customer suggestions');
      }
    };

    fetchCustomerSuggestions();
  }, [debouncedPhone, customerDetails.phone]);

  const handleCustomerSelect = (customer: CustomerSuggestion) => {
    setCustomerDetails({
      id: customer.id,
      phone: customer.phone,
      name: customer.name
    });
    setShowSuggestions(false);

    setTimeout(() => {
      productTableRef.current?.focusFirstProductInput();
    }, 100);
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + item.total, 0);
  };

  const calculateBalance = () => {
    const total = calculateTotal();
    const amountPaid = parseFloat(paymentDetails.amountPaid) || 0;
    return Math.max(0, amountPaid - total);
  };

  const handleSubmit = async () => {
    if (items.length === 0) {
      toast.error('Please add at least one item');
      return;
    }

    if (!customerDetails.name || !customerDetails.phone) {
      toast.error('Please enter customer details');
      return;
    }

    if (!paymentDetails.amountPaid) {
      toast.error('Please enter amount paid');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/billing/offline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items,
          customerDetails,
          paymentDetails: {
            ...paymentDetails,
            amountPaid: parseFloat(paymentDetails.amountPaid),
          },
          total: calculateTotal(),
          notes: notes.trim() || null
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to create bill');
      }

      toast.success('Bill created successfully');

      // Reset form
      setCustomerDetails(initialCustomerState);
      setPaymentDetails(initialPaymentState);
      setItems([]);
      setNotes('');
      productTableRef.current?.resetTable();

      if (result.data && result.data.billNo) {
        // Create ONE object with all the parts needed for printing.
               // Fetch organisation details FIRST and check for success.
                      // Fetch organisation details FIRST and check for success.
        const orgResponse = await fetch('/api/organisation');
        if (!orgResponse.ok) {
          toast.error("Could not fetch shop details for printing.");
          throw new Error('Failed to fetch organisation details.');
        }
        const orgResult = await orgResponse.json();

        // --- THIS IS THE FINAL FIX ---
        // We now correctly access the nested 'organisation' object
        const organisationDetailsForPrint = orgResult.organisation;

        // Check the nested object for the shopName
        if (!organisationDetailsForPrint || !organisationDetailsForPrint.shopName) {
            toast.error("Shop details are invalid or missing from API response.");
            throw new Error("Invalid organisation data structure.");
        }
        
        // Now, build the object for printing with the CORRECT, unwrapped details
        const billDataForPrinting = {
          billNo: result.data.billNo,
          date: new Date().toISOString(),
          totalPrice: calculateTotal(),
          organisation: organisationDetailsForPrint, // Use the correct, nested object
          customer: customerDetails,
          items: items,
          paymentDetails: paymentDetails
        };

        if (autoDownloadEnabled) {
          await handleDownloadBill(billDataForPrinting);
        } else {
          handlePrintBill(billDataForPrinting);
        }
      }

      router.refresh();

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create bill';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const generateBillContent = (billData: any) => {

    const { organisation, customer, items, billNo, date, totalPrice, paymentDetails } = billData;

    if (!organisation) {
      throw new Error('Organisation details missing');
    }

    const totalQuantity = items.reduce(
      (sum: number, item: any) => sum + item.quantity,
      0
    );

    const formattedDate = new Date(date).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const amountPaid = parseFloat(paymentDetails.amountPaid);
    const balance = totalPrice - (parseFloat(paymentDetails.amountPaid) || 0);

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Bill #${billNo}</title>
        <style>
          @media print {
            @page { margin: 10mm; }
            body { margin: 0; }
          }
          body { 
            font-family: Arial, sans-serif;
            font-size: 12px;
            line-height: 1.4;
          }
          .container { 
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            text-align: center;
            margin-bottom: 20px;
          }
          .shop-name {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 5px;
          }
          .address {
            margin-bottom: 15px;
          }
          .bill-info {
            display: flex;
            justify-content: space-between;
            margin-bottom: 20px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
          }
          th {
            background-color: #f8f8f8;
          }
          .totals {
            display:flex; 
            justify-content:space-between;
          }
          .footer {
            text-align: center;
            margin-top: 15px;
          }
          .t1,.t2{
            margin:0;
            padding:0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="shop-name">${organisation.shopName}</div>
            <div class="address">
              ${organisation.flatNo}, ${organisation.street}<br>
              ${organisation.district}, ${organisation.state} - ${organisation.pincode}<br>
              Phone: ${organisation.phone}
              ${organisation.websiteAddress ? `<br>Website: ${organisation.websiteAddress}` : ''}
            </div>
          </div>

          <div class="bill-info">
            <div>
              <strong>Bill No:</strong> ${billNo}<br>
               <strong>Date:</strong> ${formattedDate}
            </div>
            <div>
              <strong>Customer:</strong> ${customer.name}<br>
              <strong>Phone:</strong> ${customer.phone}
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Qty</th>
                <th>Price</th>
                <th>Total</th>
              </tr>
            </thead>
                      <tbody>
              ${items.map((item: any) => `
                <tr>
                  <td>${item.name || 'N/A'}</td>
                  <td>${item.quantity}</td>
                  <td>₹${(item.price || 0).toFixed(2)}</td>
                  <td>₹${(item.total || 0).toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="3" style="text-align: right; font-weight: bold;">Grand Total</td>
                <td><strong>₹${totalPrice?.toFixed(2) ?? '0.00'}</strong></td>
              </tr>
            </tfoot>
          </table>

          <div class="bill-info">
            <div>
              <strong>Total Quantity:</strong> ${totalQuantity}<br>
               <strong>Payment Method:</strong> ${paymentDetails.method}
            </div>
            <div>
              <strong>Amount Paid:</strong> ₹${amountPaid.toFixed(2)}<br>
              <strong>Balance:</strong> ₹${balance.toFixed(2)}
            </div>
          </div>

          <div class="footer">
            <p>We value your trust in choosing our products!</p>
          </div>
        </div>
      </body>
      </html>
    `;
  };

  // New function to handle bill download
  const handleDownloadBill = async (billData: any) => {
    try {
      // Pass the single object directly to the generator
      const billContent = generateBillContent(billData);
      
      const blob = new Blob([billContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `Bill_${billData.billNo}_${billData.customer.name.replace(/\s+/g, '_')}.html`;
      document.body.appendChild(link);
      link.click();
      
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success('Bill downloaded successfully');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download bill');
    }
  };

  const handlePrintBill = (billData: any) => {
    try {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        throw new Error('Failed to open print window');
      }
      // Pass the single object directly to the generator
      const billContent = generateBillContent(billData);
      printWindow.document.write(billContent);
      printWindow.document.close();

      printWindow.onload = () => {
        setTimeout(() => {
          try {
            printWindow.print();
            printWindow.close();
          } catch (error) {
            console.error('Print error:', error);
            toast.error('Failed to print bill');
          }
        }, 500);
      };
    } catch (error) {
      console.error('Bill generation error:', error);
      toast.error('Failed to generate bill');
    }
  };

  return (
    <div className="space-y-6 md:mt-6">
      <div className="bg-white shadow-sm rounded-lg p-6">
        <h2 className="text-lg font-medium mb-4">Customer Details</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="relative">
            <Input
              label="Phone Number"
              value={customerDetails.phone}
              onChange={(e) => {
                setCustomerDetails(prev => ({
                  ...prev,
                  phone: e.target.value,
                }));
                setShowSuggestions(true);
                setSelectedIndex(-1);
              }}
              onKeyDown={handleKeyDown}
              pattern="[0-9]{10}"
              required
              placeholder="Enter phone number"
            />
            {showSuggestions && customerDetails.phone.length < 10 && suggestions.length > 0 && (
              <div
                ref={suggestionsRef}
                className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto"
              >
                {suggestions.map((suggestion, index) => (
                  <div
                    key={suggestion.id} 
                    className={`p-2 cursor-pointer ${index === selectedIndex
                        ? 'bg-indigo-100'
                        : 'hover:bg-gray-100'
                      }`}
                    onClick={() => handleCustomerSelect(suggestion)}
                  >
                    <div className="flex justify-between">
                      <span>{suggestion.phone}</span>
                      <span>{suggestion.name}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <Input
            label="Customer Name"
            value={customerDetails.name}
            onChange={(e) => setCustomerDetails(prev => ({
              ...prev,
              name: e.target.value,
            }))}
            required
            placeholder="Enter customer name"
          />
        </div>
      </div>

      <div className="bg-white shadow-sm rounded-lg p-6">
        <h2 className="text-lg font-medium mb-4">Add Products</h2>
        <ProductTable
          ref={productTableRef}
          onChange={setItems}
        />
      </div>

      <div className="bg-white shadow-sm rounded-lg p-6">
        <h2 className="text-lg font-medium mb-4">Payment Details</h2>
        <div className="grid grid-cols-2 gap-4">

<div>
  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
  <Select
    value={paymentDetails.method}
    onValueChange={(value) => setPaymentDetails(prev => ({ ...prev, method: value }))}
  >
    <SelectTrigger className="w-full">
      <SelectValue placeholder="Select a method" />
    </SelectTrigger>
    <SelectContent>
      {PAYMENT_METHODS.map(method => (
        <SelectItem key={method.value} value={method.value}>
          {method.label}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>
          <Input
            label="Amount Paid"
            type="number"
            value={paymentDetails.amountPaid}
            onChange={(e) => setPaymentDetails(prev => ({
              ...prev,
              amountPaid: e.target.value,
            }))}
            min="0"
            step="0.01"
            required
          />
        </div>

        <div className="mt-4 text-right">
          <p className="text-lg">Total: ₹{calculateTotal().toFixed(2)}</p>
          <p className="text-lg text-gray-600">Balance: ₹{calculateBalance().toFixed(2)}</p>
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

      {/* New Auto-download toggle section */}
      <div className="bg-white shadow-sm rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium">Bill Options</h2>
            <p className="text-sm text-gray-500">Choose how to handle the bill after creation.</p>
          </div>
          
          <div className="flex items-center space-x-3">
            <span className="text-sm font-medium text-gray-700">
              {autoDownloadEnabled ? 'Auto Download' : 'Print Only'}
            </span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={autoDownloadEnabled}
                onChange={(e) => setAutoDownloadEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-2 peer-focus:ring-indigo-300 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>
          
        </div>
      </div>
      {error && (
        <div className="bg-red-50 text-red-500 p-4 rounded-md">{error}</div>
      )}

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
          disabled={items.length === 0 || isLoading}
        >
          {isLoading ? 'Creating Bill...' : 'Create Bill'}
        </Button>
      </div>
    </div>
  );
}