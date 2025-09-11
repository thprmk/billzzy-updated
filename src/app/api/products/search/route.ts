// src/app/api/products/search/route.ts

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth-options';

export async function GET(request: Request) {
  try {

    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.organisationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const organisationId = session.user.organisationId;

    const { searchParams } = new URL(request.url);
    const searchQuery = searchParams.get('search')?.trim();
    
    if (!searchQuery || searchQuery.length < 2) {
      return NextResponse.json([]);
    }

    const products = await prisma.product.findMany({
      where: {
        organisationId: organisationId,
        // --- THIS IS THE NEW, SMARTER SEARCH LOGIC ---
        OR: [
          // 1. Search by parent product NAME (for both types)
          {
            name: {
              contains: searchQuery,
            },
          },
          // 2. Search by parent product SKU (for STANDARD products)
          {
            SKU: {
              contains: searchQuery,
            },
          },
          // 3. Search by the SKU of any of its VARIANTS (for BOUTIQUE products)
          {
            variants: {
              some: {
                SKU: {
                  contains: searchQuery,
                },
              },
            },
          },
        ],
      },

      include: {
        // CRITICAL: We must include the template and its attributes
        productTypeTemplate: {
          include: {
            attributes: true
          }
        },
        variants: true
      }
    });

const inStockProducts = products.filter(p => {
  
  if (p.productTypeTemplate) {
    return p.variants && p.variants.some(v => v.quantity > 0);
  } else {
    return p.quantity && p.quantity > 0;
  }
});

  return NextResponse.json(inStockProducts);

  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: 'Failed to search products' },
      { status: 500 }
    );
  }
}