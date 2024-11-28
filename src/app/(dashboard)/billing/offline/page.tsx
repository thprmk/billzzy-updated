'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ProductTable } from '@/components/billing/ProductTable';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import React from "react";

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'upi', label: 'UPI' },
];

interface BillItem {
  productId: number;
  quantity: number;
  total: number;
}

export default function OfflineBillingPage() {
  const router = useRouter();
  const [items, setItems] = useState<BillItem[]>([]);
  const [customerDetails, setCustomerDetails] = useState({
    name: '',
    phone: '',
  });
  const [paymentDetails, setPaymentDetails] = useState({
    method: 'cash',
    amountPaid: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + item.total, 0);
  };

  const calculateBalance = () => {
    const total = calculateTotal();
    const amountPaid = parseFloat(paymentDetails.amountPaid) || 0;
    return Math.max(0, amountPaid - total);
  };

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const generateBillContent = (billData: any) => {
    const { organisation, customer, items, billNo, date, totalPrice } = billData;
    
    if (!organisation) {
      throw new Error('Organisation details missing');
    }

    const totalQuantity = items.reduce(
      (sum: number, item: any) => sum + item.quantity,
      0
    );

    const formattedDateTime = formatDateTime(date);
    const amountPaid = parseFloat(paymentDetails.amountPaid);
    const balance = calculateBalance();

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
            margin-bottom: 20px;
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
            text-align: right;
            margin-bottom: 20px;
          }
          .footer {
            text-align: center;
            margin-top: 30px;
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
              <strong>Date:</strong> ${formattedDateTime}
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
                  <td>${item.product.name}</td>
                  <td>${item.quantity}</td>
                  <td>₹${item.product.sellingPrice.toFixed(2)}</td>
                  <td>₹${item.totalPrice.toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="totals">
            <p><strong>Total Quantity:</strong> ${totalQuantity}</p>
            <p><strong>Total Amount:</strong> ₹${totalPrice.toFixed(2)}</p>
            <p><strong>Amount Paid:</strong> ₹${amountPaid.toFixed(2)}</p>
            <p><strong>Balance:</strong> ₹${balance.toFixed(2)}</p>
          </div>

          <div class="footer">
            <p>Thank you for your business!</p>
          </div>
        </div>
      </body>
      </html>
    `;
  };

  const handlePrintBill = (billData: any) => {
    try {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        throw new Error('Failed to open print window');
      }

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
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create bill');
      }

      if (!result.success || !result.data) {
        throw new Error('Invalid response from server');
      }

      handlePrintBill(result.data);
      toast.success('Bill created successfully');
      router.push('/billing/offline');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create bill';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };



  return (
    <>
      <div className="space-y-6 mt-6">
        {/* Customer Details Section */}
        <div className="bg-white shadow-sm rounded-lg p-6">
          <h2 className="text-lg font-medium mb-4">Customer Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Customer Name"
              value={customerDetails.name}
              onChange={(e) =>
                setCustomerDetails((prev) => ({
                  ...prev,
                  name: e.target.value,
                }))
              }
              required
            />
            <Input
              label="Phone Number"
              value={customerDetails.phone}
              onChange={(e) =>
                setCustomerDetails((prev) => ({
                  ...prev,
                  phone: e.target.value,
                }))
              }
              pattern="[0-9]{10}"
              required
            />
          </div>
        </div>

        {/* Product Selection Section */}
        <div className="bg-white shadow-sm rounded-lg p-6">
          <h2 className="text-lg font-medium mb-4">Add Products</h2>
          <ProductTable onChange={setItems} />

          
        </div>

        {/* Payment Details Section */}
        <div className="bg-white shadow-sm rounded-lg p-6">
          <h2 className="text-lg font-medium mb-4">Payment Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Payment Method"
              value={paymentDetails.method}
              onChange={(e) =>
                setPaymentDetails((prev) => ({
                  ...prev,
                  method: e.target.value,
                }))
              }
              options={PAYMENT_METHODS}
              required
            />
            <Input
              label="Amount Paid"
              type="number"
              value={paymentDetails.amountPaid}
              onChange={(e) =>
                setPaymentDetails((prev) => ({
                  ...prev,
                  amountPaid: e.target.value,
                }))
              }
              min="0"
              step="0.01"
              required
            />
          </div>

          <div className="mt-4 text-right">
            <p className="text-lg">Total: ₹{calculateTotal().toFixed(2)}</p>
            <p className="text-lg text-gray-600">
              Balance: ₹{calculateBalance().toFixed(2)}
            </p>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 text-red-500 p-4 rounded-md">{error}</div>
        )}

        {/* Action Buttons */}
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
    </>
  );
}
