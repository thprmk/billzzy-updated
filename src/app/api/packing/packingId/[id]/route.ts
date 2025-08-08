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

    const { id } = params;
    if (!id) {
      return NextResponse.json({ error: 'Bill number is required' }, { status: 400 });
    }

    // The variable 'companyBillNo' holds the number from the URL (e.g., 57).
    // This is just a variable name, that is okay.
    const companyBillNo = parseInt(id, 10);
    if (isNaN(companyBillNo)) {
      return NextResponse.json({ error: 'Invalid bill number' }, { status: 400 });
    }

    const organisationId = parseInt(session.user.id, 10);

    const bill = await prisma.transactionRecord.findFirst({
      where: {
        // === THIS IS THE CORRECT LOGIC ===
        // We are searching the 'companyBillNo' column. Your testing
        // proved this is the number being entered in the UI.
        companyBillNo: companyBillNo,
        organisationId: organisationId,
      },
      include: {
        items: {
          include: {
            product: true,
            productVariant: {   // Add this for variant items
              include: {
                product: true, 
          }
        }
      }
    }
  }
    });

    if (!bill) {
      // This 404 is now a REAL "not found" if the number truly doesn't exist.
      return NextResponse.json({ error: `Bill with Company Bill No. ${companyBillNo} not found` }, { status: 404 });
    
    }

       const products = bill.items.map((item: any) => {
      // If the item is a variant, use its details
      if (item.productVariant) {
        return {
          id: item.productVariant.id, // Use the variant's ID
          SKU: item.productVariant.SKU,
          name: `${item.productVariant.product.name} (${item.productVariant.size || item.productVariant.color || ''})`.trim(),
          quantity: item.quantity,
        };
      }
      // If it's a standard product, use its details
      if (item.product) {
        return {
          id: item.product.id,
          SKU: item.product.SKU,
          name: item.product.name,
          quantity: item.quantity,
        };
      }
      // Fallback for any orphaned data
      return null;
    }).filter(Boolean); // This will remove any null items from the final array

    revalidatePath('/transactions/online');
    revalidatePath('/dashboard');
    
    return NextResponse.json({
      billNo: bill.billNo,
      companyBillNo: bill.companyBillNo,
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