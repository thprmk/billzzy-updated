// app/api/create_online_bill/route.ts

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-options';
import { z } from 'zod';
import moment from 'moment-timezone';
import { sendBillingSMS } from '@/lib/msg91';
import { Product } from '@prisma/client'; 

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
      productWeight: z.number().optional(),  // Add productWeight here
    })
  ),
  billingMode: z.string().optional().default('online'),
  notes: z.string().nullable().optional().default(null),
  shippingMethodId: z.number().int().positive().nullable().default(null), // ✅ Add comma here
  taxAmount: z.number().optional().default(0), // ✅ Now this is valid
  customShipping: z
  .object({
    price: z.number().nonnegative(),
    name: z.string().optional(),
  })
  
  .nullable()
  .optional(), // Add this line to handle customShipping

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
    const dbProduct = productMap.get(productId) as Product;

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
  notes: string | null,
  taxAmount: number
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
      taxAmount: taxAmount, // ✅ include this
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
      console.log(body, "online orders data");
  
      const parsedData = createBillSchema.safeParse(body);
  
      if (!parsedData.success) {
        return NextResponse.json(
          { success: false, message: 'Invalid request data', errors: parsedData.error.errors },
          { status: 400 }
        );
      }
  
      const { customerId, items, billingMode, notes, shippingMethodId, taxAmount, customShipping } = parsedData.data;
      const organisationId = parseInt(session.user.id, 10);
  
      const organisation = await prisma.organisation.findUnique({
        where: { id: organisationId },
      });
  
      if (!organisation) {
        throw new Error('Organisation not found');
      }
  
      // 1) Check if custom shipping is provided and use its price
      let shippingCost = 0;
      let baseRate = 0; // Default baseRate initialization

      let shippingMethod = null;

if (shippingMethodId !== null) {
  shippingMethod = await prisma.shippingMethod.findFirst({
    where: {
      id: shippingMethodId,
      organisationId: organisationId,
      isActive: true,
    },
  });
}
  
      if (customShipping && customShipping.price) {
        shippingCost = customShipping.price;  // Use custom shipping price
      } else if (shippingMethodId !== null) {
        // 2) If no custom shipping, calculate shipping cost based on selected shipping method
        const shippingMethod = await prisma.shippingMethod.findFirst({
          where: {
            id: shippingMethodId,
            organisationId: organisationId,
            isActive: true,
          },
        });
  

        
        if (shippingMethod) {
          if (shippingMethod.type === 'FREE_SHIPPING') {
            shippingCost = 0;
          } else if (shippingMethod.type === 'COURIER_PARTNER') {
            // Calculate shipping cost based on weight or fixed rate
            if (shippingMethod.useWeight && shippingMethod.ratePerKg) {
              const totalWeight = items.reduce(
                (sum, item) => sum + (item.productWeight || 0) * item.quantity,
                0
              );
              shippingCost = totalWeight * shippingMethod.ratePerKg;
              baseRate = shippingMethod.ratePerKg; // Set the base rate
            } else {
              shippingCost = shippingMethod.fixedRate || 0;
              baseRate = shippingMethod.fixedRate; // Set the base rate
            }
          }
        }
      }
  
      // 3) Calculate the final total (items total + shipping cost + tax)
      const itemsTotalPrice = items.reduce((sum: number, item: any) => sum + item.total, 0);
      const finalTotal = itemsTotalPrice + shippingCost + taxAmount;  // Include custom shipping cost here
  
      const result = await executeWithRetry(async () => {
        return await prisma.$transaction(async (tx) => {
          const customer = await tx.customer.findUnique({
            where: { id: customerId },
          });
  
          if (!customer || customer.organisationId !== organisationId) {
            throw new Error('Customer not found or does not belong to your organisation.');
          }
  
          const { productDetails, transactionItemsData } = await processItems(tx, items, organisationId);
  
          // Create the transaction record with final total (including custom shipping)
          const newBill = await createTransactionRecord(
            tx,
            organisationId,
            customer.id,
            finalTotal, // This final total includes custom shipping
            billingMode || 'online',
            notes || null,
            taxAmount || 0
          );
  
          // Create transaction items in the database
          await tx.transactionItem.createMany({
            data: transactionItemsData.map((item) => ({
              transactionId: newBill.id,
              productId: item.productId,
              quantity: item.quantity,
              totalPrice: item.totalPrice,
            })),
          });
  
          // If shipping method was selected, record shipping details
          if (shippingMethodId !== null) {
            await tx.transactionShipping.create({
              data: {
                transactionId: newBill.id,
                methodName: shippingMethod.name,
                methodType: shippingMethod.type,
                totalCost: shippingCost,
                baseRate: baseRate, // Ensure baseRate is passed correctly
              }
            });
          }
  
          return { newBill, customer, productDetails };
        });
      });
  
      const { newBill, customer, productDetails } = result;
  
      // Prepare the response data
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
