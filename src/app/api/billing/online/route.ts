// app/api/create_online_bill/route.ts

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import { z } from 'zod';
import { sendBillingSMS } from '@/lib/msg91';

// Define the schema for request validation using zod
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

export async function POST(request: Request) {
  try {
    // Authenticate the user
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate and parse the request body
    const body = await request.json();
    const parsedData = createBillSchema.safeParse(body);

    if (!parsedData.success) {
      return NextResponse.json(
        { success: false, message: 'Invalid request data', errors: parsedData.error.errors },
        { status: 400 }
      );
    }

    const data = parsedData.data;

    const { customerId, items, billingMode } = data;


    if (items.length === 0) {
      return NextResponse.json(
        { success: false, message: 'At least one product is required.' },
        { status: 400 }
      );
    }

    // Start transaction
    const bill = await prisma.$transaction(async (prisma) => {
      // Fetch customer details
      const customer = await prisma.customer.findUnique({
        where: {
          id: customerId,
        },
      });

      if (!customer) {
        throw new Error(`Customer not found with ID: ${customerId}`);
      }

      // Ensure the customer belongs to the organisation
      if (customer.organisationId !== parseInt(session.user.id)) {
        throw new Error('Customer does not belong to your organisation.');
      }

      let totalPrice = 0;
      const transactionItemsData: { productId: number; quantity: number; totalPrice: number }[] = [];
      const productDetails: any[] = [];

      for (const item of items) {
        const { productId, quantity, price, total } = item;

        // Fetch product details
        const dbProduct = await prisma.product.findUnique({
          where: { id: productId },
        });

        if (!dbProduct) {
          throw new Error(`Product not found with ID: ${productId}`);
        }

        // Check if the product belongs to the organisation
        if (dbProduct.organisationId !== parseInt(session.user.id)) {
          throw new Error(`Product ID ${productId} does not belong to your organisation.`);
        }

        // Validate inventory
        if (dbProduct.quantity < quantity) {
          throw new Error(
            `Not enough inventory for ${dbProduct.name} (SKU: ${dbProduct.SKU}). Available: ${dbProduct.quantity}, Requested: ${quantity}`
          );
        }

        // Validate price consistency
        if (dbProduct.sellingPrice !== price) {
          throw new Error(
            `Price mismatch for ${dbProduct.name} (SKU: ${dbProduct.SKU}). Expected: ${dbProduct.sellingPrice}, Received: ${price}`
          );
        }

        // Calculate total price for the item
        const calculatedTotal = dbProduct.sellingPrice * quantity;

        // Validate total consistency
        if (calculatedTotal !== total) {
          throw new Error(
            `Total mismatch for ${dbProduct.name} (SKU: ${dbProduct.SKU}). Expected: ${calculatedTotal}, Received: ${total}`
          );
        }

        totalPrice += calculatedTotal;

        // Update product quantity
        await prisma.product.update({
          where: { id: productId },
          data: {
            quantity: {
              decrement: quantity,
            },
          },
        });

        // Prepare transaction item data
        transactionItemsData.push({
          productId,
          quantity,
          totalPrice: calculatedTotal,
        });

        // Prepare product details for response
        productDetails.push({
          productName: dbProduct.name,
          SKU: dbProduct.SKU,
          quantity,
          unitPrice: dbProduct.sellingPrice,
          amount: calculatedTotal,
        });
      }

      // Generate a new bill number
      const lastBill = await prisma.transactionRecord.findFirst({
        orderBy: { billNo: 'desc' },
      });
      const newBillNo = (lastBill?.billNo || 0) + 1;

      // Create the transaction record
      const newBill = await prisma.transactionRecord.create({
        data: {
          billNo: newBillNo,
          totalPrice: totalPrice,
          amountPaid: 0,
          balance: totalPrice,
          billingMode: billingMode,
          organisationId: parseInt(session.user.id),
          customerId: customer.id,
          date: new Date(),
          time: new Date(),
          status: 'confirmed',
          paymentMethod: 'pending',
        },
      });

      // Create transaction items
      for (const itemData of transactionItemsData) {
        await prisma.transactionItem.create({
          data: {
            transactionId: newBill.id,
            productId: itemData.productId,
            quantity: itemData.quantity,
            totalPrice: itemData.totalPrice,
          },
        });
      }

      return { newBill, customer, productDetails };
    });

    const { newBill, customer, productDetails } = bill;

    // Fetch organization details
    const organisation = await prisma.organisation.findUnique({
      where: { id: parseInt(session.user.id) },
    });

    if (!organisation) {
      throw new Error('Organisation not found');
    }

    // Prepare response data
    const billDatetime = new Date(newBill.date);
    const time = new Date(newBill.time);
const hours = time.getHours() % 12 || 12; // Convert 24-hour to 12-hour format
const minutes = String(time.getMinutes()).padStart(2, '0');
const ampm = time.getHours() >= 12 ? 'PM' : 'AM';

const formattedTime = `${hours}:${minutes} ${ampm}`;

    const responseData = {
      success: true,
      message: 'Online bill created successfully! Please review the bill before finalizing.',
      bill_id: newBill.id,
      bill_details: {
        bill_no: newBill.billNo,
        date: billDatetime.toISOString().split('T')[0], // Format as YYYY-MM-DD
        time: formattedTime, // Format as HH:MM:SS
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
        // Add other organisation details if needed
      },
      product_details: productDetails,
      total_amount: newBill.totalPrice,
    };

    const productsString = productDetails.map(item => 
      `${item.productName} x ${item.quantity}`
    ).join(', ');
    
    // Construct full address
    const fullAddress = `${customer.flatNo || ''}, ${customer.street || ''}, ${customer.district || ''}, ${customer.state || ''} - ${customer.pincode || ''}`.trim();
    
    // Send SMS
    if (customer.phone) {
      await sendBillingSMS({
        phone: customer.phone,
        companyName: organisation.shopName,
        products: productsString,
        amount: newBill.totalPrice,
        address: fullAddress,
        organisationId: organisation.id
      });
    }
    

    // console.log(responseData);
    

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


