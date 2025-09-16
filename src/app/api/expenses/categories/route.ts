// src/app/api/expenses/categories/route.ts

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

// GET now returns parent categories with their children nested inside.
// This is more efficient for the frontend.
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.organisationId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const organisationId = session.user.organisationId;

  try {
    const categories = await prisma.expenseCategory.findMany({
      where: {
        organisationId: organisationId,
        parentId: null, // Only fetch top-level (parent) categories
      },
      include: {
        children: {     // For each parent, include its sub-categories
          orderBy: {
            name: 'asc'
          }
        },
      },
      orderBy: {
        name: 'asc',
      },
    });
    return NextResponse.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// --- MODIFIED POST ---
// POST can now create a sub-category by accepting an optional parentId
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.organisationId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const organisationId = session.user.organisationId;

  try {
    // We now expect 'parentId' in the request body
    const { name, parentId } = await req.json();

    if (!name) {
      return NextResponse.json({ error: 'Category name is required' }, { status: 400 });
    }

    // You can add a check here to ensure 'name' is unique under the same parent if needed

    const newCategory = await prisma.expenseCategory.create({
      data: {
        name,
        organisationId: organisationId,
        // If parentId is provided, parse it to a number. If not, it remains null.
        parentId: parentId ? parseInt(String(parentId), 10) : null,
      },
    });

    return NextResponse.json(newCategory, { status: 201 });
  } catch (error) {
    console.error('Error creating category:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}