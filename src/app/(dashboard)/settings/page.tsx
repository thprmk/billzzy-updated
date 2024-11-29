// app/settings/page.tsx
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import SettingsForm from '@/components/settings/SettingsForm';
import React from 'react';  // Add this import

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  const organisationData = await prisma.organisation.findUnique({
    where: {
      id: parseInt(session.user.id)
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      shopName: true,
      flatNo: true,
      street: true,
      city: true,
      district: true,
      state: true,
      country: true,
      pincode: true,
      mobileNumber: true,
      landlineNumber: true,
      websiteAddress: true,
      gstNumber: true,
      companySize: true,
      whatsappNumber: true,
    }
  });

  if (!organisationData) {
    redirect('/login');
  }

  return <SettingsForm initialData={organisationData} />;
}