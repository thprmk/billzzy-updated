// app/admin/page.tsx

import { prisma } from '@/lib/prisma'; // Adjust the import path based on your project structure
import { Organisation } from '@prisma/client';
import AdminDashboard from '@/components/admin/AdminTable';
import React from 'react';  // Add this import

interface OrganisationWithRemainingDays extends Organisation {
  remainingDays: number;
}

const AdminPage = async () => {


  const organisations = await prisma.organisation.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      endDate: true,
      mobileNumber:true,
      smsCount:true
    },
  });

  

  // Calculate remaining days
  const orgsWithRemainingDays: OrganisationWithRemainingDays[] = organisations.map((org) => {
    const endDate = new Date(org.endDate);
    const today = new Date();
    const remainingDays = Math.ceil(
      (endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );
    return {
      ...org,
      remainingDays,
    };
  });
  console.log(orgsWithRemainingDays);
  

  return <AdminDashboard organisations={orgsWithRemainingDays} />;
};

export default AdminPage;
