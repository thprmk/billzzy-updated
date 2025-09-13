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

  console.log(`--- API: POST /api/invoices ---`);
  console.log(`API INFO: Creating invoice for organisationId: ${organisationId}`);

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
      notes,
      status 
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
        status: status || 'DRAFT', // All new invoices must start as drafts.
        subTotal,
        totalTax,
        totalAmount,
        notes,
        // Connect the invoice to the logged-in user's organization.
        organisation: {
          connect: { id: organisationId }
        },

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

    console.log('API RESULT: Successfully created new invoice:', newInvoice);

    // 5. --- RESPONSE ---
    // Send back the complete new invoice object with a 201 "Created" status.
    return NextResponse.json(newInvoice, { status: 201 });

  } catch (error) {
    // If any part of the process fails, log the error and send a generic 500 server error.
    console.error("[INVOICE_POST_ERROR]", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}



// // app/api/invoices/[id]/pdf/route.ts
// import { NextRequest, NextResponse } from 'next/server'
// import { PrismaClient } from '@prisma/client'
// import jsPDF from 'jspdf'
// import fs from 'fs'
// import path from 'path'

// const prisma = new PrismaClient()

// export async function GET(
//   request: NextRequest,
//   { params }: { params: { id: string } }
// ) {
//   try {
//     const invoiceId = parseInt(params.id)

//     // Fetch invoice with items and attachments
//     const invoice = await prisma.invoice.findUnique({
//       where: { id: invoiceId },
//       include: {
//         items: true,
//         attachments: true
//       }
//     })

//     if (!invoice) {
//       return NextResponse.json(
//         { error: 'Invoice not found' },
//         { status: 404 }
//       )
//     }

//     // Create PDF
//     const pdf = new jsPDF()
//     let yPosition = 20

//     // Add invoice header
//     pdf.setFontSize(20)
//     pdf.text('INVOICE', 20, yPosition)
//     yPosition += 10

//     pdf.setFontSize(12)
//     pdf.text(`Invoice #: ${invoice.invoiceNumber}`, 20, yPosition)
//     yPosition += 10

//     // Add invoice details
//     pdf.text(`Issue Date: ${invoice.issueDate.toLocaleDateString()}`, 20, yPosition)
//     yPosition += 8
//     pdf.text(`Due Date: ${invoice.dueDate.toLocaleDateString()}`, 20, yPosition)
//     yPosition += 8
//     pdf.text(`Status: ${invoice.status}`, 20, yPosition)
//     yPosition += 15

//     // Add customer info
//     pdf.text('Bill To:', 20, yPosition)
//     yPosition += 8
//     const customerLines = invoice.customerInfo.split('\n')
//     customerLines.forEach(line => {
//       pdf.text(line, 20, yPosition)
//       yPosition += 6
//     })
//     yPosition += 10

//     // Add items table
//     pdf.text('Items:', 20, yPosition)
//     yPosition += 10

//     // Table headers
//     pdf.text('Description', 20, yPosition)
//     pdf.text('Qty', 120, yPosition)
//     pdf.text('Price', 140, yPosition)
//     pdf.text('Total', 170, yPosition)
//     yPosition += 8

//     // Table items
//     invoice.items.forEach(item => {
//       pdf.text(item.description, 20, yPosition)
//       pdf.text(item.quantity.toString(), 120, yPosition)
//       pdf.text(`$${item.unitPrice.toFixed(2)}`, 140, yPosition)
//       pdf.text(`$${item.total.toFixed(2)}`, 170, yPosition)
//       yPosition += 8
//     })

//     yPosition += 10

//     // Add totals
//     pdf.text(`Subtotal: $${invoice.subTotal.toFixed(2)}`, 140, yPosition)
//     yPosition += 8
//     pdf.text(`Tax: $${invoice.totalTax.toFixed(2)}`, 140, yPosition)
//     yPosition += 8
//     pdf.setFontSize(14)
//     pdf.text(`Total: $${invoice.totalAmount.toFixed(2)}`, 140, yPosition)
//     yPosition += 15

//     // Add notes if any
//     if (invoice.notes) {
//       pdf.setFontSize(12)
//       pdf.text('Notes:', 20, yPosition)
//       yPosition += 8
//       const noteLines = invoice.notes.split('\n')
//       noteLines.forEach(line => {
//         pdf.text(line, 20, yPosition)
//         yPosition += 6
//       })
//     }

//     // Add images if any (on a new page if needed)
//     if (invoice.attachments.length > 0) {
//       pdf.addPage()
//       yPosition = 20
      
//       pdf.setFontSize(16)
//       pdf.text('Attachments', 20, yPosition)
//       yPosition += 20

//       for (const attachment of invoice.attachments) {
//         if (attachment.mimeType.startsWith('image/')) {
//           try {
//             const imagePath = path.join(process.cwd(), 'public', attachment.filePath)
//             if (fs.existsSync(imagePath)) {
//               const imageData = fs.readFileSync(imagePath)
//               const base64Image = `data:${attachment.mimeType};base64,${imageData.toString('base64')}`
              
//               // Add image to PDF (adjust size as needed)
//               const imgWidth = 80
//               const imgHeight = 60
              
//               pdf.addImage(base64Image, 'JPEG', 20, yPosition, imgWidth, imgHeight)
              
//               // Add filename below image
//               pdf.setFontSize(10)
//               pdf.text(attachment.originalName, 20, yPosition + imgHeight + 10)
              
//               yPosition += imgHeight + 20
              
//               // Start new page if running out of space
//               if (yPosition > 250) {
//                 pdf.addPage()
//                 yPosition = 20
//               }
//             }
//           } catch (error) {
//             console.error('Error adding image to PDF:', error)
//           }
//         }
//       }
//     }

//     // Generate PDF buffer
//     const pdfBuffer = Buffer.from(pdf.output('arraybuffer'))

//     return new NextResponse(pdfBuffer, {
//       headers: {
//         'Content-Type': 'application/pdf',
//         'Content-Disposition': `attachment; filename="invoice-${invoice.invoiceNumber}.pdf"`
//       }
//     })

//   } catch (error) {
//     console.error('Error generating PDF:', error)
//     return NextResponse.json(
//       { error: 'Failed to generate PDF' },
//       { status: 500 }
//     )
//   }
// }