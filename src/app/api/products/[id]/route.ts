import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth-options';

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

// Replace the entire PUT function in src/app/api/products/[id]/route.ts

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    // Use the explicit organisationId from the session, which is now correctly typed
    if (!session?.user?.organisationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const organisationId = Number(session.user.organisationId);
    const productId = Number(params.id);

    if (isNaN(productId)) {
      return NextResponse.json({ error: 'Invalid Product ID' }, { status: 400 });
    }

    // First, verify that the product exists and belongs to the user
    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        organisationId: organisationId,
      }
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found or permission denied' }, { status: 404 });
    }

    const body = await request.json();
    const {
      name,
      SKU,
      netPrice,
      sellingPrice,
      quantity,
      categoryId, // We now expect the raw categoryId
    } = body;
    
    // Create the data object for the update, handling potential undefined values
    const updateData = {
      name,
      SKU,
      netPrice: netPrice ? Number(netPrice) : undefined,
      sellingPrice: sellingPrice ? Number(sellingPrice) : undefined,
      quantity: quantity ? Number(quantity) : undefined,
      categoryId: categoryId ? Number(categoryId) : null,
    };
    
    // Now, update the product using its unique ID
    const updatedProduct = await prisma.product.update({
      where: {
        id: productId,
      },
      data: updateData,
    });

    return NextResponse.json(updatedProduct);

  } catch (error: unknown) { // Use 'unknown' for better type safety
    // Type guard to check if it's a Prisma error
    if (typeof error === 'object' && error !== null && 'code' in error) {
        const prismaError = error as { code: string };
        if (prismaError.code === 'P2002') {
            return NextResponse.json({ error: 'A product with this SKU already exists.' }, { status: 409 });
        }
    }
    // General error handling
    console.error('Update product error:', error);
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
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