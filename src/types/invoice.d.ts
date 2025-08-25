// src/types/invoice.d.ts

// This defines a single line item
export interface InvoiceItem {
    id: number;
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }
  
  // This defines the main invoice object
  export interface Invoice {
    id: number;
    invoiceNumber: string;
    status: string;
    issueDate: Date;
    dueDate: Date;
    notes: string | null; // `notes` can be a string or null
    subTotal: number;
    totalTax: number;
    totalAmount: number;
    items: InvoiceItem[]; // An array of the type defined above
  }