// src/app/api/invoices/route.ts

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { generateInvoiceNumber } from '@/lib/generateInvoiceNumber';
import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';


// The SDK automatically uses the CLOUDINARY_URL from your .env.local file
cloudinary.config({ secure: true });

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
      include: {
        customer: true, // Include the related customer data
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

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organisationId) {
    return NextResponse.json({ error: 'Not Authenticated' }, { status: 401 });
  }
  const organisationId = Number(session.user.organisationId);

  try {
    // 1. PARSE FORMDATA
    const formData = await req.formData();
    const logoFile = formData.get('logo') as File | null;
    const invoiceDataString = formData.get('data') as string | null;

    if (!invoiceDataString) {
      return NextResponse.json({ error: 'Missing invoice data.' }, { status: 400 });
    }
    
    const body = JSON.parse(invoiceDataString);
    const { 
      customerId, issueDate, dueDate, items, 
      subTotal, totalTax, totalAmount, notes, status 
    } = body;
    
    if (!issueDate || !dueDate || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Missing required invoice fields.' }, { status: 400 });
    }

    let uploadedLogoUrl: string | null = null;

    // 2. UPLOAD LOGO TO CLOUDINARY if it exists
    if (logoFile) {
      const buffer = Buffer.from(await logoFile.arrayBuffer());

      const uploadResult = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          { folder: 'invoice_logos' }, // Organizes uploads in Cloudinary
          (error, result) => {
            if (error) reject(error);
            resolve(result);
          }
        ).end(buffer);
      });

      uploadedLogoUrl = (uploadResult as any).secure_url;
    }

    // 3. DATABASE OPERATION
    const newInvoiceNumber = await generateInvoiceNumber(organisationId);

    const newInvoice = await prisma.invoice.create({
      data: {
        invoiceNumber: newInvoiceNumber,
        issueDate: new Date(issueDate),
        dueDate: new Date(dueDate),
        status: status || 'DRAFT',
        subTotal,
        totalTax,
        totalAmount,
        notes,
        logoUrl: uploadedLogoUrl, // Save the Cloudinary URL to the database
        organisation: {
          connect: { id: organisationId }
        },
        items: {
          create: items.map((item: InvoiceItemInput) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.total,
            product: item.productId ? { connect: { id: Number(item.productId) } } : undefined,
          })),
        },
      },
      include: {
        items: true,
      },
    });

    // 4. RESPONSE
    return NextResponse.json(newInvoice, { status: 201 });

  } catch (error) {
    console.error("[INVOICE_POST_CLOUDINARY_ERROR]", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}