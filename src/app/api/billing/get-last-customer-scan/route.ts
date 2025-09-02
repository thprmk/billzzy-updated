// src/app/api/billing/get-last-customer-scan/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth-options';

export async function GET() {
  try {
    // --- TENANT IDENTIFICATION ---
    // 1. Get the session of the currently logged-in user (the shopkeeper).
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      // If no one is logged in, they are unauthorized.
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // 2. The user's ID from the session IS the tenant's unique Organisation ID.
    const tenantOrganisationId = parseInt(session.user.id, 10);
    console.log(`Polling for last scan for Tenant (Organisation ID): ${tenantOrganisationId}`);

    // --- TENANT-SPECIFIC QUERY ---
    // 3. Find the most recent scan that belongs ONLY to this tenant.
    //    The `where: { organisationId: ... }` clause is the key to data isolation.
    //    This prevents one tenant from ever seeing another tenant's customer scans.
    const lastScan = await prisma.pendingCustomerScan.findFirst({
      where: { organisationId: tenantOrganisationId }, // <-- CRITICAL: Filters for the current tenant
      orderBy: { createdAt: 'desc' },
    });

    if (lastScan) {
      // Delete the scan after fetching so it's not used again for this tenant.
      await prisma.pendingCustomerScan.delete({
        where: { id: lastScan.id },
      });

      console.log(`Fetched and deleted scan ID ${lastScan.id} for Tenant ${tenantOrganisationId}`);
      
      return NextResponse.json({
        success: true,
        data: { customer: { name: lastScan.customerName, phone: lastScan.customerPhone } },
      });
    } else {
      // No scans found for this specific tenant.
      return NextResponse.json({ success: true, data: { customer: null } });
    }
  } catch (error: any) {
    console.error('Failed to get last customer scan:', { message: error.message });
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}