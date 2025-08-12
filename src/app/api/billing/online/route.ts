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
      productId: z.number().int().positive().nullable(),
      productVariantId: z.number().int().positive().nullable(),
      quantity: z.number().int().positive(),
      price: z.number().nonnegative(),
      total: z.number().nonnegative(),
      productWeight: z.number().optional(),
    })
  ).min(1),
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
    salesSource: z.string().nullable().optional(),
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

type BillItemInput = {
  productId: number | null;
  productVariantId: number | null;
  quantity: number;
  price: number;
  total: number;
};


async function processItems(
  tx: any,
  items: BillItemInput[], // Use our new type here
  organisationId: number
): Promise<{ productDetails: ProcessedItem[]; totalPrice: number; transactionItemsData: any[] }> {
  
  const standardItems = items.filter(item => item.productId && !item.productVariantId);
  const variantItems = items.filter(item => item.productVariantId);

  const productDetails: ProcessedItem[] = [];
  let totalPrice = 0;
  const transactionItemsData: any[] = [];
  
  // --- Process Standard Products ---
  if (standardItems.length > 0) {
    const productIds = standardItems.map(item => item.productId as number); // Assert as number
    const dbProducts = await tx.product.findMany({
      where: { id: { in: productIds }, organisationId },
    });
    // Tell TypeScript the shape of our map's value
    const productMap = new Map<number, { id: number; name: string; SKU: string | null; quantity: number | null }>(
      dbProducts.map((p: any) => [p.id, p])
    );

    for (const item of standardItems) {
      const dbProduct = productMap.get(item.productId!); // Use non-null assertion
      if (!dbProduct) throw new Error(`Product not found with ID: ${item.productId}`);
      if ((dbProduct.quantity || 0) < item.quantity) throw new Error(`Not enough stock for ${dbProduct.name}.`);
      
      const itemTotal = Math.round(item.total);
      totalPrice += itemTotal;
      transactionItemsData.push({ productId: item.productId, quantity: item.quantity, totalPrice: itemTotal });
      productDetails.push({ productName: dbProduct.name, SKU: dbProduct.SKU || '', quantity: item.quantity, unitPrice: Math.round(item.price), amount: itemTotal });
    }
    await Promise.all(standardItems.map(item => tx.product.update({
      where: { id: item.productId },
      data: { quantity: { decrement: item.quantity } },
    })));
  }

  // --- Process Product Variants ---
  if (variantItems.length > 0) {
    const variantIds = variantItems.map(item => item.productVariantId as number); // Assert as number
    const dbVariants = await tx.productVariant.findMany({
      where: { id: { in: variantIds } },
      include: { product: true }
    });
    // Tell TypeScript the shape of our map's value, including the nested product
    const variantMap = new Map<number, { id: number; quantity: number; SKU: string; size: string | null; color: string | null; product: { name: string; organisationId: number } }>(
      dbVariants.map((v: any) => [v.id, v])
    );

    for (const item of variantItems) {
      const dbVariant = variantMap.get(item.productVariantId!); // Use non-null assertion
      if (!dbVariant || dbVariant.product.organisationId !== organisationId) throw new Error(`Product variant not found with ID: ${item.productVariantId}`);
      if (dbVariant.quantity < item.quantity) throw new Error(`Not enough stock for ${dbVariant.product.name} (${dbVariant.size || ''}/${dbVariant.color || ''}).`);
      
      const itemTotal = Math.round(item.total);
      totalPrice += itemTotal;
      transactionItemsData.push({ productVariantId: item.productVariantId, quantity: item.quantity, totalPrice: itemTotal });
      productDetails.push({ productName: `${dbVariant.product.name} (${dbVariant.size || ''}/${dbVariant.color || ''})`, SKU: dbVariant.SKU, quantity: item.quantity, unitPrice: Math.round(item.price), amount: itemTotal });
    }
    await Promise.all(variantItems.map(item => tx.productVariant.update({
      where: { id: item.productVariantId },
      data: { quantity: { decrement: item.quantity } },
    })));
  }

  return { productDetails, totalPrice, transactionItemsData };
}
async function createTransactionRecord(
  tx: any,
  organisationId: number,
  customerId: number,
  totalPrice: number,
  billingMode: string,
  notes: string | null,
  taxAmount: number,
  companyBillNo: number, // This is the SAFE number
  shippingCost: number,
  salesSource: string | null | undefined
) {
  const indianDateTime = moment().tz('Asia/Kolkata').toDate();

  // Create a new, globally unique bill number
  const globallyUniqueBillNo = (organisationId * 10000000) + companyBillNo;

  return await tx.transactionRecord.create({
    data: {
      billNo: globallyUniqueBillNo, // Use the guaranteed-unique number for the database
      companyBillNo: companyBillNo, // Keep the simple number for the user
      totalPrice,
      amountPaid: 0,
      balance: totalPrice,
      billingMode,
      organisationId,
      customerId,
      date: indianDateTime,
      time: indianDateTime,
      status: 'paymentPending',
      paymentStatus: 'PENDING',
      paymentMethod: 'online', // Corrected to 'online'
      notes: notes,
      taxAmount: taxAmount,
      shippingCost: shippingCost,
      salesSource: salesSource,
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

    const { customerId, items, billingMode, notes, shippingMethodId, taxAmount, customShipping, salesSource } = parsedData.data;
    const organisationId = parseInt(session.user.id, 10);

    const organisation = await prisma.organisation.findUnique({ // Make organisation mutable
      where: { id: organisationId },
    });

    if (!organisation) {
      throw new Error('Organisation not found');
    }

    // --- START: MONTHLY USAGE TRACKING ---
    if (organisation.subscriptionType !== 'pro') {
      const now = new Date();
      let needsOrgUpdateForUsage = false;
      let orgUpdateData: any = {};


      if (now >= organisation.endDate) {
        const newEndDate = addOneMonthClamped(now);
        orgUpdateData.monthlyUsage = 0;
        orgUpdateData.endDate = newEndDate;
        needsOrgUpdateForUsage = true;

        // Refresh the org object in memory for subsequent checks in this request
        organisation.monthlyUsage = 0;
        organisation.endDate = newEndDate;
      }

      if (organisation.monthlyUsage >= (parseInt(process.env.MONTHLY_FREE_LIMIT ?? '50'))) {
        // If we also needed to update endDate, do that before blocking
        if (needsOrgUpdateForUsage && Object.keys(orgUpdateData).length > 0) {
          await prisma.organisation.update({
            where: { id: organisationId },
            data: orgUpdateData,
          });
        }
        return NextResponse.json(
          {
            success: false,
            message: 'You have reached the monthly free limit. Please wait until your next cycle or upgrade to Pro.'
          },
          { status: 403 }
        );
      }

      // Increment monthly usage
      orgUpdateData.monthlyUsage = { increment: 1 };
      needsOrgUpdateForUsage = true;


      if (needsOrgUpdateForUsage && Object.keys(orgUpdateData).length > 0) {
        await prisma.organisation.update({
          where: { id: organisationId },
          data: orgUpdateData,
        });
      }
    }

    if (items.length === 0) { // Added check for empty items array
      return NextResponse.json(
        { success: false, message: 'At least one product is required.' },
        { status: 400 }
      );
    }

    // 1) Calculate shipping cost
    let shippingCost = 0;
    let baseRate: number | null = 0; // Initialize to null or number
    let shippingMethodDetails = null;

    const validShippingMethodId = shippingMethodId ?? 0; // Use 0 or another non-ID value if null
    let shippingMethod = null;

    // Ensure shippingMethodId is not 0 before querying
    if (shippingMethodId !== null && shippingMethodId !== 0) {
      shippingMethod = await prisma.shippingMethod.findFirst({
        where: {
          id: shippingMethodId, // No longer using validShippingMethodId here as it's confirmed not null/0
          organisationId: organisationId,
          isActive: true,
        },
      });
    }

    // Handle custom shipping first (priority over selected shipping method)
    if (customShipping && typeof customShipping.price === 'number') { // Check price is a number
      shippingCost = customShipping.price;
      const customShippingName = customShipping.name || "Custom Shipping";
      shippingMethodDetails = {
        type: "CUSTOM_SHIPPING" as const, // Use 'as const' for literal type
        name: customShippingName,
        cost: customShipping.price,
        useWeight: false,
        ratePerKg: null,
        baseRate: customShipping.price,
        id: null // No ID for custom shipping
      };
      console.log(`Using one-time custom shipping cost: ${shippingCost}`);
    } else if (shippingMethod) { // Removed shippingMethodId !== null check as shippingMethod implies it
      // Use selected shipping method if no custom shipping
      if (shippingMethod.type === 'FREE_SHIPPING') {
        shippingCost = 0;
        baseRate = 0;
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
          baseRate = shippingMethod.fixedRate || 0; // Ensure baseRate is a number
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
    } else {
      // No shipping method selected and no custom shipping, shipping cost = 0
      shippingCost = 0;
      baseRate = 0;
      console.log("No shipping method selected and no custom shipping. Shipping cost is 0.");
    }


    const parsedTaxAmount = Math.round(Number(taxAmount) || 0);
    console.log(`Tax amount: ${parsedTaxAmount}`);

    const itemsTotalPrice = Math.round(items.reduce((sum: number, item: any) => sum + Number(item.total), 0));
    console.log(`Items total price: ${itemsTotalPrice}`);

    const roundedShippingCost = Math.round(shippingCost);
    console.log(`Rounded Shipping cost: ${roundedShippingCost}`);

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

        // NEW: Get the company-specific bill number
        const org = await tx.organisation.update({
          where: { id: organisationId },
          data: { billCounter: { increment: 1 } },
          select: { billCounter: true }
        });
        const newCompanyBillNo = org.billCounter;

        const newBill = await createTransactionRecord(
          tx,
          organisationId,
          customer.id,
          finalTotal,
          billingMode || 'online',
          notes || null,
          parsedTaxAmount,
          newCompanyBillNo,
          roundedShippingCost,
          salesSource
        );

           await tx.transactionItem.createMany({
          data: transactionItemsData.map((item) => {
            // Check if it's a variant item
            if (item.productVariantId) {
              return {
                transactionId: newBill.id,
                productId: null, // Explicitly null
                productVariantId: item.productVariantId,
                quantity: item.quantity,
                totalPrice: item.totalPrice,
              };
            } 
            // Otherwise, it's a standard item
            else {
              return {
                transactionId: newBill.id,
                productId: item.productId,
                productVariantId: null, // Explicitly null
                quantity: item.quantity,
                totalPrice: item.totalPrice,
              };
            }
          }),
        });

        if (shippingMethodDetails) {
          await tx.transactionShipping.create({
            data: {
              transactionId: newBill.id,
              methodName: shippingMethodDetails.name,
              methodType: shippingMethodDetails.type,
              totalCost: roundedShippingCost, // Store rounded shipping cost
              baseRate: shippingMethodDetails.baseRate || roundedShippingCost, // Ensure baseRate is a number
            },
          });
        }

        return {
          newBill,
          customer,
          productDetails,
          shippingDetails: shippingMethodDetails,
          itemsTotal: itemsTotalPrice,
          taxAmount: parsedTaxAmount,
          calculatedShippingCost: roundedShippingCost
        };
      });
    });

    const { newBill, customer, productDetails, shippingDetails, itemsTotal, taxAmount: finalTaxAmount, calculatedShippingCost } = result;

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
        shipping_cost: calculatedShippingCost, // Use the cost returned from transaction
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
      shipping_details: shippingDetails,
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
          message = `Bill Created! Products: ${productsString}, Amount: ${newBill.totalPrice}, Address: ${fullAddress}, Shipping: ${shippingDetails.name} (₹${calculatedShippingCost}).`;
        } else {
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
          shippingMethod: shippingDetails && shippingDetails.name ? {
            name: shippingDetails.name,
            type: shippingDetails.type,
            cost: calculatedShippingCost || 0 // Use calculatedShippingCost
          } : null
        });
      }
    } catch (smsError) {
      console.error('SMS sending failed:', smsError);
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
        error: error.message, // Keep it simple for client
        // details: error.message, //
      },
      { status: 500 }
    );
  }
}