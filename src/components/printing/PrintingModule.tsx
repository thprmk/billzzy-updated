// app/printing/page.tsx
'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import JsBarcode from 'jsbarcode';
import React from 'react';  // Add this import

interface ProductDetail {
  productName: string;
  quantity: number;
}

interface CustomerDetails {
  name: string;
  flat_no?: string;
  street?: string;
  district?: string;
  state?: string;
  pincode?: string;
  phone: string;
}

interface OrganisationDetails {
  shop_name: string;
  flatno?: string;
  street: string;
  district: string;
  state: string;
  pincode: string;
  phone: string;
}

interface BillDetails {
  bill_no: string | number;
  date: string;
  time: string;
}

interface Bill {
  bill_id: string | number;
  customer_details: CustomerDetails;
  organisation_details: OrganisationDetails;
  bill_details: BillDetails;
  product_details: ProductDetail[];
}

export default function PrintingModule() {
  const [billId, setBillId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [bills, setBills] = useState(0)

  const handleSinglePrint = async () => {
    if (!billId) {
      alert('Please enter a bill ID');
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch(`/api/printing/print-bill/${billId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch bill details');
      }

      const data = await response.json();
      printBills([data]);
      console.log(data);
      
    } catch (error) {
      alert('Error fetching bill details. Please try again.');
      console.error('Print error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkPrint = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/printing/bulkPrinting');
      
      if (!response.ok) {
        throw new Error('Failed to fetch bills');
      }

      const data = await response.json();
      await setBills(data.bills.length)

      if (data.bills.length === 0) {
        alert('No bills available for printing');
        return;
      }


      printBills(data.bills);
    //   alert(`${data.bills.length} bills prepared for printing`);

    } catch (error) {
      alert('Error during printing. Please try again.');
      console.error('Bulk print error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const printBills = (bills: Bill[]) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Unable to open print window. Please disable your pop-up blocker and try again.');
      return;
    }
  
    const printContent = generatePrintContent(bills);
    
    // Create and trigger automatic download
    const blob = new Blob([printContent], { type: 'text/html' });
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `bills_${new Date().getTime()}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  
    // Display content in print window
    printWindow.document.open();
    printWindow.document.write(printContent);
    printWindow.document.close();
  
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
      }, 500);
    };
  
    // Cleanup
    URL.revokeObjectURL(downloadUrl);
  };

  console.log(bills);
  

  const generatePrintContent = (bills: Bill[]) => {
    const styles = `
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
          min-height: 45px;
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
          flex: 0 0 auto;
        }
        .address-box p {
          font-size: 14px !important;
          padding: 0 !important;
          margin: 6px 0;
        }
        .address-box h2 {
          margin: 0 0 0.05in 0;
          font-size: 16px;
        }
        .sender-details {
          display: flex;
          justify-content: space-between;
          padding: 6px;
          border-bottom: 1px solid black;
          box-sizing: border-box;
          flex: 0 0 auto;
          font-size: 11px;
        }
        .sender-details div strong {
          font-size: 12px;
        }
        .items {
          padding: 6px;
          overflow: hidden;
          display: flex;
        }
        .items-header {
          font-weight: bold;
          margin-bottom: 4px;
        }
        .items-content {
          display: flex;
          flex-direction: row;
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
          margin: 0 !important;
          display: block;
          vertical-align: middle;
        }
          .weight{
          padding-bottom: 14px;
          }

          .billId{
          font-size:12px;
          }
      </style>
    `;

    const billsHTML = bills.map(bill => {
      const itemsList = bill.product_details
        .map(product => `${product.productName} x ${product.quantity}`)
        .join("\n");

      const canvas = document.createElement('canvas');
      JsBarcode(canvas, bill.bill_details.bill_no.toString(), {
        format: "CODE128",
        width: 1,
        height: 20,
        displayValue: false
      });
      const barcodeDataUrl = canvas.toDataURL("image/png");

      return `
        <div class="label-container">
          <div class="label">
            <div class="header">
              <div class="logo">${bill.organisation_details.shopName}</div>
              <div class="barcode">
                <img src="${barcodeDataUrl}" alt="Barcode ${bill.bill_details.bill_no}">
              </div>
              <div class="billId">Bill ID: ${bill.bill_details.bill_no}</div>
            </div>
            <div class="address-box">
              <h2>TO:</h2>
              <p>
                ${bill.customer_details.name}<br>
                ${bill.customer_details.flat_no ? bill.customer_details.flat_no + ', ' : ''}${bill.customer_details.street || ''}<br>
                ${bill.customer_details.district || ''}<br>
                ${bill.customer_details.state || ''} - ${bill.customer_details.pincode || ''}<br>
                Phone: ${bill.customer_details.phone}
              </p>
            </div>
            <div class="sender-details">
              <div>
                <strong>From:</strong><br>
                ${bill.organisation_details.shopName}<br>
                ${bill.organisation_details.flatno ? bill.organisation_details.flatno + ', ' : ''}${bill.organisation_details.street}<br>
                ${bill.organisation_details.district}, ${bill.organisation_details.state}<br>
                ${bill.organisation_details.pincode}<br>
                Phone: ${bill.organisation_details.phone}
              </div>
              <div>
                <strong>Date:</strong> ${bill.bill_details.date}<br>
                <strong>Shipping Details:</strong> ${bill?.shipping_details?.method_name?bill?.shipping_details?.method_name:'Informing soon'}<br><br>
              <strong class='weight'>Weight:</strong> <br>
              <strong>Packed By:</strong> 



              </div>
            </div>
            <div class="items">
              <div class="items-content">${itemsList}</div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    return `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <title>Print Bills</title>
          ${styles}
        </head>
        <body>
          ${billsHTML}
        </body>
      </html>
    `;
  };

  return (
   <div className="w-full max-w-2xl mx-auto py-4 sm:p-6 space-y-6">
      {/* Single Print Section */}
      <div className="bg-white rounded-lg shadow p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-semibold mb-4">Print Single Bill</h2>
        <div className="flex flex-col sm:flex-row gap-4">
          <Input
            type="text"
            placeholder="Enter Bill ID"
            value={billId}
            onChange={(e) => setBillId(e.target.value)}
            className="w-full"
            disabled={isLoading}
          />
          <Button
            onClick={handleSinglePrint}
            disabled={isLoading}
            className="w-full sm:w-40"
          >
            {isLoading ? 'Printing...' : 'Print Bill'}
          </Button>
        </div>
      </div>

      {/* Bulk Print Section */}
      <div className="bg-white rounded-lg shadow p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-semibold mb-4">Bulk Printing</h2>
        <Button
          onClick={handleBulkPrint}
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? `Preparing Bills...` : 'Print All Processing Bills'}
        </Button>
      </div>
    </div>
  );
}