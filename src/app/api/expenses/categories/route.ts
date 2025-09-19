// // src/app/api/expenses/categories/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ✅ FIX: use session.user.id instead of organisationId
  const organisationId = parseInt(session.user.id);

  try {
    const categories = await prisma.expenseCategory.findMany({
      where: {
        organisationId: organisationId,
        parentId: null, // Only fetch top-level (parent) categories
      },
      include: {
        children: {
          orderBy: {
            name: 'asc',
          },
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

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ✅ FIX: use session.user.id instead of organisationId
  const organisationId = parseInt(session.user.id);

  try {
    const { name, parentId } = await req.json();

    if (!name) {
      return NextResponse.json({ error: 'Category name is required' }, { status: 400 });
    }

    const newCategory = await prisma.expenseCategory.create({
      data: {
        name,
        organisationId: organisationId,
        parentId: parentId ? parseInt(String(parentId), 10) : null,
      },
    });

    return NextResponse.json(newCategory, { status: 201 });
  } catch (error) {
    console.error('Error creating category:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
