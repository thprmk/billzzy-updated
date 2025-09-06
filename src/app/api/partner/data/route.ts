// src/app/api/partner/data/route.ts

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    // --- STEP 1: AUTHENTICATION ---
    // Get the secret key from the request headers
    const authHeader = request.headers.get('Authorization');
    
    // Check if the header exists and is in the format "Bearer <key>"
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized: Missing or invalid API key' }, { status: 401 });
    }

    const providedKey = authHeader.split(' ')[1];

    // Compare the provided key with your secret key from the .env file
    if (providedKey !== process.env.PARTNER_API_KEY) {
      return NextResponse.json({ error: 'Unauthorized: Invalid API key' }, { status: 401 });
    }

    // --- STEP 2: AUTHORIZATION & DATA FETCHING ---
    // Get the specific organisation ID from your .env file
    const organisationId = parseInt(process.env.PARTNER_ACCESS_ORG_ID || '');

    if (isNaN(organisationId)) {
        throw new Error('Server configuration error: Invalid organisation ID.');
    }

    // Fetch all the data for that one specific user
    const [transactions, products] = await Promise.all([
      // Fetch all transactions (bills)
      prisma.transactionRecord.findMany({
        where: { organisationId },
        include: {
          customer: true,
          items: {
            include: {
              product: true,
              productVariant: true,
            },
          },
        },
        orderBy: { date: 'desc' },
      }),
      
      // Fetch all products
      prisma.product.findMany({
        where: { organisationId },
        include: {
          variants: true,
          category: true,
        },
        orderBy: { name: 'asc' },
      }),
    ]);

    // --- STEP 3: RETURN THE DATA ---
    const responseData = {
      organisationId,
      data: {
        transactions, // This is the list of all bills
        products,     // This is the list of all products
      },
    };

    return NextResponse.json(responseData);

  } catch (error) {
    console.error('Partner API Error:', error);
    return NextResponse.json({ error: 'An internal server error occurred.' }, { status: 500 });
  }
}