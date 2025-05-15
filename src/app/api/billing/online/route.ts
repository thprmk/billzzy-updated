// app/api/create_online_bill/route.ts - Updated

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
      productWeight: z.number().optional(),
    })
  ),
  billingMode: z.string().optional().default('online'),
  notes: z.string().nullable().optional().default(null),
  shippingMethodId: z.number().int().positive().nullable().default(null),
  taxAmount: z.number().optional().default(0),
  customShipping: z
    .object({
      price: z.number().nonnegative(),
      name: z.string().optional(),
    })
    .nullable()
    .optional(),
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

    // Use the provided total from the request instead of recalculating
    // This fixes an issue where price might be different than sellingPrice
    const itemTotal = Math.round(total);
    totalPrice += itemTotal;

    transactionItemsData.push({
      productId,
      quantity,
      totalPrice: itemTotal,
    });

    processedItems.push({
      productName: dbProduct.name,
      SKU: dbProduct.SKU,
      quantity,
      unitPrice: Math.round(price || dbProduct.sellingPrice), // Use price from request or fallback to DB
      amount: itemTotal,
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
  taxAmount: number,
  shippingCost: number
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
      taxAmount: taxAmount,
      shippingCost: shippingCost, // Added shippingCost field to the record
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
  
      // 1) Calculate shipping cost
      let shippingCost = 0;
      let baseRate = 0;
      let shippingMethodDetails = null;
      
      const validShippingMethodId = shippingMethodId ?? 0;
      let shippingMethod = null;

      if (shippingMethodId !== 0 && shippingMethodId !== null) {
        shippingMethod = await prisma.shippingMethod.findFirst({
          where: {
            id: validShippingMethodId,
            organisationId: organisationId,
            isActive: true,
          },
        });
      }
  
      // Handle custom shipping first (priority over selected shipping method)
      if (customShipping && customShipping.price) {
        shippingCost = customShipping.price;
        const customShippingName = customShipping.name || "Custom Shipping";
        shippingMethodDetails = {
          type: "CUSTOM_SHIPPING",
          name: customShippingName,
          cost: customShipping.price,
          useWeight: false,
          ratePerKg: null,
          baseRate: customShipping.price,
        };
        console.log(`Using one-time custom shipping cost: ${shippingCost}`);
      } else if (shippingMethodId !== null && shippingMethod) {
        // Use selected shipping method if no custom shipping
        if (shippingMethod.type === 'FREE_SHIPPING') {
          shippingCost = 0;
        } else if (shippingMethod.type === 'COURIER_PARTNER') {
          if (shippingMethod.useWeight && shippingMethod.ratePerKg) {
            const totalWeight = items.reduce(
              (sum, item) => sum + (item.productWeight || 0) * item.quantity,
              0
            );
            shippingCost = Math.round(totalWeight * shippingMethod.ratePerKg);
            baseRate = shippingMethod.ratePerKg;
          } else {
            shippingCost = Math.round(shippingMethod.fixedRate || 0);
            baseRate = shippingMethod.fixedRate;
          }
        }
        
        shippingMethodDetails = {
          type: shippingMethod.type,
          name: shippingMethod.name,
          cost: shippingCost,
          useWeight: shippingMethod.useWeight || false,
          ratePerKg: shippingMethod.ratePerKg,
          baseRate: baseRate,
          id: shippingMethod.id
        };
        
        console.log(`Using shipping method cost: ${shippingCost} for method: ${shippingMethod.name}`);
      }
  
      // Parse the tax amount to ensure it's a number
      const parsedTaxAmount = Math.round(Number(taxAmount) || 0);
      console.log(`Tax amount: ${parsedTaxAmount}`);
      
      // 3) Calculate the final total (items total + shipping cost + tax)
      const itemsTotalPrice = Math.round(items.reduce((sum: number, item: any) => sum + Number(item.total), 0));
      console.log(`Items total price: ${itemsTotalPrice}`);

      // Round the shipping cost
      const roundedShippingCost = Math.round(shippingCost);
      console.log(`Shipping cost: ${roundedShippingCost}`);


      console.log(`Shipping cost: ${shippingCost}`);
      console.log(`Tax amount: ${parsedTaxAmount}`);

      // Calculate the final total with rounded values
      const finalTotal = itemsTotalPrice + roundedShippingCost + parsedTaxAmount;
      console.log(`Final total: ${finalTotal}`);
  
      const result = await executeWithRetry(async () => {
        return await prisma.$transaction(async (tx) => {
          const customer = await tx.customer.findUnique({
            where: { id: customerId },
          });
  
          if (!customer || customer.organisationId !== organisationId) {
            throw new Error('Customer not found or does not belong to your organisation.');
          }
  
          const { productDetails, transactionItemsData } = await processItems(tx, items, organisationId);

          // Create the transaction record with final total (including shipping and tax)
          const newBill = await createTransactionRecord(
            tx,
            organisationId,
            customer.id,
            finalTotal,
            billingMode || 'online',
            notes || null,
            parsedTaxAmount,
            shippingCost
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

          // Store shipping details for this transaction without creating a permanent method
          if (shippingMethodDetails) {
            await tx.transactionShipping.create({
              data: {
                transactionId: newBill.id,
                methodName: shippingMethodDetails.name,
                methodType: shippingMethodDetails.type,
                totalCost: shippingCost,
                baseRate: shippingMethodDetails.baseRate || shippingCost,
              },
            });
          }
  
          return { 
            newBill, 
            customer, 
            productDetails,
            shippingDetails: shippingMethodDetails,
            itemsTotal: itemsTotalPrice,
            taxAmount: parsedTaxAmount
          };
        });
      });
  
      const { newBill, customer, productDetails, shippingDetails, itemsTotal, taxAmount: finalTaxAmount } = result;
  
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
          items_total: itemsTotal,
          shipping_cost: shippingDetails?.cost || 0,
          tax_amount: finalTaxAmount || 0
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
        shipping_details: shippingDetails, // Add this to response
        tax_amount: finalTaxAmount || 0
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
          
          if (shippingDetails && shippingDetails.name) {
            message = `Bill Created! Products: ${productsString}, Amount: ${newBill.totalPrice}, Address: ${fullAddress}, Shipping: ${shippingDetails.name} (₹${shippingDetails.cost}).`;
          } else {
            message = `Bill Created! Products: ${productsString}, Amount: ${newBill.totalPrice}, Address: ${fullAddress}. Courier details will be sent soon.`;
          }
  
          // Uncomment this to enable SMS sending
          // await sendBillingSMS({
          //   phone: customer.phone,
          //   companyName: organisation.shopName,
          //   products: productsString,
          //   amount: newBill.totalPrice,
          //   address: fullAddress,
          //   organisationId: organisation.id,
          //   billNo: newBill.billNo,
          //   shippingMethod: shippingDetails && shippingDetails.name ? {
          //     name: shippingDetails.name,
          //     type: shippingDetails.type,
          //     cost: shippingDetails.cost || 0
          //   } : null
          // });
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