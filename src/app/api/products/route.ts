import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import { authOptions } from '../auth/[...nextauth]/route';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sku = searchParams.get('sku');

    

    const where = {
      organisationId: parseInt(session.user.id),
      SKU: {
        contains: sku || '',
      },
    };

    const products = await prisma.product.findMany({
      where,
      include: {
        category: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return NextResponse.json(products);
  } catch (error) {
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
        // seller: "", // Add this required field

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