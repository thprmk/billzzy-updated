// src/app/(dashboard)/invoice/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation'; 
import Header from '@/components/dashboard/Header';
import { InvoiceDetailView } from '@/components/invoices/InvoiceDetailView';
import { Invoice } from '@/types/invoice';

// Remove `params` from props, we get it from the hook now
export default function InvoiceDetailPage() {
  const params = useParams();
  const id = params.id as string; // Get the ID, assert it's a string

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    // Only fetch if the ID exists
    if (id) {
      const fetchInvoice = async () => {
        try {
          // Use the plural `invoices` for the API route
          const response = await fetch(`/api/invoices/${id}`);
          if (!response.ok) {
            setError('Invoice not found or you do not have permission to view it.');
            return;
          }
          const data = await response.json();
          setInvoice(data);
        } catch (err: any) {
          setError('An unexpected error occurred.');
        } finally {
          setLoading(false);
        }
      };
      fetchInvoice();
    }
  }, [id]); // Dependency array uses the ID from the hook

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error || !invoice) {
    return (
      <div>
        <Header 
          isSidebarOpen={isSidebarOpen}
          openSidebar={() => setSidebarOpen(true)}
          closeSidebar={() => setSidebarOpen(false)}
        />
        <main className="p-6">
          <p className="text-red-500">{error}</p>
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