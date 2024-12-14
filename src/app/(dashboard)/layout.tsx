// app/(dashboard)/layout.tsx
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-options';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import React from 'react';  // Add this import
import OfflineMessage from '@/components/layouts/OfflineMessage';

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

  return <DashboardLayout>        <OfflineMessage /> {/* Add the component here */}
{children}</DashboardLayout>;
}