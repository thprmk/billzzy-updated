// src/app/api/invoices/[id]/route.tsx

import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { createInvoicePDF } from '@/lib/invoice-pdf';

// A simple helper type to satisfy TypeScript
interface UserWithOrgId {
  organisationId: string;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  
  // --- THIS IS THE FIX ---
  // We check for the user, then cast it to our helper type before accessing the property.
  if (!session?.user) {
    return new NextResponse('Unauthorized', { status: 401 });
  }
  const organisationId = Number((session.user as UserWithOrgId).organisationId);
  // --- END OF FIX ---

  const invoiceId = Number(params.id);

  if (isNaN(invoiceId)) {
    return new NextResponse('Invalid Invoice ID', { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const format = searchParams.get('format');

  try {
    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, organisationId },
      include: { 
        items: true,
        organisation: true
      },
    });

    if (!invoice) {
      return new NextResponse('Invoice not found', { status: 404 });
    }
    
    if (format === 'pdf') {
      if (!invoice.organisation) {
        return new NextResponse('Organisation data could not be found for this invoice.', { status: 500 });
      }
      
      const pdfBytes = await createInvoicePDF(invoice as any, invoice.organisation);

      return new Response(pdfBytes, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="invoice-${invoice.invoiceNumber}.pdf"`,
        },
      });
    } else {
      return NextResponse.json(invoice);
    }

  } catch (error) {
    console.error('API Error in /api/invoices/[id]:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}