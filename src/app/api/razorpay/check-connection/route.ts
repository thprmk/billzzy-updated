// app/api/razorpay/check-connection/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    // THIS IS THE FIX: A more robust check for the session, user, and user ID
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const organisationId = parseInt(session.user.id, 10);
    
    // Extra safety check for NaN
    if (isNaN(organisationId)) {
      return NextResponse.json({ error: 'Invalid User ID in session' }, { status: 400 });
    }

    const organisation = await prisma.organisation.findUnique({
      where: { id: organisationId }, // <-- Use the safe, validated ID
      select: { razorpayAccessToken: true }
    });

    return NextResponse.json({
      isConnected: !!organisation?.razorpayAccessToken
    });
  } catch (error) {
    console.error('Failed to check Razorpay connection:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}