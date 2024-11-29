import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth-options';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    
    if (!query) {
      return NextResponse.json([]);
    }

    const products = await prisma.product.findMany({
      where: {
        organisationId: parseInt(session.user.id),
        OR: [
          { name: { contains: query } },
          { SKU: { contains: query } }
        ],
        quantity: {
          gt: 0
        }
      },
      select: {
        id: true,
        name: true,
        SKU: true,
        sellingPrice: true,
        quantity: true
      }
    });

    return NextResponse.json(products);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to search products' },
      { status: 500 }
    );
  }
}