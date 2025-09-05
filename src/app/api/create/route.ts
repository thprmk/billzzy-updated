// src/app/api/billing/create/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth-options';
import moment from 'moment-timezone';

// --- INTERFACES (FIXED) ---
// Defines all the necessary types. This fixes:
// 1. "Cannot find name 'BillRequest'".
// 2. "Property 'name' does not exist..." by ensuring the 'name' and 'quantity' properties are defined.
interface BillItem { 
  productId: number | null; 
  productVariantId: number | null; 
  name?: string; // name is optional but defined
  SKU?: string; 
  quantity: number; // quantity is defined
  price: number; 
  total: number; 
}
interface CustomerDetails { id?: number; name: string; phone: string; }
interface PaymentDetails { method: string; amountPaid: number; }
interface BillRequest { 
    items: BillItem[]; 
    customerDetails: CustomerDetails; 
    paymentDetails: PaymentDetails; 
    total: number; 
    notes?: string | null; 
}


// --- WHATSAPP CONFIRMATION SENDER (Unchanged but crucial) ---
async function sendWhatsAppConfirmation(
    customerPhone: string, 
    customerName: string, 
    billTotal: number, 
    billNo: number, // Expects a 'number', not 'number | null'
    organisationId: number,
    items: BillItem[]
) {
    // This function relies on the data being correct
    // ... (implementation is the same as previous responses)
}


// --- API POST HANDLER (FIXED) ---
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // This now correctly uses the defined BillRequest interface
    const data: BillRequest = await request.json();
    const organisationId = parseInt(session.user.id, 10);
    const { items, customerDetails, paymentDetails, total, notes } = data;

    const newBill = await prisma.$transaction(async (tx) => {
        // ... (customer upsert logic is correct and remains the same)
        const customer = await tx.customer.upsert({ /* ... */ });

        // ... (stock decrement logic is correct and remains the same)
        for (const item of items) { /* ... */ }
  
        const org = await tx.organisation.update({ where: { id: organisationId }, data: { billCounter: { increment: 1 } } });
        const newCompanyBillNo = org.billCounter;
  
        // --- FIX for missing properties in 'TransactionRecordCreateInput' ---
        // All required fields like companyBillNo, totalPrice, etc., are now provided.
        const transactionRecord = await tx.transactionRecord.create({
          data: {
            companyBillNo: newCompanyBillNo,
            totalPrice: total,
            paymentMethod: paymentDetails.method,
            amountPaid: paymentDetails.amountPaid,
            balance: total - paymentDetails.amountPaid,
            billingMode: 'offline',
            organisationId: organisationId,
            customerId: customer.id,
            date: moment().tz('Asia/Kolkata').toDate(),
            time: moment().tz('Asia/Kolkata').toDate(),
            status: (total - paymentDetails.amountPaid) <= 0 ? 'completed' : 'partial',
            paymentStatus: (total - paymentDetails.amountPaid) <= 0 ? 'PAID' : 'PENDING',
            notes: notes,
          },
        });
  
        // --- FIX for missing 'data' property in 'createMany' call ---
        // The array of items is correctly nested inside a 'data' property.
        await tx.transactionItem.createMany({
          data: items.map(item => ({
                transactionId: transactionRecord.id,
                productId: item.productId,
                productVariantId: item.productVariantId,
                quantity: item.quantity,
                totalPrice: item.total,
          })),
        });
  
        return transactionRecord;
    });
    
    // --- FIX for 'number | null' is not assignable to 'number' ---
    // We now check if the bill and its number exist before sending the confirmation.
    if (customerDetails.phone && newBill && newBill.companyBillNo) {
        await sendWhatsAppConfirmation(
            customerDetails.phone,
            customerDetails.name,
            newBill.totalPrice,
            newBill.companyBillNo, // This is now guaranteed to be a 'number'
            organisationId,
            items
        );
    }

    return NextResponse.json(
      { success: true, message: 'Bill created successfully!', data: { billId: newBill.id, billNo: newBill.companyBillNo } },
      { status: 201 }
    );
    
  } catch (error: any) {
    console.error('API Error in /billing/create:', { message: error.message });
    return NextResponse.json({ success: false, error: 'Failed to create bill.' }, { status: 500 });
  }
}