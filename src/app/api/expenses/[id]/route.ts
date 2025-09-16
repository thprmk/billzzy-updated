// src/app/api/expenses/[id]/route.ts

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Zod schema for validating UPDATED expense data. All fields are optional.
const expenseUpdateSchema = z.object({
  date: z.string().datetime().optional(),
  amount: z.number().positive('Amount must be positive').optional(),
  categoryId: z.number().int().optional(),
  paymentMode: z.enum(["CASH", "BANK_TRANSFER", "CREDIT_CARD", "UPI", "CHEQUE"]).optional(),
  notes: z.string().max(500, 'Notes must be 500 characters or less').optional().nullable(),
  vendorId: z.number().int().optional().nullable(),
});

// --- PUT handler for updating an expense ---
export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.organisationId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const id = parseInt(params.id, 10);
  if (isNaN(id)) {
    return NextResponse.json({ error: 'Invalid expense ID' }, { status: 400 });
  }

  try {
    const body = await req.json();
    const validation = expenseUpdateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid input', details: validation.error.flatten() }, { status: 400 });
    }

    // Security Check: Make sure the expense being updated belongs to the user's organization
    const expenseToUpdate = await prisma.expense.findFirst({
      where: { 
        id: id,
        organisationId: session.user.organisationId
      },
    });

    if (!expenseToUpdate) {
        return NextResponse.json({ error: 'Expense not found or you do not have permission to edit it.' }, { status: 404 });
    }
    
    // If the check passes, update the expense
    const updatedExpense = await prisma.expense.update({
      where: { id: id },
      data: {
        ...validation.data,
        date: validation.data.date ? new Date(validation.data.date) : undefined,
      },
    });

    return NextResponse.json(updatedExpense);
  } catch (error) {
    console.error('Error updating expense:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// --- DELETE handler for deleting an expense ---
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.organisationId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const id = parseInt(params.id, 10);
  if (isNaN(id)) {
    return NextResponse.json({ error: 'Invalid expense ID' }, { status: 400 });
  }

  try {
    // Security Check: Make sure the expense being deleted belongs to the user's organization
    const expenseToDelete = await prisma.expense.findFirst({
        where: { 
            id: id,
            organisationId: session.user.organisationId
        },
    });

    if (!expenseToDelete) {
        return NextResponse.json({ error: 'Expense not found or you do not have permission to delete it.' }, { status: 404 });
    }
    
    // If the check passes, delete the expense
    await prisma.expense.delete({
      where: { id: id },
    });

    return NextResponse.json({ message: 'Expense deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting expense:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}