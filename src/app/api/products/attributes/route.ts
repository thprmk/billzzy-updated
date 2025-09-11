import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-options';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/products/attributes
// Fetches all variant options (and their values) for the user's organisation.
export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || !session.user.organisationId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const organisationId = parseInt(session.user.organisationId as any, 10);

  if (isNaN(organisationId)) {
    return NextResponse.json({ error: 'Invalid authentication token' }, { status: 401 });
  }

  try {
    const attributes = await prisma.variantOption.findMany({
      where: {
        organisationId: organisationId,
      },
      include: {
        values: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return NextResponse.json(attributes, { status: 200 });

  } catch (error) {
    console.error('Error fetching product attributes:', error);
    return NextResponse.json(
      { error: 'An error occurred while fetching product attributes.' },
      { status: 500 }
    );
  }
}


// POST /api/products/attributes
// Creates a new variant option (attribute) for the user's organisation.
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || !session.user.organisationId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const organisationId = parseInt(session.user.organisationId as any, 10);
  if (isNaN(organisationId)) {
    return NextResponse.json({ error: 'Invalid authentication token' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Attribute name is required.' }, { status: 400 });
    }

    const trimmedName = name.trim();

    const allAttributes = await prisma.variantOption.findMany({
      where: {
        organisationId: organisationId,
      },
      select: {
        name: true,
      }
    });
    
    const existingAttribute = allAttributes.find(
      (attr) => attr.name.toLowerCase() === trimmedName.toLowerCase()
    );
    

    if (existingAttribute) {
        return NextResponse.json({ error: `An attribute named '${trimmedName}' already exists.` }, { status: 409 });
    }

    const newAttribute = await prisma.variantOption.create({
      data: {
        name: trimmedName,
        organisationId: organisationId,
      },
      include: {
        values: true,
      }
    });

    return NextResponse.json(newAttribute, { status: 201 });

  } catch (error) {
    console.error('Error creating product attribute:', error);
    return NextResponse.json(
      { error: 'An error occurred while creating the product attribute.' },
      { status: 500 }
    );
  }
}