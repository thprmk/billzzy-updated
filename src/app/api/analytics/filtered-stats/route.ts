import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

// app/api/dashboard/filtered-stats/route.ts

export async function POST(request: Request) {
    try {
      const session = await getServerSession(authOptions);
      if (!session?.user?.id) {
        return new NextResponse('Unauthorized', { status: 401 });
      }
  
      const { startDate, endDate, allTime, organisationId } = await request.json();
  
      let dateFilter = {};
      
      if (!allTime) {
        const startDateTime = new Date(startDate);
        startDateTime.setHours(0, 0, 0, 0);
  
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
  
        dateFilter = {
          date: {
            gte: startDateTime,
            lte: endDateTime,
          }
        };
      }
  
      const filteredStats = await prisma.transactionRecord.aggregate({
        where: {
          organisationId: parseInt(organisationId),
          ...dateFilter,  // Only apply date filter if not all time
          paymentStatus: 'PAID',
        },
        _sum: {
          totalPrice: true,
        },
        _count: true,
      });
  
      return NextResponse.json({
        totalOrders: filteredStats._count,
        totalSales: filteredStats._sum.totalPrice || 0,
      });
    } catch (error) {
      console.error('Error in filtered-stats route:', error);
      return new NextResponse('Internal Server Error', { status: 500 });
    }
  }