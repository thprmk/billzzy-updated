import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import { authOptions } from '../../auth/[...nextauth]/route';

// PATCH endpoint for quantity updates
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { quantity } = body;

    const product = await prisma.product.findFirst({
      where: {
        id: parseInt(params.id),
        organisationId: parseInt(session.user.id),
      },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const updatedProduct = await prisma.$transaction(async (tx) => {
      // Update product quantity
      const product = await tx.product.update({
        where: {
          id: parseInt(params.id),
        },
        data: {
          quantity: {
            increment: quantity,
          },
        },
      });

      // Update inventory
      await tx.inventory.updateMany({
        where: {
          productId: parseInt(params.id),
          organisationId: parseInt(session.user.id),
        },
        data: {
          quantity: {
            increment: quantity,
          },
        },
      });

      return product;
    });

    return NextResponse.json(updatedProduct);
  } catch (error) {
    console.error('Update quantity error:', error);
    return NextResponse.json(
      { error: 'Failed to update quantity' },
      { status: 500 }
    );
  }
}

// PUT endpoint for full product updates
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json();
    const {
      name,
      SKU,
      netPrice,
      sellingPrice,
      quantity,
      category,
    } = body;

    

    const updatedProduct = await prisma.product.update({
      where: {
        id: parseInt(id),
        organisationId: parseInt(session.user.id),
      },
      data: {
        name,
        SKU,
        netPrice,
        sellingPrice,
        quantity,
        categoryId: category.id || null,
      },
    });

    // Update the corresponding inventory record
    await prisma.inventory.updateMany({
      where: {
        productId: parseInt(id),
        organisationId: parseInt(session.user.id),
      },
      data: {
        quantity,
        categoryId: category.id || null,
      },
    });

    return NextResponse.json(updatedProduct);
  } catch (error) {
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update product',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// DELETE endpoint
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const product = await prisma.product.findFirst({
      where: {
        id: parseInt(params.id),
        organisationId: parseInt(session.user.id),
      },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    await prisma.$transaction([
      prisma.inventory.deleteMany({
        where: {
          productId: parseInt(params.id),
          organisationId: parseInt(session.user.id),
        },
      }),
      prisma.product.delete({
        where: {
          id: parseInt(params.id),
        },
      }),
    ]);

    return NextResponse.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    return NextResponse.json(
      { error: 'Failed to delete product' },
      { status: 500 }
    );
  }
}