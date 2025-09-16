// src/app/api/invoices/[id]/download/route.tsx
import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer';

function getBaseUrl() {
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
    // CRITICAL: Make sure this path is correct for YOUR computer
    const executablePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

    browser = await puppeteer.launch({
      headless: true,
      executablePath: executablePath,
      args: ['--no-sandbox']
    });

    const page = await browser.newPage();
    
    // Go to the page and wait for everything to load
    await page.goto(invoiceUrl, { waitUntil: 'networkidle0' });
    
    // Generate the PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
    });

    await browser.close();
    browser = null;

    return new Response(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="invoice-${invoiceId}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Puppeteer PDF generation failed:", error);
    if (browser) { await browser.close(); }
    return new NextResponse('Failed to generate PDF.', { status: 500 });
  }
}