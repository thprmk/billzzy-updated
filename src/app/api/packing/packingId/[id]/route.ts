// app/api/packing/[billNo]/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-options';
import { revalidatePath } from 'next/cache';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const billNo = parseInt(params.id);
    const organisationId = parseInt(session.user.id);
console.log("triggered",billNo);

    const bill = await prisma.transactionRecord.findFirst({
      where: {
        billNo,
        organisationId,
        // status: 'Processing'
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
      return NextResponse.json(
        { error: 'Bill not found or not in processing status' },
        { status: 204 }
      );
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
    console.error('Packing fetch error:', error.message);
    return NextResponse.json(
      { error: 'Failed to fetch bill details' },
      { status: 500 }
    );
  }
}

