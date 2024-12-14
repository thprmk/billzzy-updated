// app/api/settings/shop/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth-options';

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    const organisation = await prisma.organisation.update({
      where: {
        id: parseInt(session.user.id)
      },
      data
    });

    return NextResponse.json(organisation);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update shop details' },
      { status: 500 }
    );
  }
}