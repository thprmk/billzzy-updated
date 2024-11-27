// app/api/create_online_bill/route.ts

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import { z } from 'zod';
import { sendBillingSMS } from '@/lib/msg91';

const createBillSchema = z.object({
  customerId: z.number().int().positive(),
  items: z.array(
    z.object({
      productId: z.number().int().positive(),
      quantity: z.number().int().positive(),
      price: z.number().nonnegative(),
      total: z.number().nonnegative(),
    })
  ),
  billingMode: z.string().optional().default('online'),
});

interface TransactionOptions {
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
}

async function executeWithRetry<T>(
  operation: () => Promise<T>,
  options: TransactionOptions = {}
): Promise<T> {
  const {
    timeout = 60000,
    maxRetries = 3,
    retryDelay = 2000
  } = options;

  let attempts = 0;

  while (attempts < maxRetries) {
    try {
      return await operation();
    } catch (error) {
      attempts++;
      const isTimeout = error.message.includes('Transaction already closed') ||
                       error.code === 'P2034';

      if (attempts === maxRetries || !isTimeout) {
        throw error;
      }

      console.log(`Retrying operation, attempt ${attempts + 1} of ${maxRetries}`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }
  throw new Error('Maximum retry attempts reached');
}

async function processItems(tx: any, items: any[], organisationId: number) {
  const productDetails = [];
  let totalPrice = 0;
  const transactionItemsData = [];

  for (const item of items) {
    const { productId, quantity, price, total } = item;

    const dbProduct = await tx.product.findUnique({
      where: { id: productId },
    });

    if (!dbProduct) {
      throw new Error(`Product not found with ID: ${productId}`);
    }

    if (dbProduct.organisationId !== organisationId) {
      throw new Error(`Product ID ${productId} does not belong to your organisation.`);
    }

    if (dbProduct.quantity < quantity) {
      throw new Error(
        `Not enough inventory for ${dbProduct.name} (SKU: ${dbProduct.SKU}). Available: ${dbProduct.quantity}, Requested: ${quantity}`
      );
    }

    const calculatedTotal = dbProduct.sellingPrice * quantity;

    if (calculatedTotal !== total) {
      throw new Error(
        `Total mismatch for ${dbProduct.name}. Expected: ${calculatedTotal}, Received: ${total}`
      );
    }

    totalPrice += calculatedTotal;

    await tx.product.update({
      where: { id: productId },
      data: { quantity: { decrement: quantity } }
    });

    transactionItemsData.push({
      productId,
      quantity,
      totalPrice: calculatedTotal,
    });

    productDetails.push({
      productName: dbProduct.name,
      SKU: dbProduct.SKU,
      quantity,
      unitPrice: dbProduct.sellingPrice,
      amount: calculatedTotal,
    });
  }

  return { productDetails, totalPrice, transactionItemsData };
}

async function createTransactionRecord(
  tx: any, 
  organisationId: number, 
  customerId: number, 
  totalPrice: number, 
  billingMode: string
) {
  const lastBill = await tx.transactionRecord.findFirst({
    orderBy: { billNo: 'desc' },
  });
  
  const newBillNo = (lastBill?.billNo || 0) + 1;

  return await tx.transactionRecord.create({
    data: {
      billNo: newBillNo,
      totalPrice,
      amountPaid: 0,
      balance: totalPrice,
      billingMode,
      organisationId,
      customerId,
      date: new Date(),
      time: new Date(),
      status: 'confirmed',
      paymentMethod: 'pending',
    },
  });
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsedData = createBillSchema.safeParse(body);

    if (!parsedData.success) {
      return NextResponse.json(
        { success: false, message: 'Invalid request data', errors: parsedData.error.errors },
        { status: 400 }
      );
    }

    const { customerId, items, billingMode } = parsedData.data;
    const organisationId = parseInt(session.user.id);

    if (items.length === 0) {
      return NextResponse.json(
        { success: false, message: 'At least one product is required.' },
        { status: 400 }
      );
    }

    const result = await executeWithRetry(async () => {
      return await prisma.$transaction(async (tx) => {
        const customer = await tx.customer.findUnique({
          where: { id: customerId },
        });

        if (!customer) {
          throw new Error(`Customer not found with ID: ${customerId}`);
        }

        if (customer.organisationId !== organisationId) {
          throw new Error('Customer does not belong to your organisation.');
        }

        const { productDetails, totalPrice, transactionItemsData } = 
          await processItems(tx, items, organisationId);

        const newBill = await createTransactionRecord(
          tx,
          organisationId,
          customer.id,
          totalPrice,
          billingMode
        );

        for (const itemData of transactionItemsData) {
          await tx.transactionItem.create({
            data: {
              transactionId: newBill.id,
              ...itemData,
            },
          });
        }

        return { newBill, customer, productDetails };
      }, {
        timeout: 60000,
        maxWait: 15000,
        isolationLevel: 'Serializable'
      });
    });

    const { newBill, customer, productDetails } = result;

    const organisation = await prisma.organisation.findUnique({
      where: { id: organisationId },
    });

    if (!organisation) {
      throw new Error('Organisation not found');
    }

    const billDatetime = new Date(newBill.date);
    const time = new Date(newBill.time);
    const hours = time.getHours() % 12 || 12;
    const minutes = String(time.getMinutes()).padStart(2, '0');
    const ampm = time.getHours() >= 12 ? 'PM' : 'AM';
    const formattedTime = `${hours}:${minutes} ${ampm}`;

    const responseData = {
      success: true,
      message: 'Online bill created successfully! Please review the bill before finalizing.',
      bill_id: newBill.id,
      bill_details: {
        bill_no: newBill.billNo,
        date: billDatetime.toISOString().split('T')[0],
        time: formattedTime,
        total_amount: newBill.totalPrice,
      },
      customer_details: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        flat_no: customer.flatNo,
        street: customer.street,
        district: customer.district,
        state: customer.state,
        pincode: customer.pincode,
      },
      organisation_details: {
        id: organisation.id,
        shop_name: organisation.shopName,
        flatno: organisation.flatNo,
        street: organisation.street,
        district: organisation.district,
        city: organisation.city,
        state: organisation.state,
        country: organisation.country,
        pincode: organisation.pincode,
        phone: organisation.mobileNumber,
      },
      product_details: productDetails,
      total_amount: newBill.totalPrice,
    };

    try {
      if (customer.phone) {
        const productsString = productDetails
          .map(item => `${item.productName} x ${item.quantity}`)
          .join(', ');
        
        const fullAddress = `${customer.flatNo || ''}, ${customer.street || ''}, ${customer.district || ''}, ${customer.state || ''} - ${customer.pincode || ''}`.trim();
        
        await sendBillingSMS({
          phone: customer.phone,
          companyName: organisation.shopName,
          products: productsString,
          amount: newBill.totalPrice,
          address: fullAddress,
          organisationId: organisation.id
        });
      }
    } catch (smsError) {
      console.error('SMS sending failed:', smsError);
      // Continue processing even if SMS fails
    }

    return NextResponse.json(responseData, { status: 200 });
  } catch (error: any) {
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create bill',
        details: error.message,
      },
      { status: 500 }
    );
  }
}