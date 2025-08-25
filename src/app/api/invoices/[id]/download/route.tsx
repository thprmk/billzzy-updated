// src/app/api/invoices/[id]/download/route.ts

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { renderToStream } from '@react-pdf/renderer';
import { InvoicePDF } from '@/components/invoices/InvoicePDF';
import { Invoice } from '@/types/invoice'; // Import our shared Invoice type

export async function GET(
  req: Request,
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

  const invoiceFromDb = await prisma.invoice.findFirst({
    where: { id: invoiceId, organisationId },
    include: { items: true },
  });

  if (!invoiceFromDb) {
    return new NextResponse('Invoice not found', { status: 404 });
  }

  try {
    // --- THIS IS THE PERMANENT FIX ---
    // 1. We cast the database object to our strict Invoice type on its own, separate line.
    const invoice: Invoice = invoiceFromDb as Invoice;

    // 2. We then pass the clean, correctly-typed variable to the component. The JSX is now simple and correct.
    const MyDoc = <InvoicePDF invoice={invoice} />;

    // 3. Pass the clean element to the render function.
    const pdfStream = await renderToStream(MyDoc);
    // --- END OF FIX ---

    const response = new Response(pdfStream as any, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="invoice-${invoice.invoiceNumber}.pdf"`,
      },
    });

    return response;

  } catch (error) {
    console.error("Failed to generate PDF:", error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}