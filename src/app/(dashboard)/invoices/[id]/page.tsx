// src/app/(dashboard)/invoices/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Header from '../../../../components/dashboard/Header';
import { InvoiceDetailView } from '../../../../components/invoices/InvoiceDetailView';
import { Invoice } from '../../../../types/invoice'; // Correct import

export default function InvoiceDetailPage({ params }: { params: { id: string } }) {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        const response = await fetch(`/api/invoices/${params.id}`);
        if (!response.ok) throw new Error('Invoice not found');
        const data = await response.json();
        setInvoice(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchInvoice();
  }, [params.id]);

  if (loading) return <div>Loading...</div>;

  if (error || !invoice) {
    return (
      <div>
        <Header 
          isSidebarOpen={isSidebarOpen}
          openSidebar={() => setSidebarOpen(true)}
          closeSidebar={() => setSidebarOpen(false)}
        />
        <main className="p-6">
          <p>Error: {error || 'The invoice you are looking for does not exist.'}</p>
        </main>
      </div>
    );
  }

  return (
    <div>
      <Header 
        isSidebarOpen={isSidebarOpen}
        openSidebar={() => setSidebarOpen(true)}
        closeSidebar={() => setSidebarOpen(false)}
      />
      <main className="p-4 md:p-6">
        <InvoiceDetailView invoice={invoice} />
      </main>
    </div>
  );
}