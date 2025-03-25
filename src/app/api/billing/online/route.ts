// app/api/create_online_bill/route.ts

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-options';
import { z } from 'zod';
import moment from 'moment-timezone';
import { sendBillingSMS } from '@/lib/msg91';
import { generateBillNumber } from '@/lib/generateBillNumber';

function addOneMonthClamped(date: Date): Date {
  const newDate = new Date(date.getTime());
  const currentDay = newDate.getDate();
  newDate.setMonth(newDate.getMonth() + 1);
  if (newDate.getDate() < currentDay) {
    newDate.setDate(0);
  }
  return newDate;
}

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
  notes: z.string().nullable().optional().default(null),
  shippingMethodId: z.number().int().positive().nullable().default(null)
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
  notes: string | null
) {
  const lastBill = await tx.transactionRecord.findFirst({
    orderBy: { billNo: 'desc' },
  });

  const newBillNo = await generateBillNumber(tx, organisationId, billingMode as 'online' | 'offline');

  // Get current Indian date and time
  const indianDateTime = moment().tz('Asia/Kolkata');
  
  // Format date as YYYY-MM-DD
  const indianDate = indianDateTime.format('YYYY-MM-DD');
  
  // Format time as HH:mm:ss
  const indianTime = indianDateTime.format('HH:mm:ss');

  return await tx.transactionRecord.create({
    data: {
      billNo: newBillNo,
      totalPrice,
      amountPaid: 0,
      balance: totalPrice,
      billingMode,
      organisationId,
      customerId,
      date: new Date(indianDate),
      time: new Date(`1970-01-01T${indianTime}.000Z`),
      status: 'paymentPending',
      paymentStatus: 'PENDING',
      paymentMethod: 'offline',
      notes: notes,
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

    const { customerId, items, billingMode, notes, shippingMethodId } = parsedData.data;
    const organisationId = parseInt(session.user.id, 10);

    const organisation = await prisma.organisation.findUnique({
      where: { id: organisationId },
    });

    if (!organisation) {
      throw new Error('Organisation not found');
    }


  // 1) If user is "pro", skip usage check
  if (organisation.subscriptionType !== 'pro') {
    // 2) If now >= endDate => reset monthlyUsage=0, endDate=+1month (clamped)
    const now = new Date();
    if (now >= organisation.endDate) {
      const newEndDate = addOneMonthClamped(now);
      await prisma.organisation.update({
        where: { id: organisationId },
        data: {
          monthlyUsage: 0,
          endDate: newEndDate
        }
      });
      // Refresh the org object in memory
      organisation.monthlyUsage = 0;
      organisation.endDate = newEndDate;
    }

    // 3) If monthlyUsage >= 50, block
    if (organisation.monthlyUsage >= (parseInt(process.env.MONTHLY_FREE_LIMIT ?? '50'))) {
      return NextResponse.json(
        {
          success: false,
          message: 'You have reached the monthly free limit (50 orders). Please wait until your next cycle or upgrade to Pro.'
        },
        { status: 403 }
      );
    }

    // 4) monthlyUsage++ (They are under limit)
    await prisma.organisation.update({
      where: { id: organisationId },
      data: {
        monthlyUsage: { increment: 1 },
      },
    });
  }

    if (items.length === 0) {
      return NextResponse.json(
        { success: false, message: 'At least one product is required.' },
        { status: 400 }
      );
    }

    // If shippingMethodId is provided, validate it
    let shippingMethod = null;
    if (shippingMethodId !== null) {
      shippingMethod = await prisma.shippingMethod.findFirst({
        where: {
          id: shippingMethodId,
          organisationId: organisationId,
          isActive: true,
        },
      });

      if (!shippingMethod) {
        return NextResponse.json(
          { success: false, message: 'Invalid or inactive shipping method.' },
          { status: 400 }
        );
      }
    }

    let baseRate;

    const result = await executeWithRetry(async () => {
      return await prisma.$transaction(async (tx) => {
        const customer = await tx.customer.findUnique({
          where: { id: customerId },
        });

        if (!customer || customer.organisationId !== organisationId) {
          throw new Error('Customer not found or does not belong to your organisation.');
        }

        const { productDetails, totalPrice: itemsTotalPrice, transactionItemsData } = await processItems(tx, items, organisationId);

        let shippingCost = 0;
        let totalWeight: number | null = null;

        if (shippingMethod) {
          // Compute shipping cost if shipping method is selected
          if (shippingMethod.type === 'FREE_SHIPPING') {
            if (shippingMethod.minAmount && itemsTotalPrice < shippingMethod.minAmount) {
              // If below min amount, still 0 or handle differently if needed
              shippingCost = 0;
            } else {
              shippingCost = 0;
            }
          } else if (shippingMethod.type === 'COURIER_PARTNER') {
            if (shippingMethod.useWeight && shippingMethod.ratePerKg) {
              totalWeight = items.reduce((sum, item) => sum + ((item.productWeight || 0) * item.quantity), 0);
              shippingCost = totalWeight * shippingMethod.ratePerKg;
            } else {
              shippingCost = shippingMethod.fixedRate || 0;
            }
          }
        } else {
          // No shipping method selected, shipping cost = 0
          shippingCost = 0;
        }

        const finalTotal = itemsTotalPrice + shippingCost;
        const newBill = await createTransactionRecord(tx, organisationId, customer.id, finalTotal, billingMode || 'online', notes || null);

        await tx.transactionItem.createMany({
          data: transactionItemsData.map((item) => ({
            transactionId: newBill.id,
            productId: item.productId,
            quantity: item.quantity,
            totalPrice: item.totalPrice,
          })),
        });

        // Only create a TransactionShipping record if a shipping method is selected
        if (shippingMethod) {
          baseRate = (!shippingMethod.useWeight && shippingMethod.fixedRate !== null && shippingMethod.fixedRate !== undefined)
            ? shippingMethod.fixedRate
            : null;
          const weightCharge = (shippingMethod.useWeight && shippingMethod.ratePerKg) ? shippingMethod.ratePerKg : null;

          await tx.transactionShipping.create({
            data: {
              transactionId: newBill.id,
              methodName: shippingMethod.name,
              methodType: shippingMethod.type,
              baseRate: baseRate === null ? 0 : baseRate,
              weightCharge: weightCharge,
              totalWeight: totalWeight,
              totalCost: shippingCost,
            }
          });
        }

        return { newBill, customer, productDetails };
      });
    });

    const { newBill, customer, productDetails } = result;



 

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
        ].filter(Boolean).join(', ');

        let message: string;

        if (shippingMethod) {
          // If shippingMethod is chosen, include details in the SMS
          const shippingName = shippingMethod.name;
          const shippingRate = baseRate === null ? 0 : baseRate;
          message = `Bill Created! Products: ${productsString}, Amount: ${newBill.totalPrice}, Address: ${fullAddress}, Shipping: ${shippingName} (₹${shippingRate}).`;
        } else {
          // No shipping method selected
          message = `Bill Created! Products: ${productsString}, Amount: ${newBill.totalPrice}, Address: ${fullAddress}. Courier details will be sent soon.`;
        }

        await sendBillingSMS({
          phone: customer.phone,
          companyName: organisation.shopName,
          products: productsString,
          amount: newBill.totalPrice,
          address: fullAddress,
          organisationId: organisation.id,
          billNo: newBill.billNo,
          shippingMethod: shippingMethod ? {
            name: shippingMethod.name,
            type: shippingMethod.type,
            cost: baseRate || 0
          } : null
        });

      }
    } catch (smsError) {
      console.error('SMS sending failed:', smsError);
      return NextResponse.json(
        {
          success: false,
          error: smsError,
        },
        { status: 500 }
      );
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
        error: error.message,
        details: error.message,
      },
      { status: 500 }
    );
  }
}
