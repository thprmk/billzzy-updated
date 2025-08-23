// src/app/(dashboard)/invoices/[id]/page.tsx

import Header from '@/components/dashboard/Header';
import { InvoiceDetailView } from '@/components/invoices/InvoiceDetailView'; // We will create this next
import { getInvoiceById } from '@/lib/data/invoices'; // We will create this function

// Define the type for the invoice data we expect
// This should match your Prisma model
interface Invoice {
  id: number;
  invoiceNumber: string;
  status: string;
  issueDate: Date;
  dueDate: Date;
  notes: string;
  subTotal: number;
  totalTax: number;
  totalAmount: number;
  items: {
    id: number;
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }[];
}

// This is an async Server Component
export default async function InvoiceDetailPage({ params }: { params: { id: string } }) {
  // Fetch the specific invoice using the ID from the URL
  const invoice: Invoice | null = await getInvoiceById(params.id);

  if (!invoice) {
    return (
        <div>
        {/* --- FIX 2: Removed the 'title' prop --- */}
        <Header />
        <main className="p-6">
          <p>The invoice you are looking for does not exist or you do not have permission to view it.</p>
        </main>
      </div>
    );
  }

  return (
    <div>
      {/* --- FIX 2: Removed the 'title' prop --- */}
      <Header />
      <main className="p-4 md:p-6">
        <InvoiceDetailView invoice={invoice} />
      </main>
    </div>
  );
}