import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import { authOptions } from '../../auth/[...nextauth]/route';
import { Prisma } from '@prisma/client';

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

async function generateBillNumber(): Promise<number> {
  const lastBill = await prisma.transactionRecord.findFirst({
    orderBy: { billNo: 'desc' },
  });
  return (lastBill?.billNo ?? 0) + 1;
}

async function processTransaction(data: BillRequest, organisationId: number) {
  return await prisma.$transaction(async (tx) => {
    // Find or create customer
    let customer = await tx.customer.findFirst({
      where: {
        phone: data.customerDetails.phone,
        organisationId
      }
    });

    if (!customer) {
      customer = await tx.customer.create({
        data: {
          name: data.customerDetails.name,
          phone: data.customerDetails.phone,
          organisationId
        }
      });
    }

    // Generate bill number and create transaction record
    const billNo = await generateBillNumber();
    const transaction = await tx.transactionRecord.create({
      data: {
        billNo,
        totalPrice: data.total,
        billingMode: 'offline',
        paymentMethod: data.paymentDetails.method,
        amountPaid: data.paymentDetails.amountPaid,
        balance: data.paymentDetails.amountPaid - data.total,
        organisationId,
        customerId: customer.id,
        date: new Date(),
        time: new Date(),
        status: 'confirmed'
      }
    });

    // Process each item in the bill
    for (const item of data.items) {
      const product = await tx.product.findUnique({
        where: { id: item.productId }
      });

      if (!product) {
        throw new Error(`Product not found: ${item.productId}`);
      }

      if (product.quantity < item.quantity) {
        throw new Error(`Insufficient stock for ${product.name}`);
      }

      // Update product quantity and create transaction item
      await tx.product.update({
        where: { id: item.productId },
        data: { quantity: { decrement: item.quantity } }
      });

      await tx.transactionItem.create({
        data: {
          transactionId: transaction.id,
          productId: item.productId,
          quantity: item.quantity,
          totalPrice: item.total
        }
      });
    }

    return transaction.id;
  }, {
    maxWait: 5000,
    timeout: 10000,
    isolationLevel: 'Serializable'
  });
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    const data: BillRequest = await request.json();
    
    // Validate request data
    if (!data.items?.length || !data.customerDetails || !data.paymentDetails || !data.total) {
      return NextResponse.json({
        success: false,
        error: 'Invalid request data'
      }, { status: 400 });
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
            product: true
          }
        }
      }
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
      organisation: bill.organisation ? {
        name: bill.organisation.name || '',
        shopName: bill.organisation.shopName || '',
        flatNo: bill.organisation.flatNo || '',
        street: bill.organisation.street || '',
        district: bill.organisation.district || '',
        state: bill.organisation.state || '',
        pincode: bill.organisation.pincode || '',
        phone: bill.organisation.mobileNumber || '',
        websiteAddress: bill.organisation.websiteAddress || ''
      } : null,
      customer: {
        id: bill.customer?.id,
        name: bill.customer?.name || 'Walk-in Customer',
        phone: bill.customer?.phone || '-'
      },
      items: bill.items.map(item => ({
        id: item.id,
        quantity: serializeDecimal(item.quantity),
        totalPrice: serializeDecimal(item.totalPrice),
        product: {
          id: item.product.id,
          name: item.product.name || '',
          SKU: item.product.SKU || '',
          sellingPrice: serializeDecimal(item.product.sellingPrice)
        }
      }))
    };

    return NextResponse.json({
      success: true,
      data: response
    }, { status: 201 });

  } catch (error) {
    console.error('API Error:', {
      message: error.message,
      stack: error.stack
    });

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return NextResponse.json({
        success: false,
        error: 'Database operation failed',
        code: error.code
      }, { status: 400 });
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to create bill',
      details: error instanceof Error ? error.message : 'An unexpected error occurred'
    }, { status: 500 });
  }
}