/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import puppeteer from 'puppeteer';
import ExcelJS from 'exceljs';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-options';

/**
 * Handles POST requests to fetch transaction records for the UI.
 * This version fetches both modes and includes items.
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { start, end } = await req.json();
    if (!start || !end) {
      return NextResponse.json({ success: false, message: 'Start and end dates are required' }, { status: 400 });
    }

    // --- FIX: Correctly fetches both modes and includes items for the UI ---
    const records = await prisma.transactionRecord.findMany({
      
           where: {
            organisationId: parseInt(session.user.id),
            date: {
              gte: new Date(start),
              lte: new Date(end),
            },
            OR: [
              { billingMode: 'ONLINE', paymentStatus: 'PAID' },
              { billingMode: 'OFFLINE' } // For offline, we include all, regardless of payment method
            ]
          },
      include: {
        customer: { select: { name: true, phone: true } },
        // This is the key: include items and their related product info
        items: {
          include: {
            product: {
              select: { name: true } // We only need the product name
            }
          }
        }
      },
      orderBy: { date: 'asc' },
    });

    return NextResponse.json({ success: true, data: records });
  } catch (error: any) {
    console.error('Error fetching daily report:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch daily report', error: error.message }, { status: 500 });
  }
}

/**
 * Handles GET requests for downloading an itemized report.
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const start = searchParams.get('start');
  const end = searchParams.get('end');
  const format = searchParams.get('format');

  if (!start || !end) {
    return NextResponse.json({ error: 'Missing date range' }, { status: 400 });
  }

  try {
    const transactions = await prisma.transactionRecord.findMany({
      where: {
        organisationId: parseInt(session.user.id),
        date: {
          gte: new Date(start),
          lte: new Date(end),
        },
        OR: [
          { billingMode: 'ONLINE', paymentStatus: 'PAID' },
          { billingMode: 'OFFLINE' } // For offline, we include all
        ]
      },
      orderBy: { date: 'asc' },
      include: {
        customer: true,
        items: { include: { product: true } },
      },
    });

    const total = transactions.reduce((sum, tx) => sum + tx.totalPrice, 0);

    if (format === 'xlsx') {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Report');
      // --- New, detailed columns for the Excel report ---
      worksheet.columns = [
        { header: 'Date', key: 'date', width: 15 },
        { header: 'Bill No', key: 'billNo', width: 20 },
        { header: 'Mode', key: 'billingMode', width: 15 },
        { header: 'Customer', key: 'customerName', width: 25 },
        { header: 'Product', key: 'productName', width: 30 },
        { header: 'Qty', key: 'quantity', width: 10 },
        { header: 'Item Price', key: 'itemPrice', width: 15 },
      ];
      // --- Loop through items to create a detailed report ---
      transactions.forEach((tx) => {
        tx.items.forEach((item) => {
          worksheet.addRow({
            date: tx.date.toISOString().split('T')[0],
            billNo: tx.companyBillNo,
            billingMode: tx.billingMode,
            customerName: tx.customer?.name ?? 'N/A',
            productName: item.product.name,
            quantity: item.quantity,
            itemPrice: item.totalPrice,
          });
        });
      });
      worksheet.addRow([]);
      const totalRow = worksheet.addRow({ itemPrice: total });
      worksheet.getCell(`F${worksheet.rowCount}`).value = 'Grand Total:';
      worksheet.getCell(`G${worksheet.rowCount}`).value = total;
      totalRow.font = { bold: true };
      const buffer = await workbook.xlsx.writeBuffer();
      return new NextResponse(buffer, { headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Disposition': `attachment; filename="report-${start}-to-${end}.xlsx"`, 'Access-Control-Expose-Headers': 'Content-Disposition', } });
    }

    // --- New, detailed HTML for the PDF report ---
    const html = `
      <html>
        <head><style>body { font-family: Arial, sans-serif; padding: 20px; font-size: 10px; } table { width: 100%; border-collapse: collapse; margin-top: 20px; } th, td { border: 1px solid #ccc; padding: 6px; text-align: left; } th { background-color: #f5f5f5; } h2, h3 { margin-bottom: 10px; text-align: center; } p { text-align: center; margin-bottom: 20px; } .total { font-weight: bold; margin-top: 20px; text-align: right; font-size: 12px; }</style></head>
        <body>
          <h2>Transaction Report (Online & Offline)</h2>
          <p>From: ${start} To: ${end}</p>
          <table>
            <thead><tr><th>Date</th><th>Bill No</th><th>Mode</th><th>Customer</th><th>Product</th><th>Qty</th><th>Item Total</th></tr></thead>
            <tbody>
              ${transactions.map((tx) =>
                tx.items.length > 0 ?
                tx.items.map(item => `
                  <tr>
                    <td>${tx.date.toISOString().split('T')[0]}</td>
                    <td>${tx.companyBillNo}</td>
                    <td>${tx.billingMode}</td>
                    <td>${tx.customer?.name ?? 'N/A'}</td>
                    <td>${item.product.name}</td>
                    <td>${item.quantity}</td>
                    <td>₹${item.totalPrice.toFixed(2)}</td>
                  </tr>`).join('') :
                  // Handle case where a transaction might have no items
                  `<tr>
                    <td>${tx.date.toISOString().split('T')[0]}</td>
                    <td>${tx.companyBillNo}</td>
                    <td>${tx.billingMode}</td>
                    <td>${tx.customer?.name ?? 'N/A'}</td>
                    <td colspan="2">No items found</td>
                    <td>₹${tx.totalPrice.toFixed(2)}</td>
                  </tr>`
              ).join('')}
            </tbody>
          </table>
          <h3 class="total">Total Sales: ₹${total.toFixed(2)}</h3>
        </body>
      </html>`;
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' } });
    await browser.close();
    return new NextResponse(pdfBuffer, { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="report-${start}-to-${end}.pdf"`, 'Access-Control-Expose-Headers': 'Content-Disposition' } });
  } catch (error: any) {
    console.error('Excel/PDF generation error:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}