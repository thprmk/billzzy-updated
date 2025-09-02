// src/app/api/billing/get-recent-customer/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth-options';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const organisationId = parseInt(session.user.id, 10);

    // Get the most recent customer for this organisation
    const recentCustomer = await prisma.customer.findFirst({
      where: { 
        organisationId: organisationId,
        phone: {
          not: ""  // Exclude customers with empty phone numbers
        }
      },
      orderBy: { id: 'desc' }, // Get the most recently added customer
    });

    if (recentCustomer) {
      return NextResponse.json({
        success: true,
        data: {
          customer: {
            name: recentCustomer.name,
            phone: recentCustomer.phone,
          },
        },
      });
    } else {
      return NextResponse.json({ 
        success: false, 
        message: 'No recent customer found' 
      });
    }
  } catch (error: any) {
    console.error('Failed to get recent customer:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal Server Error' 
    }, { status: 500 });
  }
}