// src/app/api/billing/check-checkout-status/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const { sessionId } = await request.json();
    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
    }

    const session = await prisma.magicCheckoutSession.findUnique({
      where: { sessionId: sessionId },
    });

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (session.status === 'COMPLETED') {
      // Clean up the session after it's been checked
      await prisma.magicCheckoutSession.delete({ where: { sessionId: sessionId }});
    }

    return NextResponse.json({
      success: true,
      status: session.status,
      customer: {
        name: session.customerName,
        phone: session.customerPhone,
      },
    });
  } catch (error) {
    console.error("Failed to check session status:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}