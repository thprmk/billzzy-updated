/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import puppeteer from 'puppeteer';
import ExcelJS from 'exceljs';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-options';

function getEndOfDay(dateString: string): Date {
    const date = new Date(dateString);
    date.setHours(23, 59, 59, 999);
    return date;
}

// --- Helper function to handle independent filters ---
async function fetchFilteredTransactions(organisationId: number, startDate: string, endDate: string, filters: { mode: string, status: string }) {
  const whereClause: any = {
    organisationId: organisationId,
    date: {
      gte: new Date(startDate),
      lte: getEndOfDay(endDate),
    },
  };

  // Apply the mode filter if it's not 'ALL'
  if (filters.mode && filters.mode !== 'ALL') {
    whereClause.billingMode = filters.mode;
  }

  // Apply the status filter if it's not 'ALL'
  if (filters.status && filters.status !== 'ALL') {
    whereClause.paymentStatus = filters.status;
  }

  return prisma.transactionRecord.findMany({
    where: whereClause,
    include: {
      customer: true,
      items: {
        include: {
          product: true
        }
      }
    },
    orderBy: { date: 'asc' },
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { start, end, filters } = await req.json();
    if (!start || !end) {
      return NextResponse.json({ success: false, message: 'Start and end dates are required' }, { status: 400 });
    }
    
    const safeFilters = filters || { mode: 'ALL', status: 'ALL' };

    const records = await fetchFilteredTransactions(parseInt(session.user.id), start, end, safeFilters);
    return NextResponse.json({ success: true, data: records });
  } catch (error: any) {
    console.error('Error fetching daily report:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch daily report', error: error.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const start = searchParams.get('start');
  const end = searchParams.get('end');
  const format = searchParams.get('format');
  const mode = searchParams.get('mode') || 'ALL';
  const status = searchParams.get('status') || 'ALL';

  if (!start || !end) {
    return NextResponse.json({ error: 'Missing date range' }, { status: 400 });
  }

  try {
    const transactions = await fetchFilteredTransactions(parseInt(session.user.id), start, end, { mode, status });
    
    const total = transactions.reduce((sum, tx) => sum + tx.totalPrice, 0);

    const columns = [
        { header: 'Date', key: 'date', width: 15 },
        { header: 'Bill No', key: 'billNo', width: 20 },
        { header: 'Mode', key: 'billingMode', width: 15 },
        { header: 'Payment Status', key: 'paymentStatus', width: 15 },
        { header: 'Customer', key: 'customerName', width: 25 },
        { header: 'Product', key: 'productName', width: 30 },
        { header: 'Qty', key: 'quantity', width: 10 },
        { header: 'Item Price', key: 'itemPrice', width: 15 },
    ];

    if (format === 'xlsx') {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Report');
        worksheet.columns = columns;

        transactions.forEach((tx) => {
            const itemsToDisplay = tx.items.length > 0 ? tx.items : [{ product: null, quantity: 1, totalPrice: tx.totalPrice }];
            itemsToDisplay.forEach((item) => {
                worksheet.addRow({
                    date: tx.date ? tx.date.toISOString().split('T')[0] : 'N/A',
                    billNo: tx.companyBillNo ?? tx.billNo,
                    billingMode: tx.billingMode ?? 'N/A',
                    paymentStatus: tx.paymentStatus ?? 'N/A',
                    customerName: tx.customer?.name ?? 'N/A',
                    productName: item.product?.name ?? 'N/A',
                    quantity: item.quantity ?? 0,
                    itemPrice: item.totalPrice ?? 0,
                });
            });
        });

        worksheet.addRow([]);
        const totalRow = worksheet.addRow({ itemPrice: total });
        worksheet.getCell(`G${worksheet.rowCount}`).value = 'Grand Total:';
        worksheet.getCell(`H${worksheet.rowCount}`).value = total;
        totalRow.font = { bold: true };
        
        const buffer = await workbook.xlsx.writeBuffer();
        return new NextResponse(buffer, { headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Disposition': `attachment; filename="report-${start}-to-${end}.xlsx"`, 'Access-Control-Expose-Headers': 'Content-Disposition', } });
    }

    const html = `
      <html>
        <head><style>body { font-family: Arial, sans-serif; padding: 20px; font-size: 10px; } table { width: 100%; border-collapse: collapse; margin-top: 20px; } th, td { border: 1px solid #ccc; padding: 6px; text-align: left; } th { background-color: #f5f5f5; } h2, h3 { margin-bottom: 10px; text-align: center; } p { text-align: center; margin-bottom: 20px; } .total { font-weight: bold; margin-top: 20px; text-align: right; font-size: 12px; }</style></head>
        <body>
          <h2>Transaction Report</h2>
          <p>From: ${start} To: ${end}</p>
          <table>
            <thead><tr><th>Date</th><th>Bill No</th><th>Mode</th><th>Payment Status</th><th>Customer</th><th>Product</th><th>Qty</th><th>Item Total</th></tr></thead>
            <tbody>
              ${transactions.map((tx) => {
                const itemsToDisplay = tx.items.length > 0 ? tx.items : [{ product: null, quantity: 1, totalPrice: tx.totalPrice }];
                return itemsToDisplay.map(item => `
                  <tr>
                    <td>${tx.date ? tx.date.toISOString().split('T')[0] : 'N/A'}</td>
                    <td>${tx.companyBillNo ?? tx.billNo}</td>
                    <td>${tx.billingMode ?? 'N/A'}</td>
                    <td>${tx.paymentStatus ?? 'N/A'}</td>
                    <td>${tx.customer?.name ?? 'N/A'}</td>
                    <td>${item.product?.name ?? 'N/A'}</td>
                    <td>${item.quantity ?? 0}</td>
                    <td>₹${(item.totalPrice ?? 0).toFixed(2)}</td>
                  </tr>`).join('');
              }).join('')}
            </tbody>
          </table>
          <h3 class="total">Total Billed Amount: ₹${total.toFixed(2)}</h3>
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