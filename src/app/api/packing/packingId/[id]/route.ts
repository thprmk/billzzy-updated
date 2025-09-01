// src/app/api/packing/packingId/[id]/route.ts

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-options';
import { revalidatePath } from 'next/cache';
import { sendWhatsAppMessageByOrganisation } from '@/lib/whatsapp';
import { TransactionRecord, Customer, Organisation } from '@prisma/client'; // Import types from Prisma

// --- 1. DEFINE A SPECIFIC TYPE ---
// This creates a new type that includes the TransactionRecord and its related Customer and Organisation.
// This is much safer than using `any`.
type TransactionWithRelations = TransactionRecord & {
  customer: Customer | null;
  organisation: Organisation | null;
};

// ===================================================================
//  GET: Fetches bill details for the packing screen.
// ===================================================================
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.organisationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const organisationId = Number(session.user.organisationId);
    
    const companyBillNo = parseInt(params.id, 10);
    if (isNaN(companyBillNo)) {
      return NextResponse.json({ error: 'Invalid bill number' }, { status: 400 });
    }

    const bill = await prisma.transactionRecord.findFirst({
      where: {
        companyBillNo: companyBillNo,
        organisationId: organisationId,
      },
      include: {
        items: {
          include: {
            product: true,
            productVariant: {
              include: { product: true }
            }
          }
        }
      }
    });

    if (!bill) {
      return NextResponse.json({ error: `Bill with Company Bill No. ${companyBillNo} not found` }, { status: 404 });
    }

    // --- 2. USE A TYPE FOR THE MAPPED ITEM ---
    const products = bill.items.map((item: { productVariant: any; product: any; quantity: number }) => {
      if (item.productVariant) {
        return {
          id: item.productVariant.id,
          SKU: item.productVariant.SKU,
          name: `${item.productVariant.product.name} (${item.productVariant.size || item.productVariant.color || ''})`.trim(),
          quantity: item.quantity,
        };
      }
      if (item.product) {
        return {
          id: item.product.id,
          SKU: item.product.SKU,
          name: item.product.name,
          quantity: item.quantity,
        };
      }
      return null;
    }).filter(Boolean);
    
    return NextResponse.json({
      billNo: bill.billNo,
      companyBillNo: bill.companyBillNo,
      products
    });

  } catch (error) {
    console.error('Packing fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch bill details' }, { status: 500 });
  }
}


// ===================================================================
//  POST: Updates the bill status and sends a notification.
// ===================================================================

// --- 3. USE OUR NEW, SAFE TYPE HERE ---
async function sendPackingNotification(transactionRecord: TransactionWithRelations) {
  if (!transactionRecord.customer?.phone) {
    console.log(`⚠️  WhatsApp notification skipped: No phone number for bill #${transactionRecord.companyBillNo}`);
    return { success: false, error: "Customer phone number not available." };
  }
  try {
    const customerPhone = transactionRecord.customer.phone;
    const orderId = transactionRecord.companyBillNo!.toString(); // Use non-null assertion
    const companyName = transactionRecord.organisation?.name || 'Your Store';

    const whatsappResult = await sendWhatsAppMessageByOrganisation({
      organisationId: transactionRecord.organisationId,
      phone: customerPhone,
      templateName: 'order_packed_notification',
      variables: [orderId, "Your items", "Packed and Ready for Dispatch", companyName],
    });

    return { success: true, data: whatsappResult };
  } catch (error) {
    // Catch as 'unknown' for better type safety
    const e = error as Error;
    console.error(`❌ WhatsApp notification failed for bill #${transactionRecord.companyBillNo}:`, e.message);
    return { success: false, error: e.message };
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.organisationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const organisationId = Number(session.user.organisationId);

    const companyBillNo = parseInt(params.id, 10);
    if (isNaN(companyBillNo)) {
      return NextResponse.json({ error: 'Invalid bill number format' }, { status: 400 });
    }

    let updatedTransaction;
    try {
      updatedTransaction = await prisma.$transaction(async (tx) => {
        const transactionRecord = await tx.transactionRecord.findFirst({
          where: { companyBillNo, organisationId },
          include: { customer: true, organisation: true },
        });

        if (!transactionRecord) throw new Error('NOT_FOUND');
        if (transactionRecord.status === 'packed') throw new Error('ALREADY_PACKED');

        return tx.transactionRecord.update({
          where: { id: transactionRecord.id },
          data: { status: 'packed' },
          include: { customer: true, organisation: true },
        });
      });
    } catch (error) {
      const e = error as Error;
      if (e.message === 'NOT_FOUND') {
        return NextResponse.json({ error: 'Bill not found.' }, { status: 404 });
      }
      if (e.message === 'ALREADY_PACKED') {
        return NextResponse.json({ error: 'This bill is already packed.' }, { status: 409 });
      }
      throw e;
    }

    const notificationResult = await sendPackingNotification(updatedTransaction);
    revalidatePath('/dashboard');

    return NextResponse.json({
      success: true,
      message: 'Bill status updated to packed.',
      whatsapp: notificationResult,
      data: {
        billNumber: updatedTransaction.companyBillNo,
        newStatus: updatedTransaction.status,
      }
    });

  } catch (error) {
    const e = error as Error;
    console.error('Failed to update packing status:', e.message);
    return NextResponse.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
}