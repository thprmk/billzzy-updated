// src/app/api/invoice/[id]/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {

  console.log('--- API: GET /api/invoice/[id] ---');

  const session = await getServerSession(authOptions);
  if (!session?.user?.organisationId) {
    return new NextResponse('Unauthorized', { status: 401 });
  }
  const organisationId = Number(session.user.organisationId);
  const invoiceId = Number(params.id);

  console.log(`API INFO: Logged-in organisationId: ${organisationId}`);
  console.log(`API INFO: Looking for invoiceId: ${invoiceId}`);

  if (isNaN(invoiceId)) {

    console.log(`API ERROR: The provided ID "${params.id}" is not a number.`);
    return new NextResponse('Invalid Invoice ID', { status: 400 });
  }

  try {
    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, organisationId },
      include: { items: true },
    });

    if (!invoice) {

      console.log('API RESULT: No invoice found with that ID and organisationId.');

      return new NextResponse('Invoice not found', { status: 404 });
    }

    console.log('API RESULT: Invoice found!', invoice);
    return NextResponse.json(invoice);
  } catch (error) {
    console.error('API CRASH:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}