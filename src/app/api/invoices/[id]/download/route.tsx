// src/app/api/invoices/[id]/download/route.tsx
import { NextResponse } from 'next/server';
// Use the FULL puppeteer package, not puppeteer-core
import puppeteer from 'puppeteer';

function getBaseUrl() {
  // This is fine for local development
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
    // --- THIS IS THE NEW, DIRECT, AND SIMPLE APPROACH ---

    // CRITICAL: REPLACE THIS PATH WITH THE EXACT PATH TO YOUR CHROME.EXE
    // USE DOUBLE BACKSLASHES (\\) FOR THE PATH.
    const executablePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

    browser = await puppeteer.launch({
      headless: true,
      executablePath: executablePath, // Directly use the local Chrome
      args: ['--no-sandbox'] // A safety argument
    });
    // ----------------------------------------------------------

    const page = await browser.newPage();
    await page.goto(invoiceUrl, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
    });

    // Close the browser BEFORE returning the response
    await browser.close();
    browser = null; // Set to null to prevent the finally block from running again

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
    // Ensure the browser is closed even if an error occurs
    if (browser) {
      await browser.close();
    }
  }
}