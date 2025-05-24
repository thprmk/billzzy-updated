/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import puppeteer from 'puppeteer';
import ExcelJS from 'exceljs';

export async function POST(req: NextRequest) {
  try {
    const { start, end } = await req.json();

    if (!start || !end) {
      return NextResponse.json(
        { success: false, message: 'Start and end dates are required' },
        { status: 400 }
      );
    }

    // Fetch transaction records within the date range
    const records = await prisma.transactionRecord.findMany({
      where: {
        date: {
          gte: new Date(start),
          lte: new Date(end),
        },
      },
      select: {
       // id: true,
        customerId: true,
        billNo: true,
        date: true,
        billingMode: true,
        paymentMethod: true,
        paymentStatus: true,
        totalPrice: true,
        amountPaid: true,
      },
      orderBy: {
        date: 'asc',
      },
    });

    return NextResponse.json({ success: true, data: records });
  } catch (error: any) {
    console.error('Error fetching daily report:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to fetch daily report',
        error: error.message,
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const start = searchParams.get('start');
  const end = searchParams.get('end');
  const format = searchParams.get('format'); // pdf or xlsx

  if (!start || !end) {
    return NextResponse.json({ error: 'Missing date range' }, { status: 400 });
  }

  try {
    const transactions = await prisma.transactionRecord.findMany({
  where: {
    date: {
      gte: new Date(start),
      lte: new Date(end),
    },
    paymentStatus: 'PAID'
  },
  orderBy: {
    date: 'asc',
  },
});

   console.log(transactions.map(tx => tx.paymentStatus));


    const total = transactions.reduce((sum, tx) => sum + tx.totalPrice, 0);

    // Excel export
    if (format === 'xlsx') {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Report');

      // Define columns
      worksheet.columns = [
        { header: 'Date', key: 'date', width: 15 },
        { header: 'Customer ID', key: 'customerId', width: 15 },
        { header: 'Bill No', key: 'billNo', width: 20 },
        { header: 'Payment Method', key: 'paymentMethod', width: 20 },
        { header: 'Payment Status', key: 'paymentStatus', width: 15 },
        { header: 'Total Price', key: 'totalPrice', width: 15 },
      ];

      // Add rows
      transactions.forEach(tx => {
        worksheet.addRow({
          date: tx.date.toISOString().split('T')[0],
         // id: tx.id,
          customerId: tx.customerId ?? '-',
          billNo: tx.billNo,
          paymentMethod: tx.paymentMethod,
          paymentStatus: tx.paymentStatus,
          totalPrice: tx.totalPrice,
        });
      });

      // Add total row
      worksheet.addRow([]);
      const totalRow = worksheet.addRow([
        null, null, null, null, 'Total', total,
      ]);
      totalRow.font = { bold: true };

      // Prepare Excel file buffer
      const buffer = await workbook.xlsx.writeBuffer();

      return new NextResponse(buffer, {
        headers: {
          'Content-Type':
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="report.xlsx"`,
        },
      });
    }

    // PDF export (default)
    const html = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
            th { background-color: #f5f5f5; }
            h2, h3 { margin-bottom: 10px; }
          </style>
        </head>
        <body>
          <h2>Transaction Report</h2>
          <p>From: ${start} To: ${end}</p>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Customer ID</th>
                <th>Bill No</th>
                <th>Payment Method</th>
                <th>Payment Status</th>
                <th>Total Price</th>
              </tr>
            </thead>
            <tbody>
              ${transactions
                .map(
                  (tx) => `
                <tr>
                  <td>${tx.date.toISOString().split('T')[0]}</td>
                  <td>${tx.customerId ?? '-'}</td>
                  <td>${tx.billNo}</td>
                  <td>${tx.paymentMethod}</td>
                  <td>${tx.paymentStatus}</td>
                  <td>₹${tx.totalPrice.toFixed(2)}</td>
                </tr>`
                )
                .join('')}
            </tbody>
          </table>
          <h3>Total Sales: ₹${total.toFixed(2)}</h3>
        </body>
      </html>
    `;

    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
    });

    await browser.close();

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="report.pdf"',
      },
    });
  } catch (error: any) {
    console.error('Excel/PDF generation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}