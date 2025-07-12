// <<< PASTE THIS ENTIRE CODE INTO src/app/api/packing/packingComplete/[id]/route.ts >>>

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-options';
import { revalidatePath } from 'next/cache';

// We are now creating the POST function that the server was missing.
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // The 'id' from the URL is the company's bill number.
    const companyBillNo = parseInt(params.id, 10);
    if (isNaN(companyBillNo)) {
      return NextResponse.json({ error: 'Invalid bill number' }, { status: 400 });
    }

    const organisationId = parseInt(session.user.id, 10);

    // This query correctly searches by companyBillNo.
    const updateResult = await prisma.transactionRecord.updateMany({
      where: {
        companyBillNo: companyBillNo,
        organisationId: organisationId
      },
      data: {
        status: 'packed'
      }
    });

    // If no rows were updated, it means the bill wasn't found.
    if (updateResult.count === 0) {
      return NextResponse.json(
        { error: 'Bill not found or you do not have permission to update it.' },
        { status: 404 }
      );
    }

    revalidatePath('/transactions/online');
    revalidatePath('/dashboard');

    // Return a success message.
    return NextResponse.json({ 
      success: true,
      message: 'Bill status updated to packed successfully',
    });

  } catch (error: any) {
    console.error('Packing status update error:', error.message);
    return NextResponse.json(
      { error: 'Failed to update packing status' },
      { status: 500 }
    );
  }
}