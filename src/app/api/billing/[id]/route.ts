// app/api/billing/[id]/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import { authOptions } from '../../auth/[...nextauth]/route';

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

    await prisma.transactionRecord.delete({
      where: {
        id: billId,
        organisationId: parseInt(session.user.id)
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete bill' },
      { status: 500 }
    );
  }
}