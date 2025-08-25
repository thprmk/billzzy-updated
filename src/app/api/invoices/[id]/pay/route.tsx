// src/app/api/invoices/[id]/pay/route.ts

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import generateBillNumber from '@/lib/generateBillNumber';

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
    const updatedInvoice = await prisma.$transaction(async (tx) => {
      
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

      if (invoice.status === 'PAID' && invoice.createdTransactionId) {
        return invoice;
      }

      const newBillNo = await generateBillNumber(organisationId);
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
          items: {
            create: invoice.items.map(item => ({
              quantity: item.quantity,
              totalPrice: item.total,
              productId: item.productId,
            })),
          },
        },
      });

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