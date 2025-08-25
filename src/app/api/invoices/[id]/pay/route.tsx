// src/app/api/invoices/[id]/pay/route.ts

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import generateBillNumber from '@/lib/generateBillNumber'; // Ensure this import is correct

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organisationId) {
    return new NextResponse('Unauthorized', { status: 401 });
  }
  const organisationId = Number(session.user.organisationId);
  const invoiceId = Number(params.id);

  if (isNaN(invoiceId)) {
    return new NextResponse('Invalid Invoice ID', { status: 400 });
  }

  try {
    // Use a Prisma transaction to ensure all operations succeed or none do.
    const updatedInvoice = await prisma.$transaction(async (tx) => {
      
      // 1. Find the invoice and ensure it belongs to the logged-in user.
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

      // If it's already paid, do nothing and just return it.
      if (invoice.status === 'PAID') {
        return invoice;
      }

      // 2. Generate a new, unique bill number for the transaction record.
      const newBillNo = await generateBillNumber(organisationId);
      
      // 3. Create the corresponding TransactionRecord.
      const newTransaction = await tx.transactionRecord.create({
        data: {
          billNo: newBillNo,
          totalPrice: invoice.totalAmount,
          paymentMethod: 'From Invoice',
          amountPaid: invoice.totalAmount,
          balance: 0,
          billingMode: 'online',
          organisationId: organisationId,
          date: new Date(),
          time: new Date(),
          notes: `Generated from Invoice #${invoice.invoiceNumber}`,
          status: 'confirmed',
          paymentStatus: 'PAID',
          // Create the transaction items from the invoice items.
          items: {
            create: invoice.items.map(item => ({
              quantity: item.quantity,
              totalPrice: item.total,
              productId: item.productId,
            })),
          },
        },
      });

      // 4. Update inventory for each product on the invoice.
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

      // 5. Update the invoice to mark it as PAID and link it to the new transaction.
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
    if (error.message === 'Invoice not found') {
        return new NextResponse('Invoice not found', { status: 404 });
    }
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}