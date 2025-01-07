// app/dashboard/mandate/page.tsx

import { MandateForm } from "@/components/mandate/MandateForm";

export default function MandatePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Create UPI Mandate</h1>
      <MandateForm />
    </div>
  );
}