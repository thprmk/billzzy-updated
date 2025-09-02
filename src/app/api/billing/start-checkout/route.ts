// src/app/api/billing/start-checkout/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { randomBytes } from 'crypto';
// NOTE: You need to get the organisationId from user's session
// import { getServerSession } from 'next-auth/next';
// import { authOptions } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    // In a real app, you would get this from the logged-in user's session
    // const session = await getServerSession(authOptions);
    // if (!session?.user?.organisationId) {
    //   return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    // }
    // const organisationId = session.user.organisationId;
    
    const organisationId = 1; // Using a placeholder for now

    // Create a unique, random session ID
    const sessionId = `checkout_${randomBytes(16).toString('hex')}`;

    await prisma.magicCheckoutSession.create({
      data: {
        sessionId: sessionId,
        organisationId: organisationId,
        status: 'PENDING',
      },
    });

    return NextResponse.json({ success: true, sessionId: sessionId });
  } catch (error) {
    console.error("Failed to start checkout session:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}