// app/api/notifications/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth-options';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = new URL(request.url).searchParams;
    const status = searchParams.get('status');

    const notifications = await prisma.mandateNotification.findMany({
      where: {
        organisationId: parseInt(session.user.id),
        isRead: status === 'unread' ? false : undefined
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({ notifications });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { notificationId } = await request.json();

    await prisma.mandateNotification.update({
      where: {
        id: notificationId,
        organisationId: parseInt(session.user.id)
      },
      data: {
        isRead: true
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update notification' },
      { status: 500 }
    );
  }
}