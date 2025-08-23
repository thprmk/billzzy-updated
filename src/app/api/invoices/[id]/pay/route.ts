// src/app/api/invoices/[id]/pay/route.ts

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { generateBillNumber } from '@/lib/generateBillNumber'; // You already have this utility

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  // 1. --- AUTHENTICATION & VALIDATION ---
  const session = await getServerSession(authOptions);
  if (!session?.user?.organisationId) {
    return NextResponse.json({ error: 'Not Authenticated' }, { status: 401 });
  }
  const organisationId = Number(session.user.organisationId);
  const invoiceId = Number(params.id);

  try {
    // --- PRISMA TRANSACTION ---
    // We use a transaction to ensure that ALL of these database operations succeed or ALL fail.
    // This prevents a situation where the invoice is marked as paid but the transaction isn't created.
    const updatedInvoice = await prisma.$transaction(async (tx) => {
      
      // 2. --- FETCH THE INVOICE (with security) ---
      const invoice = await tx.invoice.findFirst({
        where: {
          id: invoiceId,
          organisationId: organisationId,
        },
        include: { items: true },
      });

      if (!invoice) {
        throw new Error('Invoice not found');
      }

      // 3. --- PREVENT DUPLICATE ACTIONS ---
      // If the invoice is already paid and has a transaction, stop here.
      if (invoice.status === 'PAID' && invoice.createdTransactionId) {
        return invoice; // Return the existing invoice without making changes
      }

      // 4. --- CREATE THE TRANSACTION RECORD ---
      // This creates the official sales record in your system.
      const newBillNo = await generateBillNumber(organisationId);
      const newTransaction = await tx.transactionRecord.create({
        data: {
          billNo: newBillNo,
          totalPrice: invoice.totalAmount,
          paymentMethod: 'From Invoice', // Or you could pass this in from the frontend
          amountPaid: invoice.totalAmount,
          balance: 0,
          billingMode: 'online', // Assuming invoices are 'online'
          organisationId: organisationId,
          date: new Date(),
          time: new Date(),
          notes: `Generated from Invoice #${invoice.invoiceNumber}`,
          status: 'confirmed',
          paymentStatus: 'PAID',
          // Link items from the invoice to this new transaction
          items: {
            create: invoice.items.map(item => ({
              quantity: item.quantity,
              totalPrice: item.total,
              productId: item.productId,
              // IMPORTANT: You might need to adjust this if you use product variants
            })),
          },
        },
      });

      // 5. --- UPDATE INVENTORY ---
      // This is a critical step for retail businesses.
      for (const item of invoice.items) {
        if (item.productId) {
          await tx.product.update({
            where: { id: item.productId },
            data: {
              quantity: {
                decrement: item.quantity,
              },
            },
          });
        }
      }

      // 6. --- UPDATE THE INVOICE STATUS ---
      // Finally, update the invoice to link it to the new transaction and set its status to PAID.
      const finalInvoice = await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          status: 'PAID',
          createdTransactionId: newTransaction.id,
        },
      });

      return finalInvoice;
    });

    return NextResponse.json(updatedInvoice);

  } catch (error: any) {
    console.error("[INVOICE_PAY_ERROR]", error);
    // Check if it was a 'not found' error from within the transaction
    if (error.message === 'Invoice not found') {
        return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}