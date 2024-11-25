// app/settings/SettingsForm.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { toast } from 'react-toastify';
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';

interface OrganisationDetails {
  id: number;
  name: string;
  email: string;
  phone: string;
  shopName: string;
  flatNo: string;
  street: string;
  district: string;
  state: string;
  country: string;
  pincode: string;
  mobileNumber: string;
  landlineNumber?: string | null;
  websiteAddress?: string | null;
  gstNumber?: string | null;
  companySize: string;
  whatsappNumber?: string | null;
}

export default function SettingsForm({ 
  initialData 
}: { 
  initialData: OrganisationDetails 
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'shop' | 'password' | 'whatsapp'>('shop');
  const [isLoading, setIsLoading] = useState(false);

  // Shop Details State
  const [shopDetails, setShopDetails] = useState<OrganisationDetails>(initialData);

  // Password Change State
  const [passwordData, setPasswordData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // WhatsApp State
  const [whatsappNumber, setWhatsappNumber] = useState(initialData.whatsappNumber || '');

  const handleShopUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('/api/settings/shop', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(shopDetails),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update shop details');
      }

      toast.success('Shop details updated successfully');
      router.refresh();
    } catch (error) {
      toast.error('Failed to update shop details');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/settings/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          oldPassword: passwordData.oldPassword,
          newPassword: passwordData.newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update password');
      }

      toast.success('Password updated successfully');
      setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      toast.error(error.message || 'Failed to update password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleWhatsAppUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('/api/settings/shop', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ whatsappNumber }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update WhatsApp number');
      }

      toast.success('WhatsApp number updated successfully');
      router.refresh();
    } catch (error) {
      toast.error('Failed to update WhatsApp number');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      <div className="bg-white shadow-lg rounded-lg overflow-hidden">
        <div className="flex border-b">
          <button
            className={`px-6 py-3 font-medium ${
              activeTab === 'shop' ? 'bg-gray-100 border-b-2 border-indigo-500' : ''
            }`}
            onClick={() => setActiveTab('shop')}
          >
            Shop Information
          </button>
          <button
            className={`px-6 py-3 font-medium ${
              activeTab === 'password' ? 'bg-gray-100 border-b-2 border-indigo-500' : ''
            }`}
            onClick={() => setActiveTab('password')}
          >
            Password
          </button>
          <button
            className={`px-6 py-3 font-medium ${
              activeTab === 'whatsapp' ? 'bg-gray-100 border-b-2 border-indigo-500' : ''
            }`}
            onClick={() => setActiveTab('whatsapp')}
          >
            WhatsApp
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'shop' && (
            <form onSubmit={handleShopUpdate} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Shop Name
                  </label>
                  <Input
                    type="text"
                    value={shopDetails.shopName}
                    onChange={(e) => setShopDetails({
                      ...shopDetails,
                      shopName: e.target.value
                    })}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <Input
                    type="email"
                    value={shopDetails.email}
                    onChange={(e) => setShopDetails({
                      ...shopDetails,
                      email: e.target.value
                    })}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <Input
                    type="tel"
                    value={shopDetails.phone}
                    onChange={(e) => setShopDetails({
                      ...shopDetails,
                      phone: e.target.value
                    })}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Flat No
                  </label>
                  <Input
                    type="text"
                    value={shopDetails.flatNo}
                    onChange={(e) => setShopDetails({
                      ...shopDetails,
                      flatNo: e.target.value
                    })}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Street
                  </label>
                  <Input
                    type="text"
                    value={shopDetails.street}
                    onChange={(e) => setShopDetails({
                      ...shopDetails,
                      street: e.target.value
                    })}
                    required
                  />
                </div>

                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    District
                  </label>
                  <Input
                    type="text"
                    value={shopDetails.district}
                    onChange={(e) => setShopDetails({
                      ...shopDetails,
                      district: e.target.value
                    })}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    State
                  </label>
                  <Input
                    type="text"
                    value={shopDetails.state}
                    onChange={(e) => setShopDetails({
                      ...shopDetails,
                      state: e.target.value
                    })}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Country
                  </label>
                  <Input
                    type="text"
                    value={shopDetails.country}
                    onChange={(e) => setShopDetails({
                      ...shopDetails,
                      country: e.target.value
                    })}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Pincode
                  </label>
                  <Input
                    type="text"
                    value={shopDetails.pincode}
                    onChange={(e) => setShopDetails({
                      ...shopDetails,
                      pincode: e.target.value
                    })}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mobile Number
                  </label>
                  <Input
                    type="tel"
                    value={shopDetails.mobileNumber}
                    onChange={(e) => setShopDetails({
                      ...shopDetails,
                      mobileNumber: e.target.value
                    })}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Landline Number (Optional)
                  </label>
                  <Input
                    type="tel"
                    value={shopDetails.landlineNumber || ''}
                    onChange={(e) => setShopDetails({
                      ...shopDetails,
                      landlineNumber: e.target.value
                    })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Website Address (Optional)
                  </label>
                  <Input
                    type="url"
                    value={shopDetails.websiteAddress || ''}
                    onChange={(e) => setShopDetails({
                      ...shopDetails,
                      websiteAddress: e.target.value
                    })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    GST Number (Optional)
                  </label>
                  <Input
                    type="text"
                    value={shopDetails.gstNumber || ''}
                    onChange={(e) => setShopDetails({
                      ...shopDetails,
                      gstNumber: e.target.value
                    })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Company Size
                  </label>
                  <Select
                    value={shopDetails.companySize}
                    onChange={(e) => setShopDetails({
                      ...shopDetails,
                      companySize: e.target.value
                    })}
                    required
                  >
                    <option value="">Select Company Size</option>
                    <option value="1-10">1-10 employees</option>
                    <option value="11-50">11-50 employees</option>
                    <option value="51-200">51-200 employees</option>
                    <option value="201-500">201-500 employees</option>
                    <option value="500+">500+ employees</option>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end">
                <Button type="submit" isLoading={isLoading}>
                  Update Shop Information
                </Button>
              </div>
            </form>
          )}

          {activeTab === 'password' && (
            <div className="space-y-6">
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Current Password
                  </label>
                  <Input
                    type="password"
                    value={passwordData.oldPassword}
                    onChange={(e) => setPasswordData({
                      ...passwordData,
                      oldPassword: e.target.value
                    })}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    New Password
                  </label>
                  <Input
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({
                      ...passwordData,
                      newPassword: e.target.value
                    })}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Confirm New Password
                  </label>
                  <Input
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({
                      ...passwordData,
                      confirmPassword: e.target.value
                    })}
                    required
                  />
                </div>

                <div className="flex justify-end">
                  <Button type="submit" isLoading={isLoading}>
                    Update Password
                  </Button>
                </div>
              </form>

              <div className="pt-6 border-t">
                <h3 className="text-lg font-medium mb-4">Forgot Password?</h3>
                <ForgotPasswordForm />
              </div>
            </div>
          )}

{activeTab === 'whatsapp' && (
            <form onSubmit={handleWhatsAppUpdate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  WhatsApp Number
                </label>
                <Input
                  type="tel"
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  placeholder="Enter WhatsApp number"
                  pattern="[0-9]{10}"
                  title="Please enter a valid 10-digit number"
                  required
                />
              </div>
              <Button type="submit" isLoading={isLoading}>
                Update WhatsApp Number
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}