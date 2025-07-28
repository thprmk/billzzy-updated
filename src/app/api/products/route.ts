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

    const products = await prisma.product.findMany({
      where: whereClause,
      include: {
        category: true, // Include category information
      },
      orderBy: { name: 'asc' }
    });

    return NextResponse.json(products);

  } catch (error) {
    console.error('Failed to fetch products:', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
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
      size,  
      color,
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
        seller: "", 
        size,  
        color, 

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
      error: error.message,
      details: error.message
    }, { status: 500 });
  }
}