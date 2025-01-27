// components/settings/Tabs.tsx
'use client';

import { cn } from '@/lib/utils';
import React from 'react';  

export function SettingsTabs({
  activeTab,
  setActiveTab,
}: {
  activeTab: string;
  setActiveTab: (tab: any) => void;
}) {
  const tabs = [
    { name: 'Shop Information', key: 'shop' },
    { name: 'Password', key: 'password' },
    { name: 'Shipping', key: 'shipping' },
    { name: 'WhatsApp', key: 'whatsapp' },
    { name: 'Integrations', key: 'integrations' },
  ];

  return (
    <div className="w-full md:w-64 lg:w-72 border-r">
      <nav className="flex md:flex-col overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'px-4 py-3 text-sm font-medium text-left transition-colors',
              activeTab === tab.key
                ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-600'
                : 'text-gray-600 hover:bg-gray-50'
            )}
          >
            {tab.name}
          </button>
        ))}
      </nav>
    </div>
  );
}