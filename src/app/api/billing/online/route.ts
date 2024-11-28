// app/api/create_online_bill/route.ts

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import { z } from 'zod';
import { sendBillingSMS } from '@/lib/msg91';

// Define Zod schema for request validation
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

// Define interfaces for clarity and type safety
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

// Retry mechanism to handle transient errors
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
        error.code === 'P2002'; // Add more transient error codes as needed

      if (attempts === maxRetries || !isTransient) {
        throw error;
      }

      console.warn(`Operation failed (attempt ${attempts}): ${error.message}. Retrying in ${retryDelay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }
  }

  throw new Error('Maximum retry attempts reached');
}

// Process all items in bulk
async function processItems(
  tx: any,
  items: any[],
  organisationId: number
): Promise<{ productDetails: ProcessedItem[]; totalPrice: number; transactionItemsData: TransactionItemData[] }> {
  const productIds = items.map((item) => item.productId);

  // Batch fetch all products
  const dbProducts = await tx.product.findMany({
    where: { id: { in: productIds }, organisationId },
  });

  // Create a map for quick lookup
  const productMap = new Map<number, any>();
  dbProducts.forEach((product) => productMap.set(product.id, product));

  // Validate all items
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

    // Prepare data for bulk update and insertion
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

  // Batch update product quantities
  const updatePromises = items.map((item) =>
    tx.product.update({
      where: { id: item.productId },
      data: { quantity: { decrement: item.quantity } },
    })
  );

  await Promise.all(updatePromises);

  return { productDetails: processedItems, totalPrice, transactionItemsData };
}

// Create a new transaction record
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

// Main POST handler
export async function POST(request: Request) {
  try {
    // Authenticate the user
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate the request body
    const body = await request.json();
    const parsedData = createBillSchema.safeParse(body);

    if (!parsedData.success) {
      return NextResponse.json(
        { success: false, message: 'Invalid request data', errors: parsedData.error.errors },
        { status: 400 }
      );
    }

    const { customerId, items, billingMode } = parsedData.data;
    const organisationId = parseInt(session.user.id, 10);

    if (items.length === 0) {
      return NextResponse.json(
        { success: false, message: 'At least one product is required.' },
        { status: 400 }
      );
    }

    // Execute the transaction with retry logic
    const result = await executeWithRetry(async () => {
      return await prisma.$transaction(async (tx) => {
        // Fetch customer
        const customer = await tx.customer.findUnique({
          where: { id: customerId },
        });

        if (!customer) {
          throw new Error(`Customer not found with ID: ${customerId}`);
        }

        if (customer.organisationId !== organisationId) {
          throw new Error('Customer does not belong to your organisation.');
        }

        // Process items
        const { productDetails, totalPrice, transactionItemsData } = await processItems(tx, items, organisationId);

        // Create transaction record
        const newBill = await createTransactionRecord(tx, organisationId, customer.id, totalPrice, billingMode);

        // Bulk create transaction items
        await tx.transactionItem.createMany({
          data: transactionItemsData.map((item) => ({
            transactionId: newBill.id,
            productId: item.productId,
            quantity: item.quantity,
            totalPrice: item.totalPrice,
          })),
        });

        return { newBill, customer, productDetails };
      }, {
        timeout: 60000, // Adjust as needed
        isolationLevel: 'Serializable',
      });
    }, {
      timeout: 60000,
      maxRetries: 3,
      retryDelay: 2000,
    });

    const { newBill, customer, productDetails } = result;

    // Fetch organisation details
    const organisation = await prisma.organisation.findUnique({
      where: { id: organisationId },
    });

    if (!organisation) {
      throw new Error('Organisation not found');
    }

    // Format date and time
    const billDatetime = new Date(newBill.date);
    const time = new Date(newBill.time);
    const hours = time.getHours() % 12 || 12;
    const minutes = String(time.getMinutes()).padStart(2, '0');
    const ampm = time.getHours() >= 12 ? 'PM' : 'AM';
    const formattedTime = `${hours}:${minutes} ${ampm}`;

    // Prepare response data
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

    // Send SMS if customer has a phone number
    try {
      if (customer.phone) {
        const productsString = productDetails
          .map((item) => `${item.productName} x ${item.quantity}`)
          .join(', ');

        const fullAddress = [
          customer.flatNo,
          customer.street,
          customer.district,
          customer.state,
          customer.pincode,
        ]
          .filter(Boolean)
          .join(', ');

        await sendBillingSMS({
          phone: customer.phone,
          companyName: organisation.shopName,
          products: productsString,
          amount: newBill.totalPrice,
          address: fullAddress,
          organisationId: organisation.id,
        });
      }
    } catch (smsError) {
      console.error('SMS sending failed:', smsError);
      // Continue processing even if SMS fails
    }

    // Return the successful response
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
