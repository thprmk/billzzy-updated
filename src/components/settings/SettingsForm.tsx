'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SettingsTabs } from '@/components/settings/Tabs';
import { ShopSettings } from '@/components/settings/ShopSettings';
import { PasswordSettings } from '@/components/settings/PasswordSettings';
import { ShippingSettings } from '@/components/settings/ShippingSettings';
import { IntegrationsSettings } from '@/components/settings/IntegrationsSettings';
import React from 'react';
import type { OrganisationDetails } from '@/types/settings';
import BillingTab from '../mandate/BillingTab';
import { WhatsAppSettings } from './WhatsappSettings';
import { TaxSettings } from '@/components/settings/TaxSettings';
import ShopifySettings from './ShopifySettings';
import QrCodeSettings from './QrCodeSettings ';
import ProductAttributes from './ProductAttributes';
import ProductTypes from './ProductTypes'; 


// Define the possible tab values for type safety
type ActiveTab = 'shop' | 'password' | 'shipping' | 'whatsapp' | 'integrations' | 'shopify' | 'billing' | 'tax' | 'qrcode'|'attributes' | 'product-types';

interface ExtendedOrganisationDetails extends OrganisationDetails {
  subscriptionType?: string;
  mandates?: any[];
  activeMandate?: any;
}

// Rename the component to be more descriptive of its role
export default function SettingsManager({ organisation, initialData }: { organisation: ExtendedOrganisationDetails, initialData: ExtendedOrganisationDetails }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ActiveTab>('shop');

  // A helper function to render the correct content based on the active tab
  const renderActiveTab = () => {
    switch (activeTab) {
      case 'shop':
        return <ShopSettings initialData={organisation} onSuccess={() => router.refresh()} />;
      case 'password':
        return <PasswordSettings onSuccess={() => router.refresh()} />;
      case 'shopify':
        return <ShopifySettings initialDomain={organisation.shopifyDomain} initialToken={organisation.shopifyToken} />;
      case 'shipping':
        return <ShippingSettings />;
      case 'whatsapp':
        return <WhatsAppSettings initialNumber={initialData.whatsappNumber || ''} onSuccess={() => router.refresh()} />;
      case 'integrations':
        return <IntegrationsSettings razorpayConnected={!!initialData.razorpayAccessToken} onRazorpayUpdate={() => router.refresh()} />;
      case 'billing':
        return <BillingTab initialSubscriptionType={initialData.subscriptionType} mandates={initialData.mandates} endDate={initialData.endDate} activeMandate={initialData.activeMandate} />;
      case 'tax':
        return <TaxSettings />;
      case 'qrcode':
        return <QrCodeSettings />;

        case 'attributes': // <-- 3. ADD THE NEW CASE
        return <ProductAttributes />;

        case 'product-types':
  return <ProductTypes />;
      default:
        return null; // Or a default component
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8">
      {/* --- NEW: Page Header --- */}
      <div className="mb-8">
        <h1 className="text-2xl text-gray-800 font-semibold">Settings</h1>
        <p className="text-gray-500 mt-1">Manage your shop details, security, and integrations.</p>
      </div>

      {/* --- NEW: Main Layout Container --- */}
  
        {/* --- NEW: Grid Layout for Sidebar and Content --- */}
        <div className="grid grid-cols-1 md:grid-cols-4 min-h-[70vh]">
          
          {/* Left side: Tabs (Sidebar) */}
          <div className="col-span-1 border-r border-gray-200 bg-gray-50/50 p-4">
            <SettingsTabs activeTab={activeTab} setActiveTab={setActiveTab} />
          </div>

          {/* Right side: Content Area */}
          <div className="col-span-3 p-6 md:p-8">
            {renderActiveTab()}
          </div>

        </div>
      </div>
  );
}