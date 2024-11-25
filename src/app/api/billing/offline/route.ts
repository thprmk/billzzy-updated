import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import { authOptions } from '../../auth/[...nextauth]/route';



// Function to generate a unique bill number
const generateBillNumber = async (): Promise<number> => {
  const lastBill = await prisma.transactionRecord.findFirst({
    orderBy: { billNo: 'desc' },
  });
  return lastBill ? lastBill.billNo + 1 : 1;
};

export async function POST(request: Request) {
  try {
    // Retrieve the user session
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse the request body
    const body = await request.json();
    const { 
      items, 
      customerDetails, 
      paymentDetails,
      total 
    } = body;

 

    // Start a transaction
    const bill = await prisma.$transaction(async (tx) => {
      // Create or update customer
      let customer = await tx.customer.findFirst({
        where: {
          phone: customerDetails.phone,
          organisationId: parseInt(session.user.id as string, 10) // Ensure it's a string before parsing
        }
      });

      if (!customer) {
        customer = await tx.customer.create({
          data: {
            name: customerDetails.name,
            phone: customerDetails.phone,
            organisationId: parseInt(session.user.id as string, 10)
          }
        });
      }


      // Create transaction record
      const transaction = await tx.transactionRecord.create({
        data: {
          billNo: await generateBillNumber(),
          totalPrice: total,
          billingMode: 'offline',
          paymentMethod: paymentDetails.method,
          amountPaid: paymentDetails.amountPaid,
          balance: paymentDetails.amountPaid - total, // Balance calculation (could be negative)
          organisationId: parseInt(session.user.id as string, 10),
          customerId: customer.id,
          date: new Date(),
          time: new Date(),
          status: 'confirmed'
        }
      });

      // Create transaction items and update inventory
      for (const item of items) {
        // Validate item fields
        if (!item.productId || !item.quantity || !item.total) {
          throw new Error('Invalid item data.');
        }

        await tx.transactionItem.create({
          data: {
            transactionId: transaction.id,
            productId: item.productId,
            quantity: item.quantity,
            totalPrice: item.total
          }
        });

        // Update product quantity
        const updatedProduct = await tx.product.update({
          where: { id: item.productId },
          data: {
            quantity: {
              decrement: item.quantity
            }
          }
        });

        // Optionally, you can check if the product has sufficient quantity
        if (updatedProduct.quantity < 0) {
          throw new Error(`Insufficient quantity for product ID: ${item.productId}`);
        }
      }

      return transaction;
    });

    // Fetch full bill details, including customer, items, products, and organisation details
    const billWithDetails = await prisma.transactionRecord.findUnique({
      where: { id: bill.id },
      include: {
        customer: true,
        organisation: true, // Include organisation details
        items: {
          include: {
            product: true
          }
        }
      }
    });

    if (!billWithDetails) {
      throw new Error('Bill not found after creation.');
    }

    

    return NextResponse.json(billWithDetails, { status: 201 }); // Use 201 Created status
  } catch (error) {
    console.error('Offline billing error:', error.message);
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to create bill' },
      { status: 500 }
    );
  }
}
