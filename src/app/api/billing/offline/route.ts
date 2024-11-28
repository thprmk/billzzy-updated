// app/api/billing/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import { authOptions } from '../../auth/[...nextauth]/route';
import { Prisma } from '@prisma/client';
import { processTransaction } from '@/lib/transaction';

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
    return new Date(date).toISOString();
  } catch {
    return '';
  }
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

    // Validate request data
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

    // Process the transaction and get bill details
    const transactionId = await processTransaction(data, organisationId);

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
      throw new Error('Failed to retrieve bill details');
    }

    // Format the response data
    const response = {
      id: bill.id,
      billNo: bill.billNo,
      totalPrice: serializeDecimal(bill.totalPrice),
      date: serializeDate(bill.date),
      time: serializeDate(bill.time),
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

    // Log the response for debugging purposes
    console.log('Serialized Response:', JSON.stringify(response));

    // Ensure the response is serializable
    const serializableResponse = JSON.parse(JSON.stringify(response));

    return NextResponse.json(
      {
        success: true,
        data: serializableResponse,
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
        error: 'Failed to create bill',
        details: error instanceof Error ? error.message : 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}
