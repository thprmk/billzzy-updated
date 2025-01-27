// app/settings/SettingsForm.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import { SettingsTabs } from '@/components/settings/Tabs';
import { ShopSettings } from '@/components/settings/ShopSettings';
import { PasswordSettings } from '@/components/settings/PasswordSettings';
import { ShippingSettings } from '@/components/settings/ShippingSettings';
import { IntegrationsSettings } from '@/components/settings/IntegrationsSettings';
import type { OrganisationDetails } from '@/types/settings';
import React from 'react';  
import { WhatsAppSettings } from './WhatsappSettings';

export default function SettingsForm({ initialData }: { initialData: OrganisationDetails }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'shop' | 'password' | 'shipping' | 'whatsapp' | 'integrations'>('shop');

  return (
    <div className="min-h-screen bg-gray-50 place-content-center md:p-4">
      <div className="max-w-6xl min-h-[80vh] mx-auto bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="flex flex-col md:flex-row">
          {/* Tab Navigation */}
          <SettingsTabs activeTab={activeTab} setActiveTab={setActiveTab} />
          
          {/* Content Area */}
          <div className="flex-1 p-6 md:p-8">
            {activeTab === 'shop' && (
              <ShopSettings
                initialData={initialData}
                onSuccess={() => router.refresh()}
              />
            )}

            {activeTab === 'password' && (
              <PasswordSettings
                onSuccess={() => router.refresh()}
              />
            )}

            {activeTab === 'shipping' && <ShippingSettings />}

            {activeTab === 'whatsapp' && (
              <WhatsAppSettings
                initialNumber={initialData.whatsappNumber || ''}
                onSuccess={() => router.refresh()}
              />
            )}

            {activeTab === 'integrations' && (
              <IntegrationsSettings
                razorpayConnected={!!initialData.razorpayAccessToken}
                onRazorpayUpdate={() => router.refresh()}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}