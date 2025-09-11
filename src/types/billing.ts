export interface BillItem {
  // Use productVariantId to uniquely identify a specific variant
  productVariantId?: number; 
  // Use productId for standard, non-variant products
  productId: number; 
  // We will still store productName for easy display
  productName: string;  
  // NEW: This will store the formatted string, e.g., "Size: M, Color: Red"
  variantDetails: string | null; 
  quantity: number;
  price: number;
  total: number;
  productWeight?: number;
}
  
  export interface CustomerDetails {
    id?: number;
    name: string;
    phone: string;
    email?: string;
    address?: {
      flatNo?: string;
      street?: string;
      district?: string;
      state?: string;
      pincode?: string;
    };
  }
  
  export interface Bill {
    id: number;
    billNo: string;
    date: Date;
    customerId: number;
    items: BillItem[];
    totalAmount: number;
    paymentMethod?: string;
    amountPaid?: number;
    balance?: number;
    status: 'pending' | 'confirmed' | 'cancelled';
    billingMode: 'online' | 'offline';
    salesSource?: string;
  }