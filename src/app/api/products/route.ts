import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth-options';

// Replace your old GET function with this new one

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.organisationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const organisationId = session.user.organisationId;
    
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('category');
    const searchTerm = searchParams.get('search');

    // Build the dynamic 'where' clause (no change here)
    const whereClause: any = {
      organisationId: organisationId,
    };
    if (categoryId) {
      whereClause.categoryId = parseInt(categoryId);
    }
    if (searchTerm) {
      whereClause.OR = [
        { name: { contains: searchTerm } },
        { variants: { some: { SKU: { contains: searchTerm } } } }, // Also search variant SKUs
      ];
    }

    // --- UPDATED PRISMA QUERY ---
    const productsFromDb = await prisma.product.findMany({
      where: whereClause,
      include: {
        category: true,
        // CRITICAL: Include the template and the variants
        productTypeTemplate: {
          include: {
            attributes: true
          }
        },
        variants: true,
      },
      orderBy: { id: 'desc' } // Order by most recent
    });

    // --- UPDATED NET WORTH CALCULATION ---
    const productsWithNetWorth = productsFromDb.map(product => {
      let netWorth = 0;

      // NEW LOGIC: Check if it's a variant product by seeing if it has a template linked
      if (product.productTypeTemplateId) {
        // For variant products, sum the net worth of all its variants
        netWorth = product.variants.reduce((total, variant) => {
          return total + (variant.sellingPrice * variant.quantity);
        }, 0);
      } else {
        // For standard products, it's a simple multiplication
        netWorth = (product.sellingPrice || 0) * (product.quantity || 0);
      }
      
      return {
        ...product,
        netWorth,
      };
    });

    return NextResponse.json(productsWithNetWorth);

  } catch (error) {
    console.error('Failed to fetch products:', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}


export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.organisationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const organisationId = session.user.organisationId;

    const body = await request.json();
    const {
      name,
      categoryId,
      productTypeTemplateId, // This is the ID of the template (e.g., "Apparel")
      variants,              // This is the array of variants
      // Standard product fields
      SKU,
      netPrice,
      sellingPrice,
      quantity,
    } = body;

    // --- LOGIC FOR PRODUCTS WITH VARIANTS (using a template) ---
    if (productTypeTemplateId) {
      if (!variants || !Array.isArray(variants) || variants.length === 0) {
        return NextResponse.json({ error: 'Products with variants must have at least one variant.' }, { status: 400 });
      }

      const newVariantProduct = await prisma.$transaction(async (tx) => {
        // 1. Create the main product, linking it to the chosen template
        const parentProduct = await tx.product.create({
          data: {
            name,
            organisationId,
            categoryId,
            productTypeTemplateId, // Link to the template
          }
        });

        // 2. Prepare and validate the data for all variants
        const variantsData = variants.map(variant => {
          const { SKU, netPrice, sellingPrice, quantity, customAttributes } = variant;

          if (!SKU || typeof sellingPrice !== 'number' || typeof quantity !== 'number' || !customAttributes) {
            throw new Error('Each variant must have a SKU, sellingPrice, quantity, and customAttributes.');
          }
          
          return {
            SKU,
            netPrice,
            sellingPrice,
            quantity,
            customAttributes, // This is our flexible JSON field
            productId: parentProduct.id,
          };
        });
        
        // 3. Create all the variants in one database call
        await tx.productVariant.createMany({
          data: variantsData,
        });
        
        return parentProduct;
      });

      return NextResponse.json(newVariantProduct, { status: 201 });

    } 
    
    // --- LOGIC FOR STANDARD PRODUCTS (no template) ---
    else {
      if (!SKU) {
         return NextResponse.json({ error: 'SKU is required for standard products' }, { status: 400 });
      }
      const existingProduct = await prisma.product.findFirst({
        where: { SKU, organisationId },
      });
      if (existingProduct) {
        return NextResponse.json({ error: 'A product with this SKU already exists' }, { status: 409 });
      }

      const standardProduct = await prisma.product.create({
        data: {
          name,
          organisationId,
          categoryId,
          SKU,
          netPrice,
          sellingPrice,
          quantity,
        },
      });

      if (standardProduct.quantity) {
        await prisma.inventory.create({
          data: {
            productId: standardProduct.id,
            categoryId: standardProduct.categoryId,
            organisationId,
            quantity: standardProduct.quantity,
          },
        });
      }

      return NextResponse.json(standardProduct, { status: 201 });
    }

  } catch (error) {
    console.error('Error creating product:', error);
    if (error.code === 'P2002' && error.meta?.target?.includes('SKU')) {
        return NextResponse.json({ error: 'A variant with one of the provided SKUs already exists.' }, { status: 409 });
    }
    if (error.message.includes('Each variant must have')) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}