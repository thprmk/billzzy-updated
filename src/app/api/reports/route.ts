/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import ExcelJS from 'exceljs';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-options';

// Helper function to get the end of a given day for correct date range filtering
function getEndOfDay(dateString: string): Date {
    const date = new Date(dateString);
    date.setHours(23, 59, 59, 999);
    return date;
}

// Helper function to fetch transactions based on filters
async function fetchFilteredTransactions(organisationId: number, startDate: string, endDate: string, filters: { mode: string, status: string }) {
  const whereClause: any = {
    organisationId: organisationId,
    date: {
      gte: new Date(startDate),
      lte: getEndOfDay(endDate),
    },
  };

  if (filters.mode && filters.mode !== 'ALL') {
    whereClause.billingMode = filters.mode;
  }

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

// POST function to fetch data for the UI report table
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
    console.error('Error fetching report data:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch report data', error: error.message }, { status: 500 });
  }
}

// GET function to download the report as an Excel file
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

  if (format !== 'xlsx') {
    return NextResponse.json({ error: 'Unsupported format. Only xlsx is available.' }, { status: 400 });
  }

  try {
    // 1. Fetch the raw data from the database
    const transactions = await fetchFilteredTransactions(parseInt(session.user.id), start, end, { mode, status });
    
    // 2. Prepare "flattened" data for the report
    const reportRows = transactions.flatMap(tx => 
        tx.items.length > 0 
        ? tx.items.map(item => ({
            date: tx.date ? tx.date.toISOString().split('T')[0] : 'N/A',
            billNo: tx.companyBillNo ?? tx.billNo,
            billingMode: tx.billingMode ?? 'N/A',
            paymentStatus: tx.paymentStatus ?? 'N/A',
            customerName: tx.customer?.name ?? 'N/A',
            customerPhone: tx.customer?.phone ?? 'N/A',
            shippingCost: tx.shippingCost ?? 0,
            taxAmount: tx.taxAmount ?? 0,
            productName: item.product?.name ?? 'N/A',
            quantity: item.quantity ?? 0,
            itemPrice: item.quantity > 0 ? (item.totalPrice / item.quantity) : 0,
            lineTotal: item.totalPrice ?? 0,
            billTotal: tx.totalPrice,
          }))
        : [{
            date: tx.date ? tx.date.toISOString().split('T')[0] : 'N/A',
            billNo: tx.companyBillNo ?? tx.billNo,
            billingMode: tx.billingMode ?? 'N/A',
            paymentStatus: tx.paymentStatus ?? 'N/A',
            customerName: tx.customer?.name ?? 'N/A',
            customerPhone: tx.customer?.phone ?? 'N/A',
            shippingCost: tx.shippingCost ?? 0,
            taxAmount: tx.taxAmount ?? 0,
            productName: 'N/A',
            quantity: 1,
            itemPrice: tx.totalPrice,
            lineTotal: tx.totalPrice,
            billTotal: tx.totalPrice,
          }]
    );

    // 3. Correctly calculate Grand Total from parent bills
    const grandTotal = transactions.reduce((sum, tx) => sum + tx.totalPrice, 0);

    // 4. --- UPDATED: Added new columns for the Excel sheet ---
    const columns = [
        { header: 'Date', key: 'date', width: 15 },
        { header: 'Bill No', key: 'billNo', width: 15 },
        { header: 'Mode', key: 'billingMode', width: 15 },
        { header: 'Payment Status', key: 'paymentStatus', width: 15 },
        { header: 'Customer', key: 'customerName', width: 25 },
        { header: 'Phone Number', key: 'customerPhone', width: 20 },
        { header: 'Shipping Cost', key: 'shippingCost', width: 15 }, // <<< NEW COLUMN
        { header: 'Tax Amount', key: 'taxAmount', width: 15 },    // <<< NEW COLUMN
        { header: 'Product', key: 'productName', width: 30 },
        { header: 'Qty', key: 'quantity', width: 10 },
        { header: 'Item Price', key: 'itemPrice', width: 15 },
        { header: 'Line Total', key: 'lineTotal', width: 15 },
        { header: 'Bill Total', key: 'billTotal', width: 15 },
    ];

    // 5. Generate the Excel file
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sales Report');
    worksheet.columns = columns;

    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.eachCell((cell) => {
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE0E0E0' }
        };
        cell.border = {
            bottom: { style: 'thin' }
        };
    });

    worksheet.addRows(reportRows);

    // --- UPDATED: Adjusted position for the Grand Total row ---
    worksheet.addRow([]);
    const totalRow = worksheet.addRow({});
    totalRow.getCell('L').value = 'Grand Total:'; // Moved to Column K
    totalRow.getCell('M').value = grandTotal;    // Moved to Column L
    totalRow.getCell('L').font = { bold: true };
    totalRow.getCell('M').font = { bold: true };
    totalRow.getCell('M').numFmt = '#,##0.00';
    
    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer, { 
      headers: { 
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 
        'Content-Disposition': `attachment; filename="sales-report-${start}-to-${end}.xlsx"`, 
        'Access-Control-Expose-Headers': 'Content-Disposition', 
      } 
    });

  } catch (error: any) {
    console.error('Excel generation error:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}