// src/lib/invoice-pdf.ts

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { Invoice } from '@/types/invoice';
import { Organisation } from '@/types/organization';
import * as numberToWords from 'number-to-words';

// Helper function to convert a number to words, e.g., 100 -> "One Hundred"
function toWords(num: number): string {
  const words = numberToWords.toWords(num);
  // This capitalizes the first letter of each word
  return words.replace(/\b\w/g, (char: string) => char.toUpperCase());
}

export async function createInvoicePDF(invoice: Invoice, organisation: Organisation): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage();
  const { width, height } = page.getSize(); // A4 page size: 595.28 x 841.89

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  const colors = {
      text: rgb(0, 0, 0),
      gray: rgb(0.3, 0.3, 0.3),
      lightGray: rgb(0.95, 0.95, 0.95),
      borderColor: rgb(0.85, 0.85, 0.85),
  };

  let y = height - 50;
  const marginX = 50;
  const rightAlignX = width - marginX;

  // --- 1. Header Section (Corrected) ---
  page.drawText(organisation.shopName, { x: marginX, y, font: boldFont, size: 20 });
  
  page.drawText('INVOICE', { x: rightAlignX - 100, y, font: boldFont, size: 30, color: colors.gray });

  // Right-aligned company details, positioned below "INVOICE"
  const companyDetailsLines = [
    organisation.name,
    `${organisation.street}, ${organisation.state} ${organisation.pincode}`,
    'India',
    organisation.phone,
    organisation.email,
  ];

  let headerRightY = y - 25; // Start drawing below the "INVOICE" text
  companyDetailsLines.forEach(line => {
      if (line) {
          const textWidth = font.widthOfTextAtSize(line, 9);
          page.drawText(line, {
              x: rightAlignX - textWidth, // Right-align the text
              y: headerRightY,
              font: font,
              size: 9,
          });
          headerRightY -= 12; // Move down for the next line
      }
  });

  y -= 95; // Adjust the main y-coordinate to move past the entire header block
  page.drawLine({ start: { x: marginX - 10, y }, end: { x: width - (marginX - 10), y }, thickness: 1, color: colors.borderColor });
  y -= 5;

  // 2. Invoice Info Box
  const boxTopY = y;
  page.drawText('Invoice#', { x: marginX, y: y - 15, font: boldFont, size: 9 });
  page.drawText(`: ${invoice.invoiceNumber}`, { x: marginX + 80, y: y - 15, font, size: 9 });
  page.drawText('Invoice Date', { x: marginX, y: y - 30, font: boldFont, size: 9 });
  page.drawText(`: ${new Date(invoice.issueDate).toLocaleDateString('en-GB')}`, { x: marginX + 80, y: y - 30, font, size: 9 });
  page.drawText('Terms', { x: marginX, y: y - 45, font: boldFont, size: 9 });
  page.drawText(`: Custom`, { x: marginX + 80, y: y - 45, font, size: 9 });
  page.drawText('Due Date', { x: marginX, y: y - 60, font: boldFont, size: 9 });
  page.drawText(`: ${new Date(invoice.dueDate).toLocaleDateString('en-GB')}`, { x: marginX + 80, y: y - 60, font, size: 9 });

  page.drawRectangle({ x: marginX - 10, y: y - 75, width: width - 2 * (marginX - 10), height: 80, borderColor: colors.borderColor, borderWidth: 1 });
  page.drawLine({ start: { x: 350, y: boxTopY }, end: { x: 350, y: y - 75 }, thickness: 1, color: colors.borderColor });
  y -= 90;

  //3. Bill To Section
  const customerInfo = invoice.notes?.split('\n\n')[0] || 'N/A';
  page.drawText('Bill To', { x: marginX, y, font: boldFont, size: 10 });
  y -= 15;
  page.drawText(customerInfo, { x: marginX, y, font, size: 10 });
  y -= 25;

  //4. Items Table 
  const tableTop = y;
  page.drawRectangle({ x: marginX, y: y - 25, width: width - 2 * marginX, height: 25, color: colors.lightGray });
  page.drawLine({ start: { x: marginX, y: y - 25 }, end: { x: width - marginX, y: y - 25 }, thickness: 1, color: colors.borderColor });
  page.drawLine({ start: { x: marginX, y: tableTop }, end: { x: width - marginX, y: tableTop }, thickness: 1, color: colors.borderColor });

  page.drawText('#', { x: marginX + 10, y: y - 17, font: boldFont, size: 10 });
  page.drawText('Item & Description', { x: marginX + 40, y: y - 17, font: boldFont, size: 10 });
  page.drawText('Qty', { x: rightAlignX - 40, y: y - 17, font: boldFont, size: 10 });
  y -= 35;

  invoice.items.forEach((item, i) => {
    page.drawText((i + 1).toString(), { x: marginX + 10, y, font, size: 10 });
    page.drawText(item.description, { x: marginX + 40, y, font, size: 10 });
    const qtyText = item.quantity.toFixed(2);
    const qtyWidth = font.widthOfTextAtSize(qtyText, 10);
    page.drawText(qtyText, { x: rightAlignX - qtyWidth, y, font, size: 10 });
    y -= 20;
  });

  const tableBottom = y + 10;
  page.drawRectangle({ x: marginX, y: tableBottom, width: width - 2 * marginX, height: tableTop - tableBottom, borderColor: colors.borderColor, borderWidth: 1 });
  y = tableBottom - 15;

  const subTotalText = `INR ${invoice.subTotal.toFixed(2)}`;
  const subTotalWidth = font.widthOfTextAtSize(subTotalText, 10);
  page.drawText('Sub Total', { x: rightAlignX - 150, y, font, size: 10 });
  page.drawText(subTotalText, { x: rightAlignX - subTotalWidth, y, font, size: 10 });
  y -= 40;

  // 5. Footer Section
  const totalInWords = `Indian Rupee ${toWords(Math.round(invoice.totalAmount))} Only`;
  page.drawText('Total in Words', { x: marginX, y, font: boldFont, size: 9 });
  page.drawText(totalInWords, { x: marginX, y: y - 12, font, size: 9 });

  const notesText = invoice.notes?.split('\n\n')[1] || '';
  page.drawText('Notes', { x: marginX, y: y - 40, font: boldFont, size: 9 });
  page.drawText(notesText, { x: marginX, y: y - 52, font, size: 9 });

  const totalsBoxX = rightAlignX - 220;
  const totalsBoxY = y - 10;
  page.drawRectangle({ x: totalsBoxX, y: totalsBoxY - 45, width: 220, height: 50, borderColor: colors.borderColor, borderWidth: 1 });
  page.drawText('Total', { x: totalsBoxX + 10, y: totalsBoxY - 15, font, size: 10 });
  page.drawText(`INR ${invoice.totalAmount.toFixed(2)}`, { x: totalsBoxX + 120, y: totalsBoxY - 15, font, size: 10 });
  page.drawText('Balance Due', { x: totalsBoxX + 10, y: totalsBoxY - 35, font: boldFont, size: 12 });
  page.drawText(`INR ${invoice.totalAmount.toFixed(2)}`, { x: totalsBoxX + 120, y: totalsBoxY - 35, font: boldFont, size: 12 });

  // Payment Information at a fixed position from the bottom
  y = 150; 
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