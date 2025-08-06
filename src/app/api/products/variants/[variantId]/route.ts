// src/app/api/products/variants/[variantId]/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth-options';

export async function PUT(
  request: Request,
  { params }: { params: { variantId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const organisationId = parseInt(session.user.id, 10);

    const variantId = parseInt(params.variantId, 10);
    if (isNaN(variantId)) {
      return NextResponse.json({ error: 'Invalid Variant ID' }, { status: 400 });
    }

    const body = await request.json();
    const { SKU, sellingPrice, quantity } = body;

    // First, verify this variant belongs to the user's organisation
    const variant = await prisma.productVariant.findUnique({
      where: { id: variantId },
      include: { product: true },
    });

    if (!variant || variant.product.organisationId !== organisationId) {
      return NextResponse.json({ error: 'Variant not found' }, { status: 404 });
    }

    // Now, update the variant
    const updatedVariant = await prisma.productVariant.update({
      where: { id: variantId },
      data: {
        SKU,
        sellingPrice: parseFloat(sellingPrice),
        quantity: parseInt(quantity, 10),
      },
    });

    return NextResponse.json(updatedVariant);

  } catch (error: any) {
    console.error("Failed to update variant:", error);
    // Handle potential unique constraint violation for SKU
    if (error.code === 'P2002' && error.meta?.target?.includes('SKU')) {
        return NextResponse.json({ error: 'This SKU is already in use by another product or variant.' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update variant' }, { status: 500 });
  }
}