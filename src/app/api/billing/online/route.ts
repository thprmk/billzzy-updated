// app/api/create_online_bill/route.ts

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-options';
import { z } from 'zod';
import { sendBillingSMS } from '@/lib/msg91';
import moment from 'moment-timezone';
import { revalidatePath } from 'next/cache';

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
  notes: z.string().nullable().optional().default(null)
});

interface TransactionOptions {
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
}

interface ProcessedItem {
  productName: string;
  SKU: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

interface TransactionItemData {
  productId: number;
  quantity: number;
  totalPrice: number;
}

async function executeWithRetry<T>(
  operation: () => Promise<T>,
  options: TransactionOptions = {}
): Promise<T> {
  const { timeout = 60000, maxRetries = 3, retryDelay = 2000 } = options;
  let attempts = 0;

  while (attempts < maxRetries) {
    try {
      return await operation();
    } catch (error: any) {
      attempts++;
      const isTransient =
        error.message.includes('Transaction already closed') ||
        error.code === 'P2034' ||
        error.code === 'P2025' ||
        error.code === 'P2002';

      if (attempts === maxRetries || !isTransient) {
        throw error;
      }

      console.warn(`Operation failed (attempt ${attempts}): ${error.message}. Retrying in ${retryDelay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }
  }

  throw new Error('Maximum retry attempts reached');
}

async function processItems(
  tx: any,
  items: any[],
  organisationId: number
): Promise<{ productDetails: ProcessedItem[]; totalPrice: number; transactionItemsData: TransactionItemData[] }> {
  const productIds = items.map((item) => item.productId);
  const dbProducts = await tx.product.findMany({
    where: { id: { in: productIds }, organisationId },
  });

  const productMap = new Map<number, any>();
  dbProducts.forEach((product) => productMap.set(product.id, product));

  const processedItems: ProcessedItem[] = [];
  let totalPrice = 0;
  const transactionItemsData: TransactionItemData[] = [];

  for (const item of items) {
    const { productId, quantity, price, total } = item;
    const dbProduct = productMap.get(productId);

    if (!dbProduct) {
      throw new Error(`Product not found with ID: ${productId}`);
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

    transactionItemsData.push({
      productId,
      quantity,
      totalPrice: calculatedTotal,
    });

    processedItems.push({
      productName: dbProduct.name,
      SKU: dbProduct.SKU,
      quantity,
      unitPrice: dbProduct.sellingPrice,
      amount: calculatedTotal,
    });
  }

  const updatePromises = items.map((item) =>
    tx.product.update({
      where: { id: item.productId },
      data: { quantity: { decrement: item.quantity } },
    })
  );

  await Promise.all(updatePromises);

  return { productDetails: processedItems, totalPrice, transactionItemsData };
}

async function createTransactionRecord(
  tx: any,
  organisationId: number,
  customerId: number,
  totalPrice: number,
  billingMode: string,
  notes:string
) {
  const lastBill = await tx.transactionRecord.findFirst({
    orderBy: { billNo: 'desc' },
  });

  const newBillNo = (lastBill?.billNo || 0) + 1;

  // Get current Indian date and time
  const indianDateTime = moment().tz('Asia/Kolkata');
  
  // Format date as YYYY-MM-DD
  const indianDate = indianDateTime.format('YYYY-MM-DD');
  
  // Format time as HH:mm:ss
  const indianTime = indianDateTime.format('HH:mm:ss');
  console.log(indianDate,indianTime,"time and date");

  return await tx.transactionRecord.create({
    data: {
      billNo: newBillNo,
      totalPrice,
      amountPaid: 0,
      balance: totalPrice,
      billingMode,
      organisationId,
      customerId,
      date: new Date(indianDate), // Store the date
      time: new Date(`1970-01-01T${indianTime}.000Z`), // Store the time
      status: 'paymentPending',
      paymentStatus: 'PENDING',
      paymentMethod: 'offline',
      notes:notes
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
console.log(parsedData,"data-----");

    if (!parsedData.success) {
      return NextResponse.json(
        { success: false, message: 'Invalid request data', errors: parsedData.error.errors },
        { status: 400 }
      );
    }

    const { customerId, items, billingMode,notes } = parsedData.data;
    const organisationId = parseInt(session.user.id, 10);
    // const organisationId = 2;

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

        const { productDetails, totalPrice, transactionItemsData } = await processItems(tx, items, organisationId);
        const newBill = await createTransactionRecord(tx, organisationId, customer.id, totalPrice, billingMode,notes);

        await tx.transactionItem.createMany({
          data: transactionItemsData.map((item) => ({
            transactionId: newBill.id,
            productId: item.productId,
            quantity: item.quantity,
            totalPrice: item.totalPrice,
          })),
        });

        return { newBill, customer, productDetails };
      });
    });

    const { newBill, customer, productDetails } = result;

    const organisation = await prisma.organisation.findUnique({
      where: { id: organisationId },
    });

    if (!organisation) {
      throw new Error('Organisation not found');
    }

    // Format date and time in Indian timezone
    const indianDateTime = moment(newBill.date).tz('Asia/Kolkata');
    const formattedDate = indianDateTime.format('YYYY-MM-DD');
    const formattedTime = indianDateTime.format('hh:mm A');

    const responseData = {
      success: true,
      message: 'Online bill created successfully! Please review the bill before finalizing.',
      bill_id: newBill.id,
      bill_details: {
        bill_no: newBill.billNo,
        date: formattedDate,
        time: formattedTime,
        total_amount: newBill.totalPrice,
      },
      customer_details: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        flat_no: customer.flatNo || '',
        street: customer.street || '',
        district: customer.district || '',
        state: customer.state || '',
        pincode: customer.pincode || '',
      },
      organisation_details: {
        id: organisation.id,
        shop_name: organisation.shopName,
        flatno: organisation.flatNo || '',
        street: organisation.street || '',
        district: organisation.district || '',
        city: organisation.city || '',
        state: organisation.state || '',
        country: organisation.country || '',
        pincode: organisation.pincode || '',
        phone: organisation.mobileNumber || '',
      },
      product_details: productDetails,
      total_amount: newBill.totalPrice,
    };

    // try {
    //   if (customer.phone) {
    //     const productsString = productDetails
    //       .map((item) => `${item.productName} x ${item.quantity}`)
    //       .join(', ');
    
    //     const fullAddress = [
    //       customer.flatNo,
    //       customer.street,
    //       customer.district,
    //       customer.state,
    //       customer.pincode,
    //     ]
    //       .filter(Boolean)
    //       .join(', ');
    
    //     await sendBillingSMS({
    //       phone: customer.phone,
    //       companyName: organisation.shopName,
    //       products: productsString,
    //       amount: newBill.totalPrice,
    //       address: fullAddress,
    //       organisationId: organisation.id,
    //       billNo: newBill.billNo // Add this line
    //     });
    //   }
    // } catch (smsError) {
    //   console.error('SMS sending failed:', smsError);
    //   return NextResponse.json(
    //     {
    //       success: false,
    //       error: smsError,
    //       // details: error.message,
    //     },
    //     { status: 500 }
    //   );
    // }

    revalidatePath('/billing/online');
    revalidatePath('/dashboard');

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
        error: error.message,
        details: error.message,
      },
      { status: 500 }
    );
  }
}