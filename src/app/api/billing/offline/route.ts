// app/api/billing/route.ts
import * as Sentry from "@sentry/nextjs";
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth-options';
import { Prisma } from '@prisma/client';
import { processTransaction } from '@/lib/transaction';
import moment from 'moment-timezone';

interface BillItem {
  productId: number;
  quantity: number;
  total: number;
}

interface CustomerDetails {
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
  date?: string;
  time?: string;
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
  return {
    date: indianDateTime.format('YYYY-MM-DD'),
    time: indianDateTime.format('HH:mm:ss')
  };
}

export async function POST(request: Request) {
  const transaction = Sentry.startTransaction({
    name: "create-bill",
    op: "billing"
  });

  Sentry.configureScope(scope => {
    scope.setSpan(transaction);
  });

  try {
    const sessionSpan = transaction.startChild({
      op: "auth",
      description: "Check authentication"
    });

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      sessionSpan.setStatus("unauthorized");
      sessionSpan.finish();
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    sessionSpan.finish();

    const data: BillRequest = await request.json();

    Sentry.setContext("bill-request", {
      itemCount: data.items?.length,
      total: data.total,
      paymentMethod: data.paymentDetails?.method
    });

    if (!data.items?.length || !data.customerDetails || !data.paymentDetails || !data.total) {
      Sentry.captureMessage("Invalid request data", "warning");
      return NextResponse.json({ success: false, error: 'Invalid request data' }, { status: 400 });
    }

    const organisationId = parseInt(session.user.id, 10);
    const { date, time } = getCurrentIndianDateTime();

    const transactionData = {
      ...data,
      date,
      time
    };

    const processSpan = transaction.startChild({
      op: "process-transaction",
      description: "Process billing transaction"
    });

    const transactionId = await processTransaction(transactionData, organisationId);
    processSpan.finish();

    const retrieveSpan = transaction.startChild({
      op: "retrieve-bill",
      description: "Retrieve bill details"
    });

    const bill = await prisma.transactionRecord.findUnique({
      where: { id: transactionId },
      include: {
        organisation: true,
        customer: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    retrieveSpan.finish();

    if (!bill) {
      throw new Error('Failed to retrieve bill details');
    }

    const response = {
      id: bill.id,
      billNo: bill.billNo,
      totalPrice: serializeDecimal(bill.totalPrice),
      date: serializeDate(bill.date),
      time: serializeTime(bill.time),
      status: bill.status,
      organisation: bill.organisation ? {
        name: bill.organisation.name || '',
        shopName: bill.organisation.shopName || '',
        flatNo: bill.organisation.flatNo || '',
        street: bill.organisation.street || '',
        district: bill.organisation.district || '',
        state: bill.organisation.state || '',
        pincode: bill.organisation.pincode || '',
        phone: bill.organisation.mobileNumber || '',
        websiteAddress: bill.organisation.websiteAddress || '',
      } : null,
      customer: {
        id: bill.customer?.id,
        name: bill.customer?.name || 'Walk-in Customer',
        phone: bill.customer?.phone || '-',
      },
      items: bill.items.map((item) => ({
        id: item.id,
        quantity: serializeDecimal(item.quantity),
        totalPrice: serializeDecimal(item.totalPrice),
        product: {
          id: item.product.id,
          name: item.product.name || '',
          SKU: item.product.SKU || '',
          sellingPrice: serializeDecimal(item.product.sellingPrice),
        },
      })),
    };

    transaction.finish();
    return NextResponse.json({ success: true, data: response }, { status: 201 });

  } catch (error: any) {
    Sentry.captureException(error, {
      extra: {
        message: error.message,
        stack: error.stack,
        prismaError: error instanceof Prisma.PrismaClientKnownRequestError ? {
          code: error.code,
          meta: error.meta
        } : undefined
      }
    });

    transaction.setStatus("error");
    transaction.finish();

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return NextResponse.json({
        success: false,
        error: 'Database operation failed',
        code: error.code,
      }, { status: 400 });
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to create bill',
      details: error instanceof Error ? error.message : 'An unexpected error occurred',
    }, { status: 500 });
  }
}