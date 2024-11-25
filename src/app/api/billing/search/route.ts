// app/api/billing/search/route.ts

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import { authOptions } from '../../auth/[...nextauth]/route';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const mode = searchParams.get('mode') || 'online';
    const dateFilter = searchParams.get('date') || 'all';
    const statusFilter = searchParams.get('status') || 'all';
    const hasTracking = searchParams.get('hasTracking') || 'all';
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');

    // Calculate date ranges
    let dateRange: any = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    switch (dateFilter) {
      case 'today':
        dateRange = {
          gte: today,
          lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
        };
        break;
      case 'week':
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        dateRange = {
          gte: weekStart,
          lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
        };
        break;
      case 'month':
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        dateRange = {
          gte: monthStart,
          lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
        };
        break;
      default:
        dateRange = undefined;
    }

    // Build the where clause
    const whereClause: any = {
      organisationId: parseInt(session.user.id),
      billingMode: mode,
    };

    if (statusFilter !== 'all') {
      whereClause.status = statusFilter;
    }

    if (dateRange) {
      whereClause.date = dateRange;
    }

    // Filter by tracking number presence
    if (hasTracking === 'true') {
      whereClause.trackingNumber = { not: null };
    } else if (hasTracking === 'false') {
      whereClause.trackingNumber = null;
    }

    // Build search conditions
// Build search conditions
if (query) {
  const billNo = parseInt(query);
  const isBillNo = !isNaN(billNo);

  whereClause.OR = [
    ...(isBillNo ? [{ billNo: billNo }] : []),
    {
      customer: {
        is: {
          OR: [
            { name: { contains: query } },
            { phone: { contains: query } },
          ],
        },
      },
    },
  ];
}

    // Get total count for pagination
    const totalCount = await prisma.transactionRecord.count({
      where: whereClause,
    });

    // Fetch bills with pagination
    const bills = await prisma.transactionRecord.findMany({
      where: whereClause,
      include: {
        customer: {
          select: {
            name: true,
            phone: true,
            district: true,
            state: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                name: true,
                SKU: true,
              },
            },
          },
        },
      },
      orderBy: {
        billNo: 'desc',
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    // Transform data if necessary
    const formattedBills = bills.map((bill) => {
      const dateObj = new Date(bill.time);
      const formattedDate = dateObj.toISOString().split('T')[0];
      const formattedTime = dateObj.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });

      return {
        id: bill.id,
        billNo: bill.billNo,
        date: formattedDate,
        time: formattedTime,
        totalPrice: bill.totalPrice,
        status: bill.status,
        billingMode: bill.billingMode,
        customer: bill.customer || { name: 'Walk-in Customer', phone: '-' },
        paymentMethod: bill.paymentMethod || '-',
        amountPaid: bill.amountPaid || 0,
        balance: bill.balance || 0,
        trackingNumber: bill.trackingNumber || null,
        weight: bill.weight || null,
        items: bill.items.map((item) => ({
          id: item.id,
          productName: item.product.name,
          quantity: item.quantity,
          totalPrice: item.totalPrice,
        })),
      };
    });

    return NextResponse.json({ bills: formattedBills, totalCount });
  } catch (error) {
    console.error('Search error:', error.message);
    return NextResponse.json(
      { error: 'Failed to search bills' },
      { status: 500 }
    );
  }
}
