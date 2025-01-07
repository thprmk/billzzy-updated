// app/api/deleteOrganisation/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  const { id } = await request.json();

  try {
    await prisma.organisation.delete({
      where: { id: Number(id) },
    });
    return NextResponse.json({ message: 'Organisation deleted successfully' });
  } catch (error) {
    console.error('Error deleting organisation:', error.message);
    return NextResponse.json({ error: 'Failed to delete organisation' }, { status: 500 });
  }
}
