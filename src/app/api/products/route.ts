import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import { authOptions } from '../auth/[...nextauth]/route';

import { cache } from 'react';

// Cache the product search results
const getProductsFromDb = cache(async (userId: string, searchTerm?: string, categoryId?: string) => {
  const where = {
    organisationId: parseInt(userId),
    ...(searchTerm && {
      OR: [
        { SKU: { contains: searchTerm } },
        { name: { contains: searchTerm } }
      ]
    }),
    ...(categoryId && { categoryId: parseInt(categoryId) })
  };

  return await prisma.$transaction(async (tx) => {
    const products = await tx.product.findMany({
      where,
      include: {
        category: true,
        inventory: {
          where: { organisationId: parseInt(userId) },
          take: 1
        }
      },
      orderBy: { name: 'asc' }
    });

    return products.map(product => ({
      id: product.id,
      name: product.name,
      SKU: product.SKU,
      netPrice: product.netPrice,
      sellingPrice: product.sellingPrice,
      quantity: product.inventory[0]?.quantity ?? product.quantity,
      category: product.category
    }));
  }, {
    maxWait: 5000,
    timeout: 10000,
    isolationLevel: 'ReadCommitted'
  });
});

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const searchTerm = searchParams.get('sku') || '';
    const categoryId = searchParams.get('category') || '';

    const products = await getProductsFromDb(session.user.id, searchTerm, categoryId);

    return NextResponse.json(products);

  } catch (error) {
    console.error('Product search error:', {
      message: error.message,
      stack: error.stack
    });

    if (error.code === 'P2024') {
      return NextResponse.json({
        error: 'Connection timed out. Please try again.'
      }, { status: 408 });
    }

    return NextResponse.json({
      error: 'Failed to fetch products',
      details: error.message
    }, { status: 500 });
  }
}
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);



    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      SKU,
      netPrice,
      sellingPrice,
      quantity,
      categoryId,
    } = body;



    // Check if SKU exists
    const existingProduct = await prisma.product.findFirst({
      where: {
        SKU,
        organisationId: parseInt(session.user.id),
      },
    });

    if (existingProduct) {
      return NextResponse.json(
        { error: 'SKU already exists' },
        { status: 400 }
      );
    }

    const product = await prisma.product.create({
      data: {
        name,
        SKU,
        netPrice,
        sellingPrice,
        quantity,
        categoryId,
        organisationId: parseInt(session.user.id),
        seller: "", // Add this required field

      },
      include: {
        category: true,
      },
    });

    // Create initial inventory record
    await prisma.inventory.create({
      data: {
        productId: product.id,
        categoryId: product.categoryId,
        organisationId: parseInt(session.user.id),
        quantity: product.quantity,
      },
    });



    return NextResponse.json({
      success: true,
      data: product,
      message: 'Product created successfully'
    }, { status: 201 });

  } catch (error) {
    // More detailed error logging
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });

    return NextResponse.json({
      success: false,
      error: 'Failed to create product',
      details: error.message
    }, { status: 500 });
  }
}