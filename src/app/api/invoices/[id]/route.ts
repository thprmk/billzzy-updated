// src/app/api/invoices/[id]/route.ts

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  // 1. Authentication check
  const session = await getServerSession(authOptions);
  if (!session?.user?.organisationId) {
    return NextResponse.json({ error: 'Not Authenticated' }, { status: 401 });
  }
  const organisationId = Number(session.user.organisationId);
  const invoiceId = Number(params.id);

  try {
    // 2. Database query with security check
    // Find the invoice WHERE the ID matches AND it belongs to the logged-in user's organization.
    // This is a CRITICAL security measure.
    const invoice = await prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        organisationId: organisationId,
      },
      include: {
        items: true, // Also fetch the line items associated with this invoice
      },
    });

    // 3. Handle 'Not Found' case
    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // 4. Return the invoice data
    return NextResponse.json(invoice);

  } catch (error) {
    console.error(`[INVOICE_GET_BY_ID_ERROR]`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}