

// src/app/api/expenses/route.ts

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const expenseSchema = z.object({
  date: z.string().datetime(),
  amount: z.number().positive('Amount must be positive'),
  categoryId: z.number().int(),
  paymentMode: z.enum(["CASH", "BANK_TRANSFER", "CREDIT_CARD", "UPI", "CHEQUE"]),
  notes: z.string().max(500).optional(),
  invoiceBillNumber: z.string().optional(),
  vendorId: z.number().int().optional(),
  customerId: z.number().int().optional(),
  receiptUrl: z.string().url().optional(),
});

// GET /api/expenses
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.organisationId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const expenses = await prisma.expense.findMany({
      where: { organisationId: session.user.organisationId },
      include: { category: true, vendor: true, customer: true },
      orderBy: { date: 'desc' },
    });
    return NextResponse.json(expenses);
  } catch (error) {
    console.error('Error fetching expenses:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/expenses
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

    const { date, amount, categoryId, vendorId, paymentMode, ...rest } = validation.data;
    const orgId = session.user.organisationId;

    // ✅ FIXED: Use expenseCategory instead of category
    const categoryExists = await prisma.expenseCategory.findFirst({
      where: { id: categoryId, organisationId: orgId },
    });
    if (!categoryExists) return NextResponse.json({ error: 'Invalid category ID' }, { status: 400 });

    if (vendorId) {
      const vendorExists = await prisma.vendor.findFirst({
        where: { id: vendorId, organisationId: orgId },
      });
      if (!vendorExists) return NextResponse.json({ error: 'Invalid vendor ID' }, { status: 400 });
    }

    const newExpense = await prisma.expense.create({
      data: {
        date: new Date(date),
        amount,
        categoryId,
        vendorId,
        paymentMode,
        ...rest,
        organisationId: orgId,
      },
    });

    return NextResponse.json(newExpense, { status: 201 });
  } catch (error: any) {
    console.error('Error creating expense:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
