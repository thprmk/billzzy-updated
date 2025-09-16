// src/app/api/expenses/categories/route.ts

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma'; // Ensure this is the correct named import

export async function GET(req: Request) {

  const session = await getServerSession(authOptions);

  if (!session || !session.user?.organisationId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const organisationId = parseInt(String(session.user.organisationId), 10);

  if (isNaN(organisationId)) {
    return NextResponse.json({ error: 'Invalid organisation ID' }, { status: 401 });
  }

  try {
    const categories = await prisma.expenseCategory.findMany({
      where: {
        organisationId: organisationId,
      },
      orderBy: {
        name: 'asc',
      },
    });
    return NextResponse.json(categories);
  } catch (error) {
    console.error('Error fetching expense categories:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.organisationId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // --- START OF FIX ---
  // Ensure organisationId from session is treated as a number
  const organisationId = parseInt(String(session.user.organisationId), 10);

  if (isNaN(organisationId)) {
    // This case should ideally never happen if the user is logged in
    return NextResponse.json({ error: 'Invalid organisation ID in session' }, { status: 401 });
  }
  // --- END OF FIX ---

  try {
    const { name } = await req.json();

    if (!name) {
      return NextResponse.json({ error: 'Category name is required' }, { status: 400 });
    }

    const existingCategory = await prisma.expenseCategory.findFirst({
      where: {
          name: {
              equals: name,
              // The 'mode: "insensitive"' option was removed here
          },
          organisationId: organisationId
      }
  });

    if (existingCategory) {
        return NextResponse.json({ error: 'Category with this name already exists' }, { status: 409 });
    }

    const newCategory = await prisma.expenseCategory.create({
      data: {
        name,
        organisationId: organisationId, // Now we are sure it's a number
      },
    });

    return NextResponse.json(newCategory, { status: 201 });
  } catch (error) {
    console.error('Error creating expense category:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}