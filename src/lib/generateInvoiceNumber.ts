// src/lib/generateInvoiceNumber.ts

import { prisma } from './prisma'; 

export async function generateInvoiceNumber(organisationId: number): Promise<string> {
  // Find the latest invoice for this organization to determine the next number
  const lastInvoice = await prisma.invoice.findFirst({
    where: { organisationId },
    orderBy: { createdAt: 'desc' },
  });

  let nextId = 1;
  if (lastInvoice && lastInvoice.invoiceNumber) {
    // This logic assumes a format like "INV-00001". It takes the last part, converts to a number, and adds 1.
    const lastIdNumber = parseInt(lastInvoice.invoiceNumber.split('-').pop() || '0');
    if (!isNaN(lastIdNumber)) {
      nextId = lastIdNumber + 1;
    }
  }

  // Format the number with a prefix and zero-padding.
  // For example, if nextId is 1, it becomes "00001". If it's 123, it becomes "00123".
  const prefix = "INV-";
  const paddedNumber = String(nextId).padStart(5, '0');

  return `${prefix}${paddedNumber}`;
}