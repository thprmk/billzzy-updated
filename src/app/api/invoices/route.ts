// src/app/api/invoices/route.ts

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { generateInvoiceNumber } from '@/lib/generateInvoiceNumber';
import { NextRequest, NextResponse } from 'next/server';

// Define the expected structure for an item in the request body for type safety
interface InvoiceItemInput {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  productId?: number;
}

export async function GET(req: NextRequest) {
  // 1. Authentication: Same security check as before.
  const session = await getServerSession(authOptions);
  if (!session?.user?.organisationId) {
    return NextResponse.json({ error: 'Not Authenticated' }, { status: 401 });
  }
  const organisationId = Number(session.user.organisationId);

  try {
    // 2. Database Query: Fetch all invoices for this organization.
    const invoices = await prisma.invoice.findMany({
      where: {
        organisationId: organisationId,
      },
      // Order by the most recently created
      orderBy: {
        createdAt: 'desc',
      },
    });

    // 3. Response: Send the list of invoices back to the client.
    return NextResponse.json(invoices);

  } catch (error) {
    console.error("[INVOICES_GET_ERROR]", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  // 1. --- AUTHENTICATION ---
  // Get the user's session from NextAuth to verify they are logged in.
  const session = await getServerSession(authOptions);

  // If there's no session or the session doesn't link to an organization, block the request.
  if (!session?.user?.organisationId) {
    return NextResponse.json({ error: 'Not Authenticated' }, { status: 401 });
  }
  
  // Store the organization ID for later use. Ensure it's a number for Prisma.
  const organisationId = Number(session.user.organisationId);

  try {
    // 2. --- DATA EXTRACTION & VALIDATION ---
    // Parse the JSON data sent from the frontend.
    const body = await req.json();
    const { 
      customerId, 
      issueDate, 
      dueDate, 
      items, 
      subTotal, 
      totalTax, 
      totalAmount, 
      notes 
    } = body;

    // Perform basic validation to ensure the most critical data is present.
    if (!issueDate || !dueDate || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Missing required fields: issueDate, dueDate, and items are required.' }, { status: 400 });
    }

    // 3. --- LOGIC ---
    // Call our utility function to get the next sequential invoice number for this specific organization.
    const newInvoiceNumber = await generateInvoiceNumber(organisationId);

    // 4. --- DATABASE OPERATION ---
    // Use prisma.invoice.create to save the new invoice to the database.
    // This is a single, atomic operation thanks to Prisma's nested create feature.
    // If creating an item fails, the entire invoice creation will be rolled back.
    const newInvoice = await prisma.invoice.create({
      data: {
        invoiceNumber: newInvoiceNumber,
        issueDate: new Date(issueDate),
        dueDate: new Date(dueDate),
        status: 'DRAFT', // All new invoices must start as drafts.
        subTotal,
        totalTax,
        totalAmount,
        notes,
        // Connect the invoice to the logged-in user's organization.
        organisation: {
          connect: { id: organisationId }
        },
        // If a customerId was provided, connect the invoice to that customer.
        customer: customerId ? {
          connect: { id: Number(customerId) }
        } : undefined,
        // Create all line items and connect them to this new invoice.
        items: {
          create: items.map((item: InvoiceItemInput) => ({
            description: item.description,
            quantity: parseFloat(item.quantity as any), // Convert string to number
            unitPrice: parseFloat(item.unitPrice as any), // Convert string to number
            total: item.total, // This is already a number
            product: item.productId ? {
              connect: { id: Number(item.productId) }
            } : undefined,
          })),
        },
      },
      // Include the newly created items in the response sent back to the frontend.
      include: {
        items: true, 
      },
    });

    // 5. --- RESPONSE ---
    // Send back the complete new invoice object with a 201 "Created" status.
    return NextResponse.json(newInvoice, { status: 201 });

  } catch (error) {
    // If any part of the process fails, log the error and send a generic 500 server error.
    console.error("[INVOICE_POST_ERROR]", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}