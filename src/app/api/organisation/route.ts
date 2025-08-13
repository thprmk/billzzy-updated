// app/api/getOrganisation/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-options';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  // THIS IS THE FIX: The robust session check
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    // Now it's safe to use session.user.id
    const organisationId = parseInt(session.user.id, 10);

    // Extra safety check
    if (isNaN(organisationId)) {
      return NextResponse.json({ error: 'Invalid User ID in session' }, { status: 400 });
    }

    const organisation = await prisma.organisation.findUnique({
      where: { id: organisationId }, // Use the safe, validated ID
    });

    if (!organisation) {
      return NextResponse.json({ error: 'Organisation not found' }, { status: 404 });
    }

    return NextResponse.json({ organisation });
  } catch (error: any) { // Use 'any' to access error.message
    console.error('Error fetching organisation:', error.message);
    return NextResponse.json({ error: 'Failed to fetch organisation data' }, { status: 500 });
  }
}
