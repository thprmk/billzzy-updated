// src/app/api/invoices/[id]/route.tsx  <-- NOTE THE .tsx EXTENSION

import { NextResponse, NextRequest } from 'next/server'; // Import NextRequest
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

// PDF Imports - safe because this is a .tsx file now
import { renderToStream } from '@react-pdf/renderer';
import { InvoicePDF } from '@/components/invoices/InvoicePDF';
import { Invoice } from '@/types/invoice';

export async function GET(
  req: NextRequest, // Use NextRequest to access the search parameters
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organisationId) {
    return new NextResponse('Unauthorized', { status: 401 });
  }
  const organisationId = Number(session.user.organisationId);
  const invoiceId = Number(params.id);

  if (isNaN(invoiceId)) {
    return new NextResponse('Invalid Invoice ID', { status: 400 });
  }

  // Check if this is a download request by looking for a query parameter
  const { searchParams } = new URL(req.url);
  const format = searchParams.get('format');

  try {
    const invoiceFromDb = await prisma.invoice.findFirst({
      where: { id: invoiceId, organisationId },
      include: { items: true },
    });

    if (!invoiceFromDb) {
      return new NextResponse('Invoice not found', { status: 404 });
    }
    
    // --- ROUTING LOGIC ---
    if (format === 'pdf') {
      // --- HANDLE PDF DOWNLOAD ---
      const invoice: Invoice = invoiceFromDb as Invoice;
      const MyDoc = <InvoicePDF invoice={invoice} />;
      const pdfStream = await renderToStream(MyDoc);

      return new Response(pdfStream as any, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="invoice-${invoice.invoiceNumber}.pdf"`,
        },
      });
    } else {
      // --- HANDLE REGULAR JSON DATA REQUEST ---
      return NextResponse.json(invoiceFromDb);
    }

  } catch (error) {
    console.error('API Error in /api/invoices/[id]:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}