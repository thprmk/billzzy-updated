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