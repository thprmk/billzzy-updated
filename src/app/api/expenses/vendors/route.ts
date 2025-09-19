

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

// GET /api/expenses/vendors
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.organisationId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const organisationId = session.user.organisationId;

  try {
    const vendors = await prisma.vendor.findMany({
      where: { organisationId },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(vendors);
  } catch (error) {
    console.error('Error fetching vendors:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/expenses/vendors
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.organisationId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const organisationId = session.user.organisationId;

  try {
    const body = await req.json();
    const name = body?.name?.trim();

    if (!name) {
      return NextResponse.json({ error: 'Vendor name is required' }, { status: 400 });
    }

    // Prisma 6 compatible: Case-insensitive check
    const existingVendor = await prisma.vendor.findFirst({
      where: {
        AND: [
          { name: { equals: name, mode: undefined } }, // Prisma 6 fix
          { organisationId }
        ]
      }
    });

    if (existingVendor) {
      return NextResponse.json({ error: 'Vendor with this name already exists' }, { status: 409 });
    }

    const newVendor = await prisma.vendor.create({
      data: { name, organisationId },
    });

    return NextResponse.json(newVendor, { status: 201 });
  } catch (error: any) {
    console.error('Error creating vendor:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
