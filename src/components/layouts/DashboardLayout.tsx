'use client';

import { useState } from 'react';
import Sidebar from '../dashboard/Sidebar';
import React from 'react';  // Add this import

export default function DashboardLayout({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="h-screen flex overflow-hidden bg-gray-100">
      <Sidebar 
        isOpen={sidebarOpen} 
        setIsOpen={setSidebarOpen}
        // userRole={session?.user?.role}
      />
      
      <div className="flex-1 overflow-auto focus:outline-none">
        {/* <Header 
          openSidebar={() => setSidebarOpen(true)}
          user={session?.user}
        /> */}
        
        <main className="flex-1 md:ml-[15rem] relative z-0 overflow-y-auto pb-6 px-4 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}