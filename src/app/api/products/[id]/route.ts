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

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !session.user.organisationId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const organisationId = session.user.organisationId;
  const productId = parseInt(params.id, 10);

  if (isNaN(productId)) {
    return NextResponse.json({ error: 'Invalid Product ID' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { 
      name, 
      categoryId, 
      productTypeTemplateId, 
      variants, 
      ...standardData 
    } = body;

    // First, verify this product belongs to the user's organisation
    const product = await prisma.product.findFirst({
        where: { id: productId, organisationId }
    });
    if (!product) {
        return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // --- LOGIC FOR PRODUCTS WITH VARIANTS (using a template) ---
    if (productTypeTemplateId) {
      if (!variants || !Array.isArray(variants)) {
        return NextResponse.json({ error: 'Variants array is required.' }, { status: 400 });
      }

      await prisma.$transaction(async (tx) => {
        // 1. Update the parent product's details
        await tx.product.update({
          where: { id: productId },
          data: {
            name: name,
            categoryId: categoryId,
            productTypeTemplateId: productTypeTemplateId,
            // Nullify standard fields since it's a variant product
            SKU: null,
            netPrice: null,
            sellingPrice: null,
            quantity: null,
          },
        });

        // 2. Get the IDs of variants submitted from the frontend
        const incomingVariantIds = variants
          .map(v => v.id)
          .filter(id => id != null && id !== undefined); // Filter out new variants which won't have an ID

        // 3. Find variants in the DB that are NOT in the submission, and delete them
        await tx.productVariant.deleteMany({
          where: {
            productId: productId,
            id: {
              notIn: incomingVariantIds,
            },
          },
        });

        // 4. Loop through incoming variants and either create new ones or update existing ones
        for (const variant of variants) {
          const { id, SKU, netPrice, sellingPrice, quantity, customAttributes } = variant;
          const variantData = { SKU, netPrice, sellingPrice, quantity, customAttributes };

          if (id) {
            // If it has an ID, it's an existing variant that needs an update
            await tx.productVariant.update({
              where: { id: id },
              data: variantData,
            });
          } else {
            // If it has no ID, it's a new variant that needs to be created
            await tx.productVariant.create({
              data: {
                ...variantData,
                productId: productId,
              },
            });
          }
        }
      });
    } 
    // --- LOGIC FOR STANDARD PRODUCTS ---
    else {
      await prisma.product.update({
        where: { id: productId },
        data: {
          name: name,
          categoryId: categoryId,
          SKU: standardData.SKU,
          netPrice: standardData.netPrice,
          sellingPrice: standardData.sellingPrice,
          quantity: standardData.quantity,
          // Nullify the template link since it's a standard product
          productTypeTemplateId: null,
        },
      });
      // Also, delete any variants that might have existed if the user switched types
      await prisma.productVariant.deleteMany({ where: { productId: productId }});
    }

    return NextResponse.json({ success: true, message: 'Product updated successfully' });

  } catch (error) {
    console.error(`Error updating product ${params.id}:`, error);
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