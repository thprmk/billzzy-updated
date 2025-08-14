// src/app/api/admin/deleteOrganisation/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
// You should also add your session and admin checks here for security

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // Safely get the ID, checking for 'id' or 'organisationId'
    const organisationId = Number(body.id || body.organisationId);

    // Add validation to prevent crashes
    if (!organisationId || isNaN(organisationId)) {
      return NextResponse.json({ 
        success: false, error: 'Invalid or missing Organisation ID.' 
      }, { status: 400 });
    }

    // The transaction is now much simpler
    await prisma.$transaction(async (tx) => {
      // 1. Manually delete records that DO NOT have `onDelete: Cascade`
      // These are required to be deleted first.
      await tx.customerSubmission.deleteMany({ where: { organisationId } });
      await tx.activeMandate.deleteMany({ where: { organisationId } });
      await tx.customShipping.deleteMany({ where: { organisationId } });
      await tx.tax.deleteMany({ where: { organisationId } });
      await tx.subscriptionDetails.deleteMany({ where: { organisationId } });

      // 2. Now, delete the Organisation.
      // The database will automatically delete all related Products, Customers,
      // Transactions, etc., because of the `onDelete: Cascade` rule in your schema.
      await tx.organisation.delete({
        where: { id: organisationId }
      });
    });

    return NextResponse.json({ 
      success: true,
      message: 'Organisation and all related records deleted successfully' 
    });

  } catch (error: any) {
    console.error('Error in deletion process:', error);
    
    // Check for a specific Prisma error if the record to delete wasn't found
    if (error.code === 'P2025') {
       // THE FIX: Use a generic message that doesn't need the 'organisationId' variable.
       return NextResponse.json({ 
        success: false, error: `The organisation to be deleted could not be found.`
      }, { status: 404 });
    }

    return NextResponse.json({ 
      success: false,
      error: 'Failed to delete organisation and related records',
      details: error.message 
    }, { 
      status: 500 
    });
  }

}