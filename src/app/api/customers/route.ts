// api/billing/customers
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

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');

    const customers = await prisma.customer.findMany({
      where: {
        organisationId: parseInt(session.user.id),
        ...(search && {
          OR: [
            { name: { contains: search } },
            { phone: { contains: search } },
            { email: { contains: search } }
          ]
        })
      },
      include: {
        _count: {
          select: { transactions: true }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });
   
    return NextResponse.json(customers);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch customers' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, phone, email, flatNo, street, district, state, pincode } = body;

    if (!name || !phone) {
        return NextResponse.json({ error: 'Name and phone are required' }, { status: 400 });
    }

    const organisationId = parseInt(session.user.id);

    const customer = await prisma.customer.upsert({
      where: {
        // This is the unique key Prisma looks for
        phone_organisationId: {
          phone: phone,
          organisationId: organisationId,
        },
      },
      update: {
        // If the customer is found, update these fields
        name,
        email,
        flatNo,
        street,
        district,
        state,
        pincode,
      },
      create: {
        // If not found, create a new customer with these fields
        name,
        phone,
        email,
        flatNo,
        street,
        district,
        state,
        pincode,
        organisationId: organisationId,
      },
    });

    return NextResponse.json(customer, { status: 201 });
  } catch (error) {
    console.error("Failed to upsert customer:", error); // Log the actual error
    return NextResponse.json(
      { error: 'Failed to create or update customer' },
      { status: 500 }
    );
  }
}