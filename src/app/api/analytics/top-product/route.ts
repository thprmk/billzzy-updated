// src/app/api/analytics/top-product/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const organisationId = parseInt(session.user.id);
    if (isNaN(organisationId)) {
      return NextResponse.json({ error: 'Invalid User ID' }, { status: 400 });
    }
    
    // ==========================================================
    // ===          THIS IS THE MISSING DATE LOGIC            ===
    // ==========================================================
    const searchParams = request.nextUrl.searchParams;
    const timeRange = searchParams.get('timeRange') || 'week';

    const today = new Date();
    let startDate = new Date();
    switch (timeRange) {
      case 'week': startDate.setDate(today.getDate() - 7); break;
      case 'month': startDate.setMonth(today.getMonth() - 1); break;
      case '3months': startDate.setMonth(today.getMonth() - 3); break;
      case 'year': startDate.setFullYear(today.getFullYear() - 1); break;
      default: startDate.setDate(today.getDate() - 7);
    }
    // ==========================================================

    // 1. Fetch all PAID transactions and their items
    const paidTransactions = await prisma.transactionRecord.findMany({
      where: {
        organisationId: organisationId,
        paymentStatus: 'PAID',
        date: { gte: startDate, lte: today }, // Now 'startDate' and 'today' are defined
      },
      include: {
        items: {
          include: {
            product: true,
            productVariant: { include: { product: true } }
          }
        }
      }
    });

    // 2. Aggregate the data in code
    const productSales = new Map<string, { name: string, quantity: number, revenue: number }>();
    for (const transaction of paidTransactions) {
      for (const item of transaction.items) {
        let key = '';
        let name = 'Unknown';
        if (item.productVariant) {
          key = `variant-${item.productVariantId}`;
          name = `${item.productVariant.product.name} (${item.productVariant.size || item.productVariant.color || 'Variant'})`.trim();
        } else if (item.product) {
          key = `product-${item.productId}`;
          name = item.product.name;
        }
        if (key) {
          const existing = productSales.get(key) || { name, quantity: 0, revenue: 0 };
          existing.quantity += item.quantity;
          existing.revenue += Number(item.totalPrice);
          productSales.set(key, existing);
        }
      }
    }

    // 3. Convert to array, sort, and slice
    const sortedProducts = Array.from(productSales.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    return NextResponse.json({ success: true, data: sortedProducts });

  } catch (error) {
    console.error('Error fetching top products:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}