// pages/billing/offline.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ProductTable } from '@/components/billing/ProductTable';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import type { BillItem } from '@/types/billing';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import React from 'react';  // Add this import


const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'upi', label: 'UPI' },
];

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
    total: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);


  
  // Update quantity of a specific item

  // Remove an item from the bill

  // Calculate total price of the bill
  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + item.total, 0);
  };

  // Calculate balance based on amount paid
  const calculateBalance = () => {
    const total = calculateTotal();
    const amountPaidStr = paymentDetails.amountPaid;
    if (!amountPaidStr) {
      return 0;
    }
    const paid = parseFloat(amountPaidStr);
    if (isNaN(paid)) {
      return 0;
    }
    const balance = paid - total;
    return balance >= 0 ? balance : 0;
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (items.length === 0) {
      setError('Please add at least one item');
      toast.error('Please add at least one item');
      return;
    }

    if (!customerDetails.name || !customerDetails.phone) {
      setError('Please enter customer details');
      toast.error('Please enter customer details');
      return;
    }

    if (!paymentDetails.amountPaid) {
      setError('Please enter amount paid');
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
          billingMode: 'offline',
          total: calculateTotal(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create bill');
      }

      // Generate and print the bill
      generateAndPrintBill(data, paymentDetails);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to create bill';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

    /**
   * Print Functionality
   */
    const generateAndPrintBill = (data: any, formData: any) => {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast.error('Failed to open print window');
        return;
      }
  
      // Extract organisation details from API response
      const organisation = data.organisation;
  
      if (!organisation) {
        toast.error('Organisation details are missing in the response.');
        return;
      }
  
      const totalQuantity = data.items.reduce(
        (sum: number, item: any) => sum + item.quantity,
        0
      );
      const balance = calculateBalance(); // Use the frontend's calculateBalance function
      const formattedDate = new Date(data.date).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
  
      const addressLines = `
        ${organisation.flatNo}, ${organisation.street}<br>
        ${organisation.district}, ${organisation.state}<br>
        ${organisation.pincode}<br>
        MOBILE: ${organisation.phone}
      `;
  
      const websiteLine = organisation.website_address
        ? `<h4 class="text-center">${organisation.website_address}</h4>`
        : '';
  
      const billContent = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <title>Billing Invoice - Bill No: ${data.billNo}</title>
          <style>
            @media print {
              @page {
                size: 4in 6in; /* Adjust size as needed */
                margin: 10mm;
              }
              body {
                margin: 0;
                padding: 0;
              }
              .container {
                width: 100%;
                height: 100%;
                padding: 10px;
                box-sizing: border-box;
              }
            }
            body { 
              font-family: Arial, sans-serif; 
              margin: 0; 
              padding: 0; 
              font-size: 12px;
            }
            .container { 
              max-width: 800px; 
              margin: 0 auto; 
              padding: 10px; 
            }
            h2, h4, h5, h6 { 
              text-align: center; 
              margin-bottom: 5px; 
            }
            .address { 
              margin-bottom: 10px;
            }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-bottom: 10px; 
              font-size: 12px;
            }
            th, td { 
              border: 1px solid #ddd; 
              padding: 5px; 
              text-align: left; 
            }
            th { 
              background-color: #f2f2f2; 
            }
            .label-container { 
              display: flex; 
              justify-content: space-between; 
              margin-bottom: 5px; 
            }
            .footer { 
              text-align: center; 
              margin-top: 10px; 
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>${organisation.shopName}</h2>
            <h6 class="address">
              ${addressLines}
            </h6>
            ${websiteLine}
            <h5>Bill No: ${data.billNo}</h5>
            <div class="label-container">
              <div>
                <strong>Name:</strong> ${data.customer.name}<br>
                <strong>Ph No:</strong> ${data.customer.phone}
              </div>
              <div>
                <strong>Payment:</strong> ${capitalizeFirstLetter(
                  data.paymentMethod
                )}<br>
                <strong>Date:</strong> ${formattedDate}
              </div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Product Name</th>
                  <th>Qty</th>
                  <th>Price (Rs.)</th>
                  <th>Total (Rs.)</th>
                </tr>
              </thead>
              <tbody>
                ${data.items
                  .map(
                    (item: any) => `
                  <tr>
                    <td>${item.product.name}</td>
                    <td>${item.quantity}</td>
                    <td>${parseFloat(item.product.sellingPrice).toFixed(2)}</td>
                    <td>${parseFloat(item.totalPrice).toFixed(2)}</td>
                  </tr>
                `
                  )
                  .join('')}
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="2"><strong>Total Quantity</strong></td>
                  <td colspan="2"><strong>${totalQuantity}</strong></td>
                </tr>
                <tr>
                  <td colspan="2"><strong>Total</strong></td>
                  <td colspan="2"><strong>${parseFloat(data.totalPrice).toFixed(
                    2
                  )}</strong></td>
                </tr>
              </tfoot>
            </table>
            <div class="label-container">
              <div>
                <strong>Amount Paid:</strong> Rs.${parseFloat(
                  formData.amountPaid
                ).toFixed(2)}
              </div>
              <div>
                <strong>Balance:</strong> Rs.${balance.toFixed(2)}
              </div>
            </div>
            <div class="footer">
              <p>Thank you for your business!</p>
              <p>Visit Us Again!</p>
            </div>
          </div>
        </body>
        </html>
      `;
  
      printWindow.document.open();
      printWindow.document.write(billContent);
      printWindow.document.close();
  
      // Print when content is loaded
      printWindow.onload = function () {
        setTimeout(() => {
          try {
            printWindow.focus();
            printWindow.print();
          } catch (error) {
            console.error('Print error:', error);
            alert('There was an error while trying to print. Please try again.');
          } finally {
            printWindow.close();
          }
        }, 500); // Slight delay to ensure all resources are loaded
      };
    };
  
    /**
     * Utility Functions
     */
  
    // Capitalize the first letter of a string
    const capitalizeFirstLetter = (string: string) => {
      return string.charAt(0).toUpperCase() + string.slice(1);
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
