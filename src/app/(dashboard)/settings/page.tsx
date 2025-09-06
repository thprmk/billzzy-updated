// src/app/(dashboard)/settings/page.tsx

import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import SettingsForm from '@/components/settings/SettingsForm';
import React from 'react'; // It's good practice to import React

export const revalidate = 0; 

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect('/login');
  }

  const orgId = parseInt(session.user.id, 10);
  const organisationData = await prisma.organisation.findUnique({
    where: { id: orgId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      shopName: true,
      endDate: true,
      subscriptionType: true,
      razorpayAccessToken: true,
      flatNo: true,
      street: true,
      district: true,
      state: true,
      country: true,
      pincode: true,
      mobileNumber: true,
      landlineNumber: true,
      websiteAddress: true,
      gstNumber: true,
      companySize: true,
      // You may need to add other fields from the organisation model
      // that your components expect in initialData, like shopifyDomain, etc.
      shopifyDomain: true,
      shopifyToken: true,
      whatsappNumber: true,
    }
  });

  if (!organisationData) {
    redirect('/login');
  }

  let mandates = [];
  let activeMandate = null;
  if (organisationData?.subscriptionType !== 'trial') {
    [mandates, activeMandate] = await Promise.all([
      prisma.mandate.findMany({
        where: { organisationId: orgId },
        orderBy: { id: 'desc' },
      }),
      prisma.activeMandate.findUnique({
        where: { organisationId: orgId },
      }),
    ]);
  }

  return (
    // --- THIS IS THE NEW CENTERING WRAPPER ---
    <div className="flex items-center justify-center min-h-full p-0 md:p-4">
      <div className="w-full max-w-7xl"> {/* Constrains the max width of the settings card */}
        <SettingsForm 
          organisation={organisationData}
          initialData={{
            ...organisationData, // Pass all fetched organisation data
            mandates,
            activeMandate,
          }}
        />
      </div>
    </div>
  );
}