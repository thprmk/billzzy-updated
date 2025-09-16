// src/app/api/analytics/expenses/summary/route.ts

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { startOfMonth, endOfMonth } from 'date-fns';

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.organisationId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const now = new Date();
    const startDate = startOfMonth(now);
    const endDate = endOfMonth(now);

    // 1. Calculate Total Spend This Month
    const totalSpendResult = await prisma.expense.aggregate({
      _sum: {
        amount: true,
      },
      where: {
        organisationId: session.user.organisationId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    // 2. Count Total Expenses This Month
    const totalTransactions = await prisma.expense.count({
        where: {
            organisationId: session.user.organisationId,
            date: {
                gte: startDate,
                lte: endDate
            }
        }
    });

    // 3. Get Top Spending Category This Month
    const topCategoryResult = await prisma.expense.groupBy({
        by: ['categoryId'],
        _sum: {
            amount: true
        },
        where: {
            organisationId: session.user.organisationId,
            date: {
                gte: startDate,
                lte: endDate
            }
        },
        orderBy: {
            _sum: {
                amount: 'desc'
            }
        },
        take: 1
    });

    let topCategory = null;
    if (topCategoryResult.length > 0) {
        const category = await prisma.expenseCategory.findUnique({
            where: { id: topCategoryResult[0].categoryId }
        });
        if (category) {
            topCategory = {
                name: category.name,
                total: topCategoryResult[0]._sum.amount || 0
            };
        }
    }


    const summary = {
      totalSpendThisMonth: totalSpendResult._sum.amount || 0,
      totalTransactionsThisMonth: totalTransactions,
      topCategory: topCategory
    };

    return NextResponse.json(summary);
  } catch (error) {
    console.error('Error fetching expense summary:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}