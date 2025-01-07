// app/api/packing/packingId/[id]/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-options';
import { revalidatePath } from 'next/cache';

export async function GET(
  request: Request,
  context: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    
    // Ensure params exists and extract id
    if (!context.params?.id) {
      return NextResponse.json({ error: 'Bill number is required' }, { status: 400 });
    }

    const billNo = parseInt(context.params.id);
    if (isNaN(billNo)) {
      return NextResponse.json({ error: 'Invalid bill number' }, { status: 400 });
    }

    const organisationId = parseInt(session.user.id);

    const bill = await prisma.transactionRecord.findFirst({
      where: {
        billNo,
        organisationId,
        // status: 'printed'
      },
      include: {
        items: {
          include: {
            product: true
          }
        }
      }
    });

    if (!bill) {
      return NextResponse.json({ error: 'Bill not found' }, { status: 404 });
    }

    const products = bill.items.map(item => ({
      id: item.product.id,
      SKU: item.product.SKU,
      name: item.product.name,
      quantity: item.quantity
    }));

    revalidatePath('/transactions/online');
    revalidatePath('/dashboard');
    
    return NextResponse.json({
      billNo: bill.billNo,
      products
    });

  } catch (error) {
    console.error('Packing fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bill details' },
      { status: 500 }
    );
  }
}