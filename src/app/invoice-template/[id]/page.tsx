// src/app/invoice-template/[id]/page.tsx
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import './invoice.css'; // We will create this CSS file next
import React from 'react'; // Add this import

export default async function InvoiceTemplatePage({ params }: { params: { id: string } }) {
  const invoiceId = Number(params.id);
  if (isNaN(invoiceId)) {
    notFound();
  }

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { items: true, customer: true, organisation: true },
  });

  if (!invoice) {
    notFound();
  }

  const org = invoice.organisation || {};
  const cust = invoice.customer;
  const subTotal = invoice.subTotal || 0;
  const totalTax = invoice.totalTax || 0;
  const totalAmount = invoice.totalAmount || 0;

  return (
    <html>
      <body>
        <div className="invoice-box">
          <header>
            <div className="company-info">
              {invoice.logoUrl && <img src={invoice.logoUrl} alt="Logo" className="logo" />}
              <h1>{org.shopName || 'Your Company'}</h1>
              <div>{org.street}, {org.flatNo}</div>
              <div>{org.city}, {org.state} - {org.pincode}</div>
              <div>{org.email}</div>
            </div>
            <div className="invoice-info">
              <h2>INVOICE</h2>
              <p><strong>Invoice #:</strong> {invoice.invoiceNumber}</p>
              <p><strong>Issue Date:</strong> {new Date(invoice.issueDate).toLocaleDateString()}</p>
              <p><strong>Due Date:</strong> {new Date(invoice.dueDate).toLocaleDateString()}</p>
              <p><strong>Status:</strong> {invoice.status}</p>
            </div>
          </header>

          <section className="customer-info">
            <h3>BILL TO</h3>
            {cust ? (
              <>
                <p><strong>{cust.name}</strong></p>
                <p>{cust.street}, {cust.flatNo}</p>
                <p>{cust.district}, {cust.state} - {cust.pincode}</p>
                <p>{cust.email}</p>
              </>
            ) : <p>Walk-in Customer</p>}
          </section>

          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th>Qty</th>
                <th>Price</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map(item => (
                <tr key={item.id}>
                  <td>{item.description}</td>
                  <td className="center">{item.quantity}</td>
                  <td className="right">₹{item.unitPrice.toFixed(2)}</td>
                  <td className="right">₹{item.total.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <footer>
            <div className="totals">
              <div><span>Subtotal</span><span>₹{subTotal.toFixed(2)}</span></div>
              <div><span>Tax</span><span>₹{totalTax.toFixed(2)}</span></div>
              <div className="grand-total"><span>TOTAL</span><span>₹{totalAmount.toFixed(2)}</span></div>
            </div>
            {invoice.notes && (
              <div className="notes">
                <h4>Notes</h4>
                <p>{invoice.notes}</p>
              </div>
            )}
          </footer>
        </div>
      </body>
    </html>
  );
}