import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import { authOptions } from '../../auth/[...nextauth]/route';

// Utility function for handling transactions with retries
async function executeWithRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  retryDelay: number = 2000
): Promise<T> {
  let attempts = 0;
  
  while (attempts < maxRetries) {
    try {
      return await operation();
    } catch (error) {
      attempts++;
      
      if (attempts === maxRetries || !isRetryableError(error)) {
        throw error;
      }
      
      await new Promise(resolve => setTimeout(resolve, retryDelay));
      console.log(`Retrying operation, attempt ${attempts + 1} of ${maxRetries}`);
    }
  }
  
  throw new Error('Maximum retry attempts reached');
}

function isRetryableError(error: any): boolean {
  return error.code === 'P2034' || error.message.includes('Transaction already closed');
}

const generateBillNumber = async (tx: any): Promise<number> => {
  const lastBill = await tx.transactionRecord.findFirst({
    orderBy: { billNo: 'desc' },
  });
  return lastBill ? lastBill.billNo + 1 : 1;
};

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { items, customerDetails, paymentDetails, total } = await request.json();
    const organisationId = parseInt(session.user.id as string, 10);

    const billWithDetails = await executeWithRetry(async () => {
      const transactionResult = await prisma.$transaction(async (tx) => {
        // Handle customer creation/update
        let customer = await tx.customer.findFirst({
          where: {
            phone: customerDetails.phone,
            organisationId
          }
        });

        if (!customer) {
          customer = await tx.customer.create({
            data: {
              name: customerDetails.name,
              phone: customerDetails.phone,
              organisationId
            }
          });
        }

        // Create transaction record
        const billNo = await generateBillNumber(tx);
        const transaction = await tx.transactionRecord.create({
          data: {
            billNo,
            totalPrice: total,
            billingMode: 'offline',
            paymentMethod: paymentDetails.method,
            amountPaid: paymentDetails.amountPaid,
            balance: paymentDetails.amountPaid - total,
            organisationId,
            customerId: customer.id,
            date: new Date(),
            time: new Date(),
            status: 'confirmed'
          }
        });

        // Process items sequentially
        for (const item of items) {
          if (!item.productId || !item.quantity || !item.total) {
            throw new Error('Invalid item data');
          }

          const product = await tx.product.findUnique({
            where: { id: item.productId }
          });

          if (!product) {
            throw new Error(`Product not found: ${item.productId}`);
          }

          if (product.quantity < item.quantity) {
            throw new Error(`Insufficient quantity for product: ${product.name}`);
          }

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
        timeout: 60000, // 1 minute timeout
        maxWait: 15000, // 15 seconds max wait
        isolationLevel: 'Serializable'
      });

      // Fetch complete bill details after transaction
      return await prisma.transactionRecord.findUnique({
        where: { id: transactionResult },
        include: {
          customer: true,
          organisation: true,
          items: {
            include: {
              product: true
            }
          }
        }
      });
    });

    if (!billWithDetails) {
      throw new Error('Bill not found after creation');
    }

    return NextResponse.json(billWithDetails, { status: 201 });
  } catch (error) {
    console.error('Offline billing error:', error);
    
    if (error.message.includes('Insufficient quantity')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: error.message || 'Failed to create bill' },
      { status: 500 }
    );
  }
}