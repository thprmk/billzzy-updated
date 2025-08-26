// src/lib/invoice-pdf.ts

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { Invoice } from '@/types/invoice';
import { Organisation } from '@/types/organization';
import * as numberToWords from 'number-to-words';

// A simpler, more robust function using a library
function toWords(num: number): string {
  const words = numberToWords.toWords(num);
  return words.replace(/\b\w/g, char => char.toUpperCase());
}

export async function createInvoicePDF(invoice: Invoice, organisation: Organisation): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage();
  const { width, height } = page.getSize();

  // --- THIS IS THE FIX ---
  // We are now using the standard, built-in Helvetica font.
  // This requires no external file downloads.
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  // --- END OF FIX ---
  
  const colors = {
      primary: rgb(0, 0, 0),
      secondary: rgb(0.3, 0.3, 0.3),
      lightGray: rgb(0.95, 0.95, 0.95),
      borderColor: rgb(0.8, 0.8, 0.8)
  };

  let y = height - 40;
  const marginX = 40;

  // Header (No longer tries to load a logo file)
  page.drawText(organisation.shopName, { x: marginX, y, font: boldFont, size: 16 });

  const orgAddress = `${organisation.street}\n${organisation.city}, ${organisation.state} ${organisation.pincode}\nIndia`;
  const orgContact = `${organisation.phone}\n${organisation.email}\n${organisation.websiteAddress}`;
  page.drawText(`${organisation.name}\n${orgAddress}\n${orgContact}`, { x: 200, y: y, font, size: 9, lineHeight: 12 });
  page.drawText('INVOICE', { x: width - marginX - 100, y, font: boldFont, size: 28, color: colors.secondary });
  y -= 80;
  page.drawLine({ start: { x: marginX, y }, end: { x: width - marginX, y }, thickness: 1, color: colors.borderColor });
  y -= 15;

  // Invoice Info
  const boxHeight = 60;
  page.drawRectangle({ x: marginX, y: y - boxHeight, width: width - (2 * marginX), height: boxHeight, borderColor: colors.borderColor, borderWidth: 1 });
  page.drawLine({ start: { x: 350, y }, end: { x: 350, y: y - boxHeight }, thickness: 1, color: colors.borderColor });
  
  page.drawText('Invoice#', { x: marginX + 10, y: y - 15, font: boldFont, size: 9 });
  page.drawText(`: ${invoice.invoiceNumber}`, { x: marginX + 90, y: y - 15, font, size: 9 });
  page.drawText('Invoice Date', { x: marginX + 10, y: y - 30, font: boldFont, size: 9 });
  page.drawText(`: ${new Date(invoice.issueDate).toLocaleDateString('en-GB')}`, { x: marginX + 90, y: y - 30, font, size: 9 });
  page.drawText('Terms', { x: marginX + 10, y: y - 45, font: boldFont, size: 9 });
  page.drawText(': Custom', { x: marginX + 90, y: y - 45, font, size: 9 });
  page.drawText('Due Date', { x: marginX + 10, y: y - 60, font: boldFont, size: 9 });
  page.drawText(`: ${new Date(invoice.dueDate).toLocaleDateString('en-GB')}`, { x: marginX + 90, y: y - 60, font, size: 9 });
  y -= (boxHeight + 15);

  // Bill To
  const customerInfo = invoice.notes?.split('\n\n')[0] || 'N/A';
  page.drawText('Bill To', { x: marginX, y, font: boldFont, size: 10 });
  y -= 15;
  page.drawText(customerInfo, { x: marginX, y, font, size: 10 });
  y -= 25;
  
  // Items Table
  const tableTopY = y;
  page.drawRectangle({ x: marginX, y: y - 30, width: width - (2 * marginX), height: 30, color: colors.lightGray, borderColor: colors.borderColor, borderWidth: 1 });
  page.drawText('#', { x: marginX + 5, y: y - 20, font: boldFont, size: 10 });
  page.drawText('Item & Description', { x: marginX + 30, y: y - 20, font: boldFont, size: 10 });
  page.drawText('Qty', { x: width - marginX - 50, y: y - 20, font: boldFont, size: 10, });
  y -= 30;

  let tableY = y;
  invoice.items.forEach((item, index) => {
    tableY -= 20;
    page.drawText((index + 1).toString(), { x: marginX + 5, y: tableY, font, size: 10 });
    page.drawText(item.description, { x: marginX + 30, y: tableY, font, size: 10 });
    page.drawText(item.quantity.toFixed(2), { x: width - marginX - 50, y: tableY, font, size: 10 });
  });
  tableY -= 20;

  page.drawLine({ start: { x: marginX, y: tableY }, end: { x: width - marginX, y: tableY }, thickness: 1, color: colors.borderColor });
  page.drawRectangle({ x: marginX, y: tableY, width: width - (2 * marginX), height: tableTopY - tableY, borderColor: colors.borderColor, borderWidth: 1 });
  page.drawText('Sub Total', { x: width - marginX - 150, y: tableY - 15, font, size: 10 });
  // --- USE "INR" INSTEAD OF "₹" ---
  page.drawText(`INR ${invoice.subTotal.toFixed(2)}`, { x: width - marginX - 80, y: tableY - 15, font, size: 10 });
  y = tableY - 40;

  // Footer
  const totalInWords = `Indian Rupee ${toWords(Math.round(invoice.totalAmount))} Only`;
  page.drawText('Total in Words', { x: marginX, y, font: boldFont, size: 9 });
  page.drawText(totalInWords, { x: marginX, y: y-12, font, size: 9 });

  const notesText = invoice.notes?.split('\n\n')[1] || '';
  page.drawText('Notes', { x: marginX, y: y-40, font: boldFont, size: 9 });
  page.drawText(notesText, { x: marginX, y: y-52, font, size: 9 });

  const totalsBoxWidth = 200;
  const totalsBoxHeight = 40;
  const totalsBoxX = width - marginX - totalsBoxWidth;
  page.drawRectangle({ x: totalsBoxX, y: y - totalsBoxHeight, width: totalsBoxWidth, height: totalsBoxHeight, borderColor: colors.borderColor, borderWidth: 1 });
  page.drawText('Total', { x: totalsBoxX + 10, y: y - 15, font, size: 10 });
  // --- USE "INR" INSTEAD OF "₹" ---
  page.drawText(`INR ${invoice.totalAmount.toFixed(2)}`, { x: totalsBoxX + 100, y: y - 15, font, size: 10 });
  page.drawText('Balance Due', { x: totalsBoxX + 10, y: y - 30, font: boldFont, size: 10 });
  page.drawText(`INR ${invoice.totalAmount.toFixed(2)}`, { x: totalsBoxX + 100, y: y - 30, font: boldFont, size: 10 });

  // Payment Info
  y -= 100;
  page.drawText('Payment Information', { x: marginX, y, font: boldFont, size: 10 });
  y -= 15;
  page.drawText(`Bank Name      : ICICI`, { x: marginX, y, font, size: 9 });
  y -= 15;
  page.drawText(`Account Number : 612805036053`, { x: marginX, y, font, size: 9 });
  y -= 15;
  page.drawText(`IFSC Code      : ICIC0006128`, { x: marginX, y, font, size: 9 });
  y -= 15;
  page.drawText(`UPI ID         : techvaseegrah.ibz@icici`, { x: marginX, y, font, size: 9 });

  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}