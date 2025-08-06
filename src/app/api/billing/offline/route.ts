// app/api/billing/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth-options';
import { Prisma } from '@prisma/client';
import { processTransaction } from '@/lib/transaction';
import moment from 'moment-timezone';

interface BillItem {
  productId: number | null; // Make productId optional (nullable)
  productVariantId: number | null; // Add the new field for variants
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

function serializeDecimal(value: any): number {
  if (typeof value === 'object' && value !== null && typeof value.toNumber === 'function') {
    return value.toNumber();
  }
  const num = Number(value);
  return isNaN(num) ? 0 : num;
}

function serializeDate(date: Date | null): string {
  if (!date) return '';
  try {
    // Convert to Indian timezone and format
    return moment(date).tz('Asia/Kolkata').format('YYYY-MM-DD');
  } catch {
    return '';
  }
}

function serializeTime(time: Date | null): string {
  if (!time) return '';
  try {
    return moment(time).tz('Asia/Kolkata').format('hh:mm A');
  } catch {
    return '';
  }
}

function getCurrentIndianDateTime() {
  const indianDateTime = moment().tz('Asia/Kolkata');
    // Get current Indian date and time
  
    // Format date as YYYY-MM-DD
    const indianDate = indianDateTime.format('YYYY-MM-DD');
    
    // Format time as HH:mm:ss
    const indianTime = indianDateTime.format('HH:mm:ss');
  return {
    date:indianDate,
    time: indianTime
  };
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
        },
        { status: 401 }
      );
    }

    const data: BillRequest = await request.json();

    if (!data.items?.length || !data.customerDetails || !data.paymentDetails || !data.total) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request data',
        },
        { status: 400 }
      );
    }

    const organisationId = parseInt(session.user.id, 10);

    const { items, customerDetails, paymentDetails, total, notes } = data;

    // --- NEW VARIANT-AWARE TRANSACTION LOGIC STARTS HERE ---
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
      const standardItems = items.filter(item => item.productId && !item.productVariantId);
      const variantItems = items.filter(item => item.productVariantId);

      // Process standard products
      for (const item of standardItems) {
        const product = await tx.product.findUnique({ where: { id: item.productId! } });
        if (!product || (product.quantity || 0) < item.quantity) {
          throw new Error(`Not enough stock for ${product?.name || 'product'}.`);
        }
        await tx.product.update({
          where: { id: item.productId! },
          data: { quantity: { decrement: item.quantity } },
        });
        await tx.inventory.updateMany({
          where: { productId: item.productId!, organisationId },
          data: { quantity: { decrement: item.quantity } },
        });
      }

      // Process product variants
      for (const item of variantItems) {
        const variant = await tx.productVariant.findUnique({ where: { id: item.productVariantId! } });
        if (!variant || variant.quantity < item.quantity) {
          throw new Error(`Not enough stock for variant ${variant?.SKU || 'variant'}.`);
        }
        await tx.productVariant.update({
          where: { id: item.productVariantId! },
          data: { quantity: { decrement: item.quantity } },
        });
      }

      // 3. Create the Transaction Record
      const indianDateTime = moment().tz('Asia/Kolkata');
      const indianDate = indianDateTime.format('YYYY-MM-DD');
      const indianTime = indianDateTime.format('HH:mm:ss');
      
      const org = await tx.organisation.update({
        where: { id: organisationId },
        data: { billCounter: { increment: 1 } },
        select: { billCounter: true }
      });
      const newCompanyBillNo = org.billCounter;

      const transactionRecord = await tx.transactionRecord.create({
        data: {
          companyBillNo: newCompanyBillNo,
          billNo: newCompanyBillNo, // Keeping both in sync
          totalPrice: total,
          paymentMethod: paymentDetails.method,
          amountPaid: paymentDetails.amountPaid,
          balance: total - paymentDetails.amountPaid,
          billingMode: 'offline',
          organisationId: organisationId,
          customerId: customer.id,
          date: new Date(indianDate),
          time: new Date(`1970-01-01T${indianTime}Z`),
          status: (total - paymentDetails.amountPaid) <= 0 ? 'completed' : 'partial',
          paymentStatus: (total - paymentDetails.amountPaid) <= 0 ? 'PAID' : 'PENDING',
          notes: notes,
        },
      });

      // 4. Create the Transaction Items with variant awareness
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

    return NextResponse.json(
      {
        success: true,
        message: 'Offline bill created successfully!',
        data: { billId: newBill.id, billNo: newBill.companyBillNo },
      },
      { status: 201 }
    );

    
  } catch (error: any) {
    console.error('API Error:', {
      message: error.message,
      stack: error.stack,
    });

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Database operation failed',
          code: error.code,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message,
        details: error instanceof Error ? error.message : 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}