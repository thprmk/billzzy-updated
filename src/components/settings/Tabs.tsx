'use client';

import { cn } from '@/lib/utils';
import React from 'react';
import {
  Store, KeyRound, Truck, MessageCircle, CreditCard, Share2, QrCode, IndianRupee ,Tags, Package,
} from 'lucide-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faShopify } from '@fortawesome/free-brands-svg-icons';

type ActiveTab = 'shop' | 'password' | 'shipping' | 'whatsapp' | 'integrations' | 'shopify' | 'billing' | 'tax' | 'qrcode'|'attributes'| 'product-types';

export function SettingsTabs({
  activeTab,
  setActiveTab,
}: {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
}) {
  const tabs = [
    { name: 'Shop Information', key: 'shop', icon: Store },
    { name: 'Password', key: 'password', icon: KeyRound },
    { name: 'Shipping', key: 'shipping', icon: Truck },
    { name: 'WhatsApp', key: 'whatsapp', icon: MessageCircle },
    { name: 'Billing', key: 'billing', icon: CreditCard },
    { name: 'Shopify', key: 'shopify', icon: faShopify, type: 'fontawesome' }, 
    { name: 'QR Code', key: 'qrcode', icon: QrCode },
    { name: 'Integrations', key: 'integrations', icon: Share2 },
    { name: 'Tax', key: 'tax', icon: IndianRupee  },
    { name: 'Product Attributes', key: 'attributes', icon: Tags },
    { name: 'Product Types', key: 'product-types', icon: Package },
  ];

  return (
    // Use a border-b on the container for a clean underline effect on the whole list
    <nav className="flex flex-col ">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => setActiveTab(tab.key as ActiveTab)}
          className={cn(
            // --- NEW STYLING ---
            'flex items-center gap-3 px-4 py-3 text-sm font-medium text-left transition-colors',
            'border-b-2 md:border-b-0 md:border-l-2', // Borders for the active state indicator
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            activeTab === tab.key
              ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50' // Active state: Indigo border and text
              : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-100/70' // Inactive state: Transparent border
          )}
        >
         {/* --- NEW LOGIC TO RENDER DIFFERENT ICON TYPES --- */}
         {tab.type === 'fontawesome' ? (
            <FontAwesomeIcon
              icon={tab.icon}
              className={cn(
                'h-5 w-5',
                activeTab === tab.key ? 'text-indigo-600' : 'text-gray-400'
              )}
            />
          ) : (
            <tab.icon className={cn(
              'h-5 w-5',
              activeTab === tab.key ? 'text-indigo-600' : 'text-gray-400'
            )} />
          )}
          <span>{tab.name}</span>
        </button>
      ))}
    </nav>
  );
}