// src/app/(dashboard)/invoices/list/page.tsx

import Header from '@/components/dashboard/Header';
import { InvoiceList } from '@/components/invoices/InvoiceList';

export default function InvoicesListPage() {
  return (
    <div>
      <Header title="All Invoices" />
      <main className="p-4 md:p-6">
        <InvoiceList />
      </main>
    </div>
  );
}