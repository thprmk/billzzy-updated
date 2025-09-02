import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth-options';
import { Prisma } from '@prisma/client';
import moment from 'moment-timezone';

// --- Interfaces (No changes needed) ---
interface BillItem { 
  productId: number | null; 
  productVariantId: number | null; 
  name?: string; 
  SKU?: string; 
  quantity: number; 
  price: number; 
  total: number; 
}
interface CustomerDetails { id?: number; name: string; phone: string; }
interface PaymentDetails { method: string; amountPaid: number; }
interface BillRequest { items: BillItem[]; customerDetails: CustomerDetails; paymentDetails: PaymentDetails; total: number; notes?: string | null; }


// --- sendWhatsAppConfirmation function (MODIFIED TO INCLUDE PRODUCT LIST) ---
async function sendWhatsAppConfirmation(
    customerPhone: string, 
    customerName: string, 
    billTotal: number, 
    billNo: number, 
    organisationId: number,
    items: BillItem[] // <-- ADDED: Pass the items array to the function
) {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  
  const gowhatsConfig = await prisma.gowhats.findFirst({
      where: { organisationId: organisationId },
      select: { phoneNumberId: true }
  });

  if (!accessToken || !gowhatsConfig?.phoneNumberId) {
    console.error("WhatsApp credentials (ACCESS_TOKEN or PHONE_NUMBER_ID) are not configured for this org. Skipping message.");
    return;
  }
  
  const formattedPhone = customerPhone.replace(/\D/g, '');
  
  // --- NEW: Format the product list from the items array ---
  const productList = items.map(item => 
    `- ${item.name} (Qty: ${item.quantity})`
  ).join('\n');

  // --- NEW: Construct the detailed custom message body ---
  const messageBody = `Hello ${customerName.split(' ')[0]},\n\nThank you for your order! Here is your bill summary:\n\n*Bill Number:* ${billNo}\n\n*Items Purchased:*\n${productList}\n\n*Total Amount:* ₹${billTotal.toFixed(2)}\n\nWe appreciate your business!`;

  const payload = {
    messaging_product: "whatsapp",
    to: formattedPhone,
    type: "text",
    text: {
      body: messageBody,
    },
  };

  try {
    const response = await fetch(
      `https://graph.facebook.com/v20.0/${gowhatsConfig.phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }
    );
    const result = await response.json();
    if (!response.ok) {
      console.error('Failed to send WhatsApp message:', JSON.stringify(result, null, 2));
    } else {
      console.log('Detailed WhatsApp bill sent successfully to:', formattedPhone);
    }
  } catch (error) {
    console.error('An exception occurred while sending the WhatsApp message:', error);
  }
}


// --- API POST Handler (Only the function call is changed) ---
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const data: BillRequest = await request.json();
    const organisationId = parseInt(session.user.id, 10);
    const { items, customerDetails, paymentDetails, total, notes } = data;

    console.log('\n--- New Offline Bill Received ---');
    console.log('Organisation ID:', organisationId);
    console.log('Customer:', customerDetails.name || 'Walk-in');
    console.log('Products in Bill:');
    console.log(JSON.stringify(items, null, 2));
    console.log('---------------------------------\n');


    const newBill = await prisma.$transaction(async (tx) => {
        let customer;
        if (customerDetails.id) {
          customer = await tx.customer.findUnique({ where: { id: customerDetails.id } });
          if (!customer || customer.organisationId !== organisationId) { throw new Error('Customer not found.'); }
        } else {
          if (customerDetails.phone) {
               customer = await tx.customer.upsert({
                   where: { phone_organisationId: { phone: customerDetails.phone, organisationId } },
                   update: { name: customerDetails.name },
                   create: { name: customerDetails.name, phone: customerDetails.phone, organisationId }
               });
          } else {
              const walkinName = "Walk-in Customer";
              customer = await tx.customer.findFirst({ where: { name: walkinName, organisationId }})
              if (!customer) { customer = await tx.customer.create({ data: { name: walkinName, phone: "", organisationId }}) }
          }
        }
  
        for (const item of items) {
            if (item.productVariantId) {
                await tx.productVariant.update({
                    where: { id: item.productVariantId },
                    data: { quantity: { decrement: item.quantity } },
                });
            } else if (item.productId) {
                await tx.product.update({
                    where: { id: item.productId },
                    data: { quantity: { decrement: item.quantity } },
                });
            }
        }
  
        const indianDateTime = moment().tz('Asia/Kolkata').toDate();
        const org = await tx.organisation.update({ where: { id: organisationId }, data: { billCounter: { increment: 1 } }, select: { billCounter: true } });
        const newCompanyBillNo = org.billCounter;
        const globallyUniqueBillNo = (organisationId * 10000000) + newCompanyBillNo;
  
        const transactionRecord = await tx.transactionRecord.create({
          data: {
            companyBillNo: newCompanyBillNo, billNo: globallyUniqueBillNo, totalPrice: total,
            paymentMethod: paymentDetails.method, amountPaid: paymentDetails.amountPaid,
            balance: total - paymentDetails.amountPaid, billingMode: 'offline',
            organisationId: organisationId, customerId: customer.id, date: indianDateTime, time: indianDateTime,
            status: (total - paymentDetails.amountPaid) <= 0 ? 'completed' : 'partial',
            paymentStatus: (total - paymentDetails.amountPaid) <= 0 ? 'PAID' : 'PENDING',
            notes: notes,
          },
        });
  
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
    
    // --- UPDATED: Pass the 'items' array to the function ---
    if (customerDetails.phone && customerDetails.phone.trim().length > 0) {
        sendWhatsAppConfirmation(
            customerDetails.phone,
            customerDetails.name,
            newBill.totalPrice,
            newBill.companyBillNo,
            organisationId,
            items // <-- Pass the full item list here
        );
    }

    return NextResponse.json(
      { success: true, message: 'Bill created successfully!', data: { billId: newBill.id, billNo: newBill.companyBillNo } },
      { status: 201 }
    );
    
  } catch (error: any) {
    console.error('API Error:', { message: error.message, stack: error.stack });
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}