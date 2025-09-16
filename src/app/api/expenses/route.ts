// src/app/api/expenses/route.ts

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Zod schema for validating the incoming expense data
const expenseSchema = z.object({
  date: z.string().datetime(), // Expecting ISO 8601 string from the client
  amount: z.number().positive('Amount must be positive'),
  categoryId: z.number().int(),
  paymentMode: z.enum(["CASH", "BANK_TRANSFER", "CREDIT_CARD", "UPI", "CHEQUE"]),
  notes: z.string().max(500, 'Notes must be 500 characters or less').optional(),
  invoiceBillNumber: z.string().optional(),
  vendorId: z.number().int().optional(),
  customerId: z.number().int().optional(),
  receiptUrl: z.string().url().optional(),
});

// GET /api/expenses
// Fetches all expenses for the organization with filtering
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.organisationId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  // We will add filtering logic here later (e.g., by date, category)
  // For now, we fetch all expenses

  try {
    const expenses = await prisma.expense.findMany({
      where: {
        organisationId: session.user.organisationId,
      },
      include: {
        category: true, // Include related category name
        vendor: true,   // Include related vendor name
        customer: true, // Include related customer name
      },
      orderBy: {
        date: 'desc', // Show most recent first
      },
    });
    return NextResponse.json(expenses);
  } catch (error) {
    console.error('Error fetching expenses:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/expenses
// Creates a new expense record
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.organisationId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const validation = expenseSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid input', details: validation.error.flatten() }, { status: 400 });
    }

    const { date, amount, categoryId, paymentMode, ...rest } = validation.data;
    
    // We can add logic here to verify categoryId, vendorId etc. belong to the org
    
    const newExpense = await prisma.expense.create({
      data: {
        date: new Date(date),
        amount,
        categoryId,
        paymentMode,
        ...rest, // includes optional fields like notes, vendorId etc.
        organisationId: session.user.organisationId,
      },
    });

    return NextResponse.json(newExpense, { status: 201 });
  } catch (error) {
    console.error('Error creating expense:', error);
    // Handle specific Prisma errors, e.g., foreign key constraint
    if (error.code === 'P2003') {
        return NextResponse.json({ error: 'Invalid category, vendor, or customer ID provided.' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}