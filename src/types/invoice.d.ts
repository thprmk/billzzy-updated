// src/types/invoice.d.ts

// This defines a single line item
export interface InvoiceItem {
  id: number;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

// Minimal type for the related Customer model
interface RelatedCustomer {
  name: string;
  email?: string | null;
  street?: string | null;
  flatNo?: string | null;
  district?: string | null;
  state?: string | null;
  pincode?: string | null;
}

// Minimal type for the related Organisation model
interface RelatedOrganisation {
  shopName: string;
  street: string;
  flatNo: string;
  city?: string | null;
  state: string;
  pincode: string;
  email: string;
}

// This is the main, corrected Invoice object
export interface Invoice {
  id: number;
  invoiceNumber: string;
  status: string;
  issueDate: Date | string; // Can be a Date object or an ISO string
  dueDate: Date | string;   // Can be a Date object or an ISO string
  notes: string | null;
  subTotal: number;
  totalTax: number;
  totalAmount: number;
  items: InvoiceItem[];
  logoUrl?: string | null;            // <-- ADD THIS
  customer: RelatedCustomer | null;    // <-- AND THIS
  organisation: RelatedOrganisation; // <-- AND THIS
}