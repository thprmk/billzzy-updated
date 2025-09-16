// src/app/api/expenses/categories/[id]/route.ts

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

// This function handles DELETE requests to /api/expenses/categories/[some_id]
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.organisationId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const categoryId = parseInt(params.id, 10);
  if (isNaN(categoryId)) {
    return NextResponse.json({ error: 'Invalid category ID' }, { status: 400 });
  }

  try {
    // Security Check: First, verify the category exists and belongs to the user's organization.
    const categoryToDelete = await prisma.expenseCategory.findFirst({
      where: {
        id: categoryId,
        organisationId: session.user.organisationId,
      },
    });

    // If no category is found, return a 404 error.
    if (!categoryToDelete) {
      return NextResponse.json({ error: 'Category not found or you do not have permission to delete it.' }, { status: 404 });
    }

    // If the category is found, proceed with deletion.
    await prisma.expenseCategory.delete({
      where: { id: categoryId },
    });

    return NextResponse.json({ message: 'Category deleted successfully' }, { status: 200 });
  } catch (error: any) {
    // This special check handles the database error that occurs if you try to delete a category that is still being used by an expense.
    if (error.code === 'P2003') {
      return NextResponse.json({ error: 'Cannot delete: Category is in use by one or more expenses.' }, { status: 409 }); // 409 Conflict is a good status code here.
    }

    console.error('Error deleting category:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}