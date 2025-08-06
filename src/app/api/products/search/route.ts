// src/app/api/products/search/route.ts

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
    const organisationId = parseInt(session.user.id);

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
      // --- THIS IS THE CORRECTED PART ---
      // We use 'include' instead of 'select' to get all product fields
      // AND the nested variants.
      include: {
        variants: true, // This fetches all variants for boutique products
      },
      take: 15, // Limit results for better performance
      orderBy: {
        name: 'asc'
      }
    });

    // Filter out products that are out of stock (either standard or all variants)
    const inStockProducts = products.filter(p => {
      if (p.productType === 'BOUTIQUE') {
        // Keep boutique products if they have at least one variant in stock
        return p.variants && p.variants.some(v => v.quantity > 0);
      } else {
        // Keep standard products if they are in stock
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