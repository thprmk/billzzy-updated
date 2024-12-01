// app/api/billing/route.ts

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth-options';
import { Prisma } from '@prisma/client';
import { processTransaction } from '@/lib/transaction';
import moment from 'moment-timezone';


// lib/logger.ts

class Logger {
  private formatMessage(level: string, message: string, context: any = {}) {
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      message,
      ...context,
      environment: process.env.VERCEL_ENV,
      deploymentId: process.env.VERCEL_GITHUB_DEPLOYMENT_SHA,
    });
  }

  info(message: string, context: any = {}) {
    console.log(this.formatMessage('info', message, context));
  }

  error(message: string, context: any = {}) {
    console.error(this.formatMessage('error', message, context));
  }

  warn(message: string, context: any = {}) {
    console.warn(this.formatMessage('warn', message, context));
  }

  debug(message: string, context: any = {}) {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(this.formatMessage('debug', message, context));
    }
  }
}

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
    time: indianDateTime.format('HH:mm:ss'),
  };
}

export async function POST(request: Request) {
  const logger = new Logger();
  const requestId = crypto.randomUUID();
  let session;

  try {
    session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      logger.error('Unauthorized access attempt', {
        requestId,
        endpoint: '/api/billing',
        error: 'No valid session found'
      });

      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const data: BillRequest = await request.json();

    logger.info('Received billing request', {
      requestId,
      userId: session.user.id,
      itemCount: data.items?.length
    });

    if (!data.items?.length || !data.customerDetails || !data.paymentDetails || !data.total) {
      logger.error('Invalid request data', {
        requestId,
        userId: session.user.id,
        validationErrors: {
          items: !data.items?.length,
          customerDetails: !data.customerDetails,
          paymentDetails: !data.paymentDetails,
          total: !data.total
        }
      });

      return NextResponse.json(
        { success: false, error: 'Invalid request data' },
        { status: 400 }
      );
    }

    const organisationId = parseInt(session.user.id, 10);
    const { date, time } = getCurrentIndianDateTime();
    const transactionData = { ...data, date, time };

    logger.info('Processing transaction', {
      requestId,
      organisationId,
      transactionDate: date,
      transactionTime: time
    });

    const transactionId = await processTransaction(transactionData, organisationId);

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

    if (!bill) {
      logger.error('Failed to retrieve bill details', {
        requestId,
        transactionId
      });
      throw new Error('Failed to retrieve bill details');
    }

    const response = {
      id: bill.id,
      billNo: bill.billNo,
      totalPrice: serializeDecimal(bill.totalPrice),
      date: serializeDate(bill.date),
      time: serializeTime(bill.time),
      status: bill.status,
      organisation: bill.organisation
        ? {
            name: bill.organisation.name || '',
            shopName: bill.organisation.shopName || '',
            flatNo: bill.organisation.flatNo || '',
            street: bill.organisation.street || '',
            district: bill.organisation.district || '',
            state: bill.organisation.state || '',
            pincode: bill.organisation.pincode || '',
            phone: bill.organisation.mobileNumber || '',
            websiteAddress: bill.organisation.websiteAddress || '',
          }
        : null,
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

    logger.info('Successfully created bill', {
      requestId,
      billId: bill.id,
      billNo: bill.billNo
    });

    const serializableResponse = JSON.parse(JSON.stringify(response));

    return NextResponse.json(
      {
        success: true,
        data: serializableResponse,
      },
      { status: 201 }
    );

  } catch (error: any) {
    logger.error('Failed to process billing request', {
      requestId,
      userId: session?.user?.id,
      errorMessage: error.message,
      errorStack: error.stack,
      errorCode: error instanceof Prisma.PrismaClientKnownRequestError ? error.code : undefined
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
        error: 'Failed to create bill',
        details: process.env.NODE_ENV === 'production' 
          ? 'An unexpected error occurred' 
          : error.message,
      },
      { status: 500 }
    );
  }
}