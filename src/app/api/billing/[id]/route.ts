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

    const billId = parseInt(params.id);
    if (isNaN(billId)) {
      return NextResponse.json({ error: 'Invalid bill ID' }, { status: 400 });
    }

    // Use a transaction to ensure data consistency
    await prisma.$transaction(async (tx) => {
      // First, delete all related transaction items
      await tx.transactionItem.deleteMany({
        where: {
          transactionId: billId
        }
      });

      // Then delete the transaction record
      await tx.transactionRecord.delete({
        where: {
          id: billId,
          organisationId: parseInt(session.user.id)
        }
      });
    }, {
      timeout: 30000 // 30 second timeout
    });

    return NextResponse.json({
      success: true,
      message: 'Bill and related records deleted successfully'
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
  context: { params: { id: string } } // <-- FIX 1: Use 'context' to avoid Next.js error
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = context.params; // <-- FIX 1: Get id from context.params
    const billId = parseInt(id);
    const { items } = await request.json(); // 'items' now contains productVariantId

    if (!items || items.length === 0) {
      throw new Error('Cannot update a bill with no items.');
    }

    // Start a transaction
    const updatedBill = await prisma.$transaction(async (tx) => {
      // 1. Get the original bill with all its items (including variants)
      const originalBill = await tx.transactionRecord.findUnique({
        where: { id: billId, organisationId: parseInt(session.user.id) },
        include: {
          items: {
            include: { product: true, productVariant: true }
          }
        }
      });

      if (!originalBill) {
        throw new Error('Bill not found or you do not have permission to edit it.');
      }

      // 2. Restore original stock levels for all old items
      for (const item of originalBill.items) {
        if (item.productVariant) {
          await tx.productVariant.update({
            where: { id: item.productVariant.id },
            data: { quantity: { increment: item.quantity } }
          });
        } else if (item.product) {
          await tx.product.update({
            where: { id: item.product.id },
            data: { quantity: { increment: item.quantity } }
          });
        }
      }

      // 3. Delete all old transaction items
      await tx.transactionItem.deleteMany({
        where: { transactionId: billId }
      });

      // 4. Process the NEW items, decrementing stock and calculating total
      let newTotalPrice = 0;
      for (const item of items) {
        if (item.productVariantId) {
          // It's a boutique product variant
          const variant = await tx.productVariant.findUnique({ where: { id: item.productVariantId } });
          if (!variant || variant.quantity < item.quantity) {
            throw new Error(`Insufficient stock for variant SKU: ${variant?.SKU || 'N/A'}`);
          }
          await tx.productVariant.update({
            where: { id: item.productVariantId },
            data: { quantity: { decrement: item.quantity } }
          });
        } else if (item.productId) {
          // It's a standard product
          const product = await tx.product.findUnique({ where: { id: item.productId } });
          if (!product || (product.quantity || 0) < item.quantity) {
            throw new Error(`Insufficient stock for product: ${product?.name || 'N/A'}`);
          }
          await tx.product.update({
            where: { id: item.productId },
            data: { quantity: { decrement: item.quantity } }
          });
        }
        newTotalPrice += item.total;
      }

      // Get the original shipping cost. Default to 0 if it's null.
      const shippingCost = originalBill.shippingCost || 0;
      const taxAmount = originalBill.taxAmount || 0; // Also add the original tax

      // The final total is the new item total PLUS the original shipping and tax
    const finalTotalPrice = newTotalPrice + shippingCost + taxAmount;

      // 5. Create the new transaction items with correct variant awareness
      await tx.transactionItem.createMany({
        data: items.map((item: any) => ({
          transactionId: billId,
          productId: item.productVariantId ? null : item.productId, // Set productId to null for variants
          productVariantId: item.productVariantId,
          quantity: item.quantity,
          totalPrice: item.total,
        })),
      });

      // 6. Update the main bill record with the new total
      return await tx.transactionRecord.update({
        where: { id: billId },
        data: {
          totalPrice: finalTotalPrice,
          balance: finalTotalPrice - originalBill.amountPaid, // Recalculate balance
          isEdited: true,
        }
      });
    });

    // Send back a simple success response, no need to send the whole object
    return NextResponse.json({ success: true, message: 'Bill updated successfully.' });

  } catch (error: any) {
    console.error('Update bill error:', error.message);
    // Send a proper JSON error response
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}