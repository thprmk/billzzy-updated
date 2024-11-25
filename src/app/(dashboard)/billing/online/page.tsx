// app/billing/OnlineBillPage.tsx

'use client';

import React, { useState } from 'react';
import { CustomerForm } from '@/components/billing/CustomerSearch';
import { ProductTable } from '@/components/billing/ProductTable';
import { Button } from '@/components/ui/Button';
import type { CustomerDetails, BillItem } from '@/types/billing';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import JsBarcode from 'jsbarcode';


export default function OnlineBillPage() {
  const router = useRouter();
  const [customer, setCustomer] = useState<CustomerDetails | null>(null);
  const [items, setItems] = useState<BillItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);




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

      // If customer is new (no id), create the customer first
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

      // Now, create the bill
      const response = await fetch('/api/billing/online', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          items,
          billingMode: 'online'
        })
      });

      const data = await response.json();


      if (!response.ok) {
        throw new Error(data.message || 'Failed to create bill');
      }

      // Trigger print
      generateAndPrintBill(data);

    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create bill');
      toast.error(error instanceof Error ? error.message : 'Failed to create bill');
      setIsLoading(false);
    }
  };


  function generateAndPrintBill(data) {
    // Open a new window for printing
    let printWindow = window.open("", "_blank");

    if (!printWindow) {
      alert("Unable to open print window. Please disable your pop-up blocker and try again.");
      return;
    }

    // Generate the items list
    let itemsList = data.product_details.map((product, index) => {
      return `${index + 1}. ${product.productName} (Qty: ${product.quantity})`;
    }).join(", ");

    let billId = data.bill_id.toString();

    // Create a canvas element and generate the barcode
    let canvas = document.createElement('canvas');
    JsBarcode(canvas, billId, {
      format: "CODE128",
      width: 1,
      height: 20,
      displayValue: false
    });
    let barcodeDataUrl = canvas.toDataURL("image/png");

    // CSS Styles using template literals
    let styles = `
      <style>
        @media print {
          @page {
            size: 4in 4in;
            margin: 0;
          }
          body {
            margin: 0;
            padding: 0;
          }
          .label-container {
            width: 100%;
            height: 100%;
            page-break-after: always;
          }
          .label {
            width: 100%;
            height: 100%;
            margin: 5px;
          }
        }
        body {
          font-family: Arial, sans-serif;
          font-size: 12px;
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        .label-container {
          width: 4in;
          padding: 4px;
          height: 4in;
          margin: 0 auto;
          box-sizing: border-box;
          page-break-after: always;
        }
        .label {
          border: 1px solid black;
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 14px;
          margin: 0 !important;
          border-bottom: 1px solid black;
          padding: 4px 6px;
          box-sizing: border-box;
        }
        .logo {
          font-weight: bold;
          font-size: 14px;
        }
        .address-box {
          border-bottom: 1px solid black;
          padding: 6px;
          font-size: 12px;
        }
        .address-box p {
          font-size: 16px !important;
          padding: 0 !important;
          margin: 6px 0;
        }
        .address-box h2 {
          margin: 0 0 0.05in 0;
          font-size: 18px;
        }
        .sender-details {
          display: flex;
          justify-content: space-between;
          padding: 0.1in;
          border-bottom: 1px solid black;
          box-sizing: border-box;
        }
        .sender-details div strong {
          font-size: 12px;
        }
        .items {
          display: flex;
        }
        .items p, .items h4 {
          margin: 0;
          padding: 5px;
        }
        .barcode {
          text-align: center;
          padding: 0;
          margin: 0;
          line-height: 1;
        }
        .barcode img {
          height: 40px;
          padding: 0 !important;
          background-color: #000;
          margin: 0 !important;
          display: block;
          vertical-align: middle;
        }
      </style>
    `;

    // HTML Content using template literals
    let labelContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Thermal Label</title>
        ${styles}
      </head>
      <body>
        <div class="label-container">
          <div class="label">
            <div class="header">
              <div class="logo">${data.organisation_details.shop_name}</div>
              <div class="barcode">
                <img src="${barcodeDataUrl}" alt="Barcode ${billId}">
              </div>
              <div>Bill ID: ${data.bill_id}</div>
            </div>
            <div class="address-box">
              <h2>TO:</h2>
              <p>
                ${data.customer_details.name}<br>
                ${data.customer_details.flat_no || ''}, ${data.customer_details.street || ''}<br>
                ${data.customer_details.district || ''}<br>
                ${data.customer_details.state || ''} - ${data.customer_details.pincode || ''}<br>
                Phone: ${data.customer_details.phone}
              </p>
            </div>
            <div class="sender-details">
              <div>
                <strong>From:</strong><br>
                ${data.organisation_details.shop_name}<br>
                ${data.organisation_details.flatno || ''}, ${data.organisation_details.street}<br>
                ${data.organisation_details.district}, ${data.organisation_details.state}<br>
                ${data.organisation_details.pincode}<br>
                Phone: ${data.organisation_details.phone}
              </div>
              <div>
                <strong>Date:</strong> ${data.bill_details.date}<br>
               
              </div>
            </div>
            <div class="items">
              <h4>ITEMS:</h4>
              <p>${itemsList}</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    // Write content to the print window
    printWindow.document.open();
    printWindow.document.write(labelContent);
    printWindow.document.close();

    // Print when content is loaded
    printWindow.onload = function () {
      setTimeout(() => {
        try {
          printWindow.focus();
          printWindow.print();
        } catch (error) {
          console.error("Print error:", error);
          alert("There was an error while trying to print. Please try again.");
        } finally {
          printWindow.close();
        }
      }, 500); // Slight delay to ensure all resources are loaded
    };
  }


  return (
    <div className="space-y-6 p-4 ">
      {/* Customer Details Section */}
      <div className="bg-white shadow-sm rounded-lg p-6">
        <h2 className="text-lg font-medium mb-4">Customer Details</h2>
        <CustomerForm onCustomerChange={setCustomer} />
      </div>

      {/* Product Selection Section */}
      <div className="bg-white shadow-sm rounded-lg p-6">
        <h2 className="text-lg font-medium mb-4">Add Products</h2>
        <ProductTable onChange={setItems} />

      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 text-red-500 p-4 rounded-md">
          {error}
        </div>
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
          disabled={!customer || items.length === 0 || isLoading}
        >
          {isLoading ? 'Creating Bill...' : 'Create Bill'}
        </Button>
      </div>
    </div>
  );
}
