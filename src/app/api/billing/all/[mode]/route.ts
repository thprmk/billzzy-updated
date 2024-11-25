// app/api/billing/all/[mode]/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import { authOptions } from '../../../auth/[...nextauth]/route';

export async function DELETE(
  request: Request,
  { params }: { params: { mode: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { mode } = params;
    if (mode !== 'online' && mode !== 'offline') {
      return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });
    }

    await prisma.transactionRecord.deleteMany({
      where: {
        organisationId: parseInt(session.user.id),
        billingMode: mode
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete bills' },
      { status: 500 }
    );
  }
}