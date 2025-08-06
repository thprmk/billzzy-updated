// src/app/api/customers/import/route.ts

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth-options';
import * as xlsx from 'xlsx';

// This function defines the expected columns in the Excel file.
// The keys (e.g., "customerName") are for our code.
// The values (e.g., "Name") are the column headers the user will see in the template.
const columnMapping = {
  customerName: 'Name',
  phone: 'Phone',
  email: 'Email',
  flatNo: 'Flat / Building No',
  street: 'Street',
  district: 'District',
  state: 'State',
  pincode: 'Pincode',
};

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const organisationId = parseInt(session.user.id, 10);

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Read the uploaded file
    const buffer = await file.arrayBuffer();
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const jsonData: any[] = xlsx.utils.sheet_to_json(sheet);

    console.log("PARSED EXCEL DATA:", JSON.stringify(jsonData, null, 2));

    // Get all existing phone numbers for this organisation to check for duplicates
    const existingPhones = await prisma.customer.findMany({
      where: { organisationId },
      select: { phone: true },
    });
    const phoneSet = new Set(existingPhones.map(c => c.phone));

    let importedCount = 0;
    let skippedCount = 0;
    const customersToCreate = [];

    // Process each row from the Excel file
    for (const row of jsonData) {
      const phone = String(row[columnMapping.phone] || '').trim();

      // Basic validation: Skip if no name or phone, or if phone number already exists
      if (!row[columnMapping.customerName] || !phone || phoneSet.has(phone)) {
        skippedCount++;
        continue;
      }

      // Add the new customer to our list to be created
      customersToCreate.push({
        name: String(row[columnMapping.customerName]),
        phone: phone,
        email: String(row[columnMapping.email] || ''),
        flatNo: String(row[columnMapping.flatNo] || ''),
        street: String(row[columnMapping.street] || ''),
        district: String(row[columnMapping.district] || ''),
        state: String(row[columnMapping.state] || ''),
        pincode: String(row[columnMapping.pincode] || ''),
        organisationId,
      });

      // Add the new phone number to our set to avoid duplicates within the same file
      phoneSet.add(phone);
      importedCount++;
    }

    // Use `createMany` for efficient bulk insertion into the database
    if (customersToCreate.length > 0) {
      await prisma.customer.createMany({
        data: customersToCreate,
      });
    }

    return NextResponse.json({
      message: 'Import complete!',
      importedCount,
      skippedCount,
    });

  } catch (error) {
    console.error('Customer import error:', error);
    return NextResponse.json({ error: 'Failed to process file. Please ensure it is a valid Excel or CSV file.' }, { status: 500 });
  }
}