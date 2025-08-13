// app/api/notifications/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth-options';

// src/app/api/notifications/route.ts

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    // THIS IS THE FIX: A more robust check
    // It ensures that not only the session exists, but also user and user.id
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Now it's safe to use session.user.id
    const organisationId = parseInt(session.user.id, 10);
    
    // Extra safety: check if parseInt resulted in a valid number
    if (isNaN(organisationId)) {
        return NextResponse.json({ error: 'Invalid user ID in session' }, { status: 400 });
    }

    const searchParams = new URL(request.url).searchParams;
    const status = searchParams.get('status');

    const notifications = await prisma.mandateNotification.findMany({
      where: {
        organisationId: organisationId,
        isRead: status === 'unread' ? false : undefined
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({ notifications });
  } catch (error) {
    console.error("Error fetching notifications:", error); // Good to log the actual error
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}



export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { notificationId } = await request.json(); // parse body for notificationId
    const organisationId = parseInt(session.user.id, 10);

    // Attempt to delete the notification
    await prisma.mandateNotification.deleteMany({
      where: {
        id: notificationId,
        organisationId
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete notification' },
      { status: 500 }
    );
  }
}
