// src/lib/data/invoices.ts

import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth-options';
import { getServerSession } from 'next-auth';

export async function getInvoiceById(invoiceId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organisationId) {
    return null; // Not authenticated
  }
  
  const organisationId = Number(session.user.organisationId);
  const id = Number(invoiceId);

  try {
    const invoice = await prisma.invoice.findFirst({
      where: {
        id: id,
        organisationId: organisationId, // Security check
      },
      include: {
        items: true,
      },
    });
    return invoice;
  } catch (error) {
    console.error("Failed to fetch invoice:", error);
    return null;
  }
}