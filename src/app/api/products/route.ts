import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth-options';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const organisationId = parseInt(session.user.id, 10);
    
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('category');
    const searchTerm = searchParams.get('search'); // <-- Get the new search term from the URL

    // Build the dynamic 'where' clause for the Prisma query
    const whereClause: any = {
      organisationId: organisationId,
    };

    // If a category is provided, add it to the filter
    if (categoryId) {
      whereClause.categoryId = parseInt(categoryId);
    }

    // If a search term is provided, add an 'OR' condition
    // to search in both the name and the SKU fields.
    if (searchTerm) {
      whereClause.OR = [
        { name: { contains: searchTerm } }, // mode: 'insensitive' makes the search case-insensitive
        { SKU: { contains: searchTerm} },
      ];
    }

   // --- STEP 1: Fetch products using your original logic ---
    const productsFromDb = await prisma.product.findMany({
      where: whereClause,
      include: {
        category: true,
        variants: true, // This is essential for the calculation
      },
      orderBy: { name: 'asc' }
    });

    // --- STEP 2: Calculate net worth for each fetched product ---
    const productsWithNetWorth = productsFromDb.map(product => {
      let netWorth = 0;

      if (product.productType === 'BOUTIQUE') {
        // For boutique, sum the net worth of all its variants
        netWorth = product.variants.reduce((total, variant) => {
          return total + (variant.sellingPrice * variant.quantity);
        }, 0);
      } else {
        // For standard, it's a simple multiplication
        netWorth = (product.sellingPrice || 0) * (product.quantity || 0);
      }
      
      return {
        ...product,
        netWorth, // Add the new calculated field
      };
    });

    // --- STEP 3: Return the final data ---
    return NextResponse.json(productsWithNetWorth);

  } catch (error) {
    console.error('Failed to fetch products:', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}

// Replace your existing POST function with this one

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const organisationId = parseInt(session.user.id, 10);

    const body = await request.json();
    const {
      // Common fields
      name,
      categoryId,
      // New fields for our logic
      productType, // This is our 'switch'
      variants,    // This is the array of variants for boutique products
      // Standard product fields
      SKU,
      netPrice,
      sellingPrice,
      quantity,
      size,  
      color,
    } = body;


    // --- NEW LOGIC FOR BOUTIQUE PRODUCTS ---
    if (productType === 'BOUTIQUE') {

      // Validate that variants exist and is an array
      if (!variants || !Array.isArray(variants) || variants.length === 0) {
        return NextResponse.json({ error: 'Boutique products must have at least one variant.' }, { status: 400 });
      }

      // We use a transaction to ensure all-or-nothing data integrity.
      // If any variant fails to be created, the parent product is also rolled back.
      const newBoutiqueProduct = await prisma.$transaction(async (tx) => {
        // 1. Create the parent "Folder" product
        const parentProduct = await tx.product.create({
          data: {
            name,
            productType: 'BOUTIQUE', // Explicitly set the type
            organisationId,
            categoryId,
            seller: "", // Kept for consistency
            // Note: SKU, price, quantity, etc., are left NULL as planned
          }
        });

        // 2. Create all the "Paper" variants and connect them to the parent
        await tx.productVariant.createMany({
          data: variants.map(variant => ({
            ...variant, // This includes SKU, sellingPrice, netPrice, quantity, size, color from the variant object
            productId: parentProduct.id
          }))
        });
        
        return parentProduct;
      });

      return NextResponse.json({
        success: true,
        data: newBoutiqueProduct,
        message: 'Boutique product and variants created successfully'
      }, { status: 201 });

    } 
    
    // --- EXISTING LOGIC FOR STANDARD PRODUCTS ---
    else {

      // Your existing validation logic
      if (!SKU) {
         return NextResponse.json({ error: 'SKU is required for standard products' }, { status: 400 });
      }
      const existingProduct = await prisma.product.findFirst({
        where: { SKU, organisationId },
      });

      if (existingProduct) {
        return NextResponse.json({ error: 'SKU already exists' }, { status: 400 });
      }

      // Your existing product creation logic
      const product = await prisma.product.create({
        data: {
          name,
          SKU,
          netPrice,
          sellingPrice,
          quantity,
          categoryId,
          organisationId,
          seller: "", 
          size,  
          color,
          // Note: productType will default to STANDARD as per our schema
        },
        include: {
          category: true,
        },
      });

      // Your existing inventory creation logic
      await prisma.inventory.create({
        data: {
          productId: product.id,
          categoryId: product.categoryId,
          organisationId,
          quantity: product.quantity,
        },
      });

      return NextResponse.json({
        success: true,
        data: product,
        message: 'Product created successfully'
      }, { status: 201 });
    }

  } catch (error) {
    console.error('Error creating product:', error);
    // Provide a more specific error message if it's a known Prisma error
    if (error.code === 'P2002' && error.meta?.target?.includes('SKU')) {
        return NextResponse.json({ error: 'A variant with one of the provided SKUs already exists.' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}