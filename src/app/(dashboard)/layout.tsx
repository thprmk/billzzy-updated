// app/(dashboard)/layout.tsx
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import React from 'react';  // Add this import

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  // Check subscription status on server side
  if (session.user?.endDate) {
    const endDate = new Date(session.user.endDate);
    if (endDate < new Date()) {
      redirect('/lock');
    }
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}