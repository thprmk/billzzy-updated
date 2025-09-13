// src/app/api/invoices/[id]/download/route.tsx
import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer';

// Helper function to get the base URL, works in dev and prod
function getBaseUrl() {
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return `http://localhost:${process.env.PORT || 3000}`;
}

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const invoiceId = params.id;
  const baseUrl = getBaseUrl();
  const invoiceUrl = `${baseUrl}/invoice-template/${invoiceId}`;

  let browser = null;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    await page.goto(invoiceUrl, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
    });

    return new Response(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="invoice-${invoiceId}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Puppeteer PDF generation failed:", error);
    return new NextResponse('Failed to generate PDF.', { status: 500 });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}