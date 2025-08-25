// src/app/(dashboard)/invoices/new/page.tsx

import  Header  from '@/components/dashboard/Header';
import { InvoiceForm } from '@/components/invoices/InvoiceForm'; 

export default function NewInvoicePage() {
  return (
    <div>
      <Header title="Create New Invoice" />
      <main className="p-4 md:p-6">
        <p>Invoice form will go here</p>
        <InvoiceForm /> 
      </main>
    </div>
  );
}