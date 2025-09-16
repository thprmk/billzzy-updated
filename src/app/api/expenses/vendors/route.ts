// src/app/api/expenses/vendors/route.ts

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

// GET /api/expenses/vendors
// Fetches all vendors for the logged-in organization
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.organisationId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const organisationId = session.user.organisationId;

  try {
    const vendors = await prisma.vendor.findMany({
      where: {
        organisationId: organisationId,
      },
      orderBy: {
        name: 'asc',
      },
    });
    return NextResponse.json(vendors);
  } catch (error) {
    console.error('Error fetching vendors:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/expenses/vendors
// Creates a new vendor for the logged-in organization
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.organisationId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const organisationId = session.user.organisationId;

  try {
    const { name } = await req.json();

    if (!name) {
      return NextResponse.json({ error: 'Vendor name is required' }, { status: 400 });
    }

    // Check if vendor already exists for this organization
    const existingVendor = await prisma.vendor.findFirst({
        where: {
            name: {
                equals: name,
                mode: 'insensitive' // Case-insensitive check
            },
            organisationId: organisationId
        }
    });

    if (existingVendor) {
        return NextResponse.json({ error: 'Vendor with this name already exists' }, { status: 409 });
    }

    const newVendor = await prisma.vendor.create({
      data: {
        name,
        organisationId: organisationId,
      },
    });

    return NextResponse.json(newVendor, { status: 201 });
  } catch (error) {
    console.error('Error creating vendor:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}