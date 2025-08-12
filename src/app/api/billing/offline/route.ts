// src/app/api/billing/offline/route.ts

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth-options';
import { Prisma } from '@prisma/client';
import moment from 'moment-timezone';

// Interfaces for the request body
interface BillItem {
  productId: number | null;
  productVariantId: number | null;
  quantity: number;
  price: number;
  total: number;
}
interface CustomerDetails {
  id?: number; 
  name: string;
  phone: string;
}
interface PaymentDetails {
  method: string;
  amountPaid: number;
}
interface BillRequest {
  items: BillItem[];
  customerDetails: CustomerDetails;
  paymentDetails: PaymentDetails;
  total: number;
  notes?: string | null;
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const data: BillRequest = await request.json();
    if (!data.items?.length || !data.customerDetails || !data.paymentDetails || !data.total) {
      return NextResponse.json({ success: false, error: 'Invalid request data' }, { status: 400 });
    }

    const organisationId = parseInt(session.user.id, 10);
    const { items, customerDetails, paymentDetails, total, notes } = data;

    const newBill = await prisma.$transaction(async (tx) => {
      // 1. Find or Create Customer
      let customer;
      if (customerDetails.id) {
        customer = await tx.customer.findUnique({ where: { id: customerDetails.id } });
        if (!customer || customer.organisationId !== organisationId) {
          throw new Error('Customer not found for this organisation.');
        }
      } else {
        customer = await tx.customer.create({
          data: {
            name: customerDetails.name,
            phone: customerDetails.phone,
            organisationId: organisationId,
          },
        });
      }

      // 2. Process Items and Decrement Stock
      for (const item of items) {
        if (item.productVariantId) {
            const variant = await tx.productVariant.findUnique({ where: { id: item.productVariantId } });
            if (!variant || variant.quantity < item.quantity) {
              throw new Error(`Not enough stock for variant ${variant?.SKU || 'variant'}.`);
            }
            await tx.productVariant.update({
              where: { id: item.productVariantId },
              data: { quantity: { decrement: item.quantity } },
            });
        } else if (item.productId) {
            const product = await tx.product.findUnique({ where: { id: item.productId } });
            if (!product || (product.quantity || 0) < item.quantity) {
              throw new Error(`Not enough stock for ${product?.name || 'product'}.`);
            }
            await tx.product.update({
              where: { id: item.productId },
              data: { quantity: { decrement: item.quantity } },
            });
        }
      }

      // 3. Create the Transaction Record
      const indianDateTime = moment().tz('Asia/Kolkata').toDate(); // Get a single, valid Date object
      
      const org = await tx.organisation.update({
        where: { id: organisationId },
        data: { billCounter: { increment: 1 } },
        select: { billCounter: true }
      });
      const newCompanyBillNo = org.billCounter;

      // Create a new, globally unique bill number
      const globallyUniqueBillNo = (organisationId * 10000000) + newCompanyBillNo;

      const transactionRecord = await tx.transactionRecord.create({
        data: {
          companyBillNo: newCompanyBillNo,  // This is the simple number for the user
          billNo: globallyUniqueBillNo,    // This is the safe number for the database
          totalPrice: total,
          paymentMethod: paymentDetails.method,
          amountPaid: paymentDetails.amountPaid,
          balance: total - paymentDetails.amountPaid,
          billingMode: 'offline',
          organisationId: organisationId,
          customerId: customer.id,
          date: indianDateTime,
          time: indianDateTime,
          status: (total - paymentDetails.amountPaid) <= 0 ? 'completed' : 'partial',
          paymentStatus: (total - paymentDetails.amountPaid) <= 0 ? 'PAID' : 'PENDING',
          notes: notes,
        },
      });

      // 4. Create the Transaction Items with correct variant awareness
      await tx.transactionItem.createMany({
        data: items.map(item => {
          if (item.productVariantId) {
            return {
              transactionId: transactionRecord.id,
              productId: null,
              productVariantId: item.productVariantId,
              quantity: item.quantity,
              totalPrice: item.total,
            };
          } else {
            return {
              transactionId: transactionRecord.id,
              productId: item.productId,
              productVariantId: null,
              quantity: item.quantity,
              totalPrice: item.total,
            };
          }
        }),
      });

      return transactionRecord;
    });

    return NextResponse.json(
      { success: true, message: 'Offline bill created successfully!', data: { billId: newBill.id, billNo: newBill.companyBillNo } },
      { status: 201 }
    );
    
  } catch (error: any) {
    console.error('API Error:', { message: error.message, stack: error.stack });
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return NextResponse.json({ success: false, error: 'Database operation failed', code: error.code }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: error.message, details: error instanceof Error ? error.message : 'An unexpected error occurred' }, { status: 500 });
  }
}