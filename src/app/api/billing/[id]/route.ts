import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth-options';

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the mode from URL search params
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode') as 'online' | 'offline' || 'online';

    const billId = parseInt(params.id);
    if (isNaN(billId)) {
      return NextResponse.json({ error: 'Invalid bill ID' }, { status: 400 });
    }

    // Use a transaction to ensure data consistency
    await prisma.$transaction(async (tx) => {
      // Get the bill first to check its mode
      const bill = await tx.transactionRecord.findFirst({
        where: {
          id: billId,
          organisationId: parseInt(session.user.id),
          billingMode: mode
        }
      });

      if (!bill) {
        throw new Error(`Bill not found or not a ${mode} bill`);
      }

      // For online bills, we might need to delete shipping information
      if (mode === 'online') {
        await tx.transactionShipping.deleteMany({
          where: {
            transactionId: billId
          }
        });
      }

      // Delete all related transaction items
      await tx.transactionItem.deleteMany({
        where: {
          transactionId: billId
        }
      });

      // Then delete the transaction record
      await tx.transactionRecord.delete({
        where: {
          id: billId
        }
      });
    }, {
      timeout: 30000 // 30 second timeout
    });

    return NextResponse.json({
      success: true,
      message: `${mode} bill and related records deleted successfully`
    });

  } catch (error) {
    console.error('Delete bill error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to delete bill',
      details: error.message
    }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the mode from URL search params
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode') as 'online' | 'offline' || 'online';

    const billId = parseInt(params.id);
    const { items } = await request.json();

    // Start a transaction
    const updatedBill = await prisma.$transaction(async (tx) => {
      // Get the original bill
      const originalBill = await tx.transactionRecord.findFirst({
        where: { 
          id: billId,
          organisationId: parseInt(session.user.id),
          billingMode: mode
        },
        include: {
          items: {
            include: { product: true }
          }
        }
      });

      if (!originalBill) {
        throw new Error(`${mode} bill not found`);
      }

      // Restore original quantities
      for (const item of originalBill.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { quantity: { increment: item.quantity } }
        });
      }

      // Delete old items
      await tx.transactionItem.deleteMany({
        where: { transactionId: billId }
      });

      // Calculate new total
      let totalPrice = 0;
      const transactionItems = [];

      // Process new items
      for (const item of items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId }
        });

        if (!product) {
          throw new Error(`Product not found: ${item.productId}`);
        }

        if (product.quantity < item.quantity) {
          throw new Error(`Insufficient quantity for product: ${product.name}`);
        }

        // Update product quantity
        await tx.product.update({
          where: { id: item.productId },
          data: { quantity: { decrement: item.quantity } }
        });

        const itemTotal = item.price * item.quantity;
        totalPrice += itemTotal;

        transactionItems.push({
          transactionId: billId,
          productId: item.productId,
          quantity: item.quantity,
          totalPrice: itemTotal
        });
      }

      // Create new items
      await tx.transactionItem.createMany({
        data: transactionItems
      });

      // Update bill with mode-specific fields
      const updateData: any = {
        totalPrice,
        isEdited: true
      };

      // For offline bills, calculate balance
      if (mode === 'offline') {
        updateData.balance = totalPrice - originalBill.amountPaid;
      }

      // Update bill
      return await tx.transactionRecord.update({
        where: { id: billId },
        data: updateData
      });
    });

    return NextResponse.json({
      success: true,
      data: updatedBill,
      message: `${mode} bill updated successfully`
    });
  } catch (error: any) {
    console.error('Update bill error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode') as 'online' | 'offline' || 'online';

    const billId = parseInt(params.id);
    if (isNaN(billId)) {
      return NextResponse.json({ error: 'Invalid bill ID' }, { status: 400 });
    }

    const bill = await prisma.transactionRecord.findFirst({
      where: {
        id: billId,
        organisationId: parseInt(session.user.id),
        billingMode: mode
      },
      include: {
        customer: true,
        items: {
          include: {
            product: true
          }
        },
        ...(mode === 'online' ? {
          TransactionShipping: true
        } : {})
      }
    });

    if (!bill) {
      return NextResponse.json({ error: 'Bill not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: bill
    });
  } catch (error) {
    console.error('Get bill error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch bill' },
      { status: 500 }
    );
  }
}