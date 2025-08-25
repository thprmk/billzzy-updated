'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation'; 
import Header from '@/components/dashboard/Header';
import { InvoiceDetailView } from '@/components/invoices/InvoiceDetailView';
import { Invoice } from '@/types/invoice';

export default function InvoiceDetailPage() { 
  const params = useParams(); 
  const { id } = params; // Get the specific ID from the params object

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    // Only run the fetch call if the ID is available
    if (id) {
      const fetchInvoice = async () => {
        try {
          // STEP 4: Use the `id` from the hook
          const response = await fetch(`/api/invoice/${id}`); 
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
    }
  }, [id]); // STEP 5: Use `id` as the dependency

  // ... (the rest of your return logic is the same)
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
      <main className="p-4 md-p-6">
        <InvoiceDetailView invoice={invoice} />
      </main>
    </div>
  );
}