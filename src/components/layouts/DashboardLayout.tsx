// src/components/layouts/DashboardLayout.tsx
'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Header from '../dashboard/Header';
import { LoadingScreen } from '../ui/LoadingScreen'; // Make sure this import is correct

// Your dynamic import of the Sidebar is correct. Do not change it.
const Sidebar = dynamic(() => import('../dashboard/Sidebar'), {
  ssr: false,
  loading: () => (
    <div className="hidden md:flex md:w-64 md:flex-col bg-gray-900">
      <div className="animate-pulse h-full bg-gray-800"></div>
    </div>
  )
});

interface DashboardLayoutProps {
  user?: {
    id?: string;
    name?: string;
    shopName?: string;
    image?: string;
  };
  children: React.ReactNode;
}

export default function DashboardLayout({ user, children }: DashboardLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // This state is the key to the entire solution.
  const [isClientLoaded, setIsClientLoaded] = useState(false);

  useEffect(() => {
    // This code runs only once in the browser after the component has mounted.
    setIsClientLoaded(true);
  }, []); // The empty array means it only runs on the initial mount.

  // On the server, and on the very first render in the browser,
  // isClientLoaded is `false`. We show the LoadingScreen.
  if (!isClientLoaded) {
    return <LoadingScreen />;
  }
  
  // After the component mounts, isClientLoaded becomes `true`,
  // and we render the actual layout.
  return (
    <div className="h-screen flex overflow-hidden bg-gray-50">
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

      <div className="relative flex-1 overflow-auto focus:outline-none">
        <Header openSidebar={() => setIsSidebarOpen(true)} user={user} />
        <main className="md:ml-[15rem] md:overflow-y-auto pb-6 px-2 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}