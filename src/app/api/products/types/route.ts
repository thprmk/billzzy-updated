import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-options';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// --- GET /api/products/types ---
// Fetches all Product Type Templates for the user's organisation.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !session.user.organisationId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const organisationId = session.user.organisationId;

  try {
    const productTypes = await prisma.productTypeTemplate.findMany({
      where: {
        organisationId: organisationId,
      },
      // Also include the attributes defined for each type
      include: {
        attributes: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return NextResponse.json(productTypes);

  } catch (error) {
    console.error('Error fetching product types:', error);
    return NextResponse.json({ error: 'Failed to fetch product types' }, { status: 500 });
  }
}


// --- POST /api/products/types ---
// Creates a new Product Type Template and its associated attributes.
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !session.user.organisationId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const organisationId = session.user.organisationId;

  try {
    const body = await request.json();
    const { name, attributes } = body;

    // --- Validation ---
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Product type name is required.' }, { status: 400 });
    }
    if (!attributes || !Array.isArray(attributes) || attributes.length === 0) {
      return NextResponse.json({ error: 'At least one attribute is required.' }, { status: 400 });
    }
    // Check for empty attribute names
    if (attributes.some(attr => !attr.name || attr.name.trim() === '')) {
      return NextResponse.json({ error: 'Attribute names cannot be empty.' }, { status: 400 });
    }
    
    // Check if a type with this name already exists
    const existingType = await prisma.productTypeTemplate.findFirst({
        where: { name: name.trim(), organisationId }
    });
    if (existingType) {
        return NextResponse.json({ error: `A product type named '${name.trim()}' already exists.`}, { status: 409 });
    }

    // Use a transaction to create the template and its attributes together
    const newProductType = await prisma.$transaction(async (tx) => {
      // 1. Create the main template
      const template = await tx.productTypeTemplate.create({
        data: {
          name: name.trim(),
          organisationId: organisationId,
        },
      });

      // 2. Prepare and create the associated attributes
      const attributeData = attributes.map((attr: { name: string }) => ({
        name: attr.name.trim(),
        templateId: template.id,
      }));

      await tx.attributeTemplate.createMany({
        data: attributeData,
      });

      return template;
    });

    // Fetch the final created type with its attributes to return
    const finalProductType = await prisma.productTypeTemplate.findUnique({
        where: { id: newProductType.id },
        include: { attributes: true }
    });

    return NextResponse.json(finalProductType, { status: 201 });

  } catch (error) {
    console.error('Error creating product type:', error);
    return NextResponse.json({ error: 'Failed to create product type' }, { status: 500 });
  }
}