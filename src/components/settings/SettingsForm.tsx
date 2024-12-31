// app/settings/SettingsForm.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { toast } from 'react-toastify';
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';
import React from 'react';  // Add this import
import { ShippingSettings } from './ShippingSettings';

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
  const [activeTab, setActiveTab] = useState<'shop' | 'password' | 'whatsapp' | 'integrations' | 'shipping'>('shop');
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

  const handleConnect = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/razorpay', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to initiate Razorpay connection');
      }

      const { authUrl } = await response.json();
      window.location.href = authUrl;
    } catch (error) {
      console.error('Failed to initiate Razorpay connection:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRazorpayDisconnect = async () => {
    try {
      const response = await fetch('/api/razorpay/disconnect', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to disconnect Razorpay');
      }

      toast.success('Razorpay disconnected successfully');
      router.refresh();
    } catch (error) {
      toast.error('Failed to disconnect Razorpay');
      console.error(error);
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
    <div className="min-h-screen bg-gray-100 p-1 md:p-8">
    <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row border-b">
        {/* Tabs */}
        <div className="flex overflow-x-auto">
          {[
            { name: 'Shop Information', key: 'shop' },
            { name: 'Password', key: 'password' },
            { name: 'Shipping', key: 'shipping' },
            { name: 'WhatsApp', key: 'whatsapp' },
            { name: 'Integrations', key: 'integrations' },
          ].map((tab) => (
            <button
              key={tab.key}
              className={`flex-shrink-0 px-4 py-2 font-medium ${
                activeTab === tab.key
                  ? 'bg-gray-100 border-b-2 border-indigo-500'
                  : 'hover:bg-gray-50'
              }`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.name}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'shop' && (
          <form onSubmit={handleShopUpdate} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Shop Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Shop Name
                </label>
                <Input
                  type="text"
                  value={shopDetails.shopName}
                  onChange={(e) =>
                    setShopDetails({
                      ...shopDetails,
                      shopName: e.target.value,
                    })
                  }
                  required
                  className="w-full"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <Input
                  type="email"
                  value={shopDetails.email}
                  onChange={(e) =>
                    setShopDetails({
                      ...shopDetails,
                      email: e.target.value,
                    })
                  }
                  required
                  className="w-full"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <Input
                  type="tel"
                  value={shopDetails.phone}
                  onChange={(e) =>
                    setShopDetails({
                      ...shopDetails,
                      phone: e.target.value,
                    })
                  }
                  required
                  className="w-full"
                />
              </div>

              {/* Flat No */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Flat No
                </label>
                <Input
                  type="text"
                  value={shopDetails.flatNo}
                  onChange={(e) =>
                    setShopDetails({
                      ...shopDetails,
                      flatNo: e.target.value,
                    })
                  }
                  required
                  className="w-full"
                />
              </div>

              {/* Street */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Street
                </label>
                <Input
                  type="text"
                  value={shopDetails.street}
                  onChange={(e) =>
                    setShopDetails({
                      ...shopDetails,
                      street: e.target.value,
                    })
                  }
                  required
                  className="w-full"
                />
              </div>

              {/* District */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  District
                </label>
                <Input
                  type="text"
                  value={shopDetails.district}
                  onChange={(e) =>
                    setShopDetails({
                      ...shopDetails,
                      district: e.target.value,
                    })
                  }
                  required
                  className="w-full"
                />
              </div>

              {/* State */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  State
                </label>
                <Input
                  type="text"
                  value={shopDetails.state}
                  onChange={(e) =>
                    setShopDetails({
                      ...shopDetails,
                      state: e.target.value,
                    })
                  }
                  required
                  className="w-full"
                />
              </div>

              {/* Country */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Country
                </label>
                <Input
                  type="text"
                  value={shopDetails.country}
                  onChange={(e) =>
                    setShopDetails({
                      ...shopDetails,
                      country: e.target.value,
                    })
                  }
                  required
                  className="w-full"
                />
              </div>

              {/* Pincode */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pincode
                </label>
                <Input
                  type="text"
                  value={shopDetails.pincode}
                  onChange={(e) =>
                    setShopDetails({
                      ...shopDetails,
                      pincode: e.target.value,
                    })
                  }
                  required
                  className="w-full"
                />
              </div>

              {/* Mobile Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mobile Number
                </label>
                <Input
                  type="tel"
                  value={shopDetails.mobileNumber}
                  onChange={(e) =>
                    setShopDetails({
                      ...shopDetails,
                      mobileNumber: e.target.value,
                    })
                  }
                  required
                  className="w-full"
                />
              </div>

              {/* Landline Number (Optional) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Landline Number (Optional)
                </label>
                <Input
                  type="tel"
                  value={shopDetails.landlineNumber || ''}
                  onChange={(e) =>
                    setShopDetails({
                      ...shopDetails,
                      landlineNumber: e.target.value,
                    })
                  }
                  className="w-full"
                />
              </div>

              {/* Website Address (Optional) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Website Address (Optional)
                </label>
                <Input
                  type="url"
                  value={shopDetails.websiteAddress || ''}
                  onChange={(e) =>
                    setShopDetails({
                      ...shopDetails,
                      websiteAddress: e.target.value,
                    })
                  }
                  className="w-full"
                />
              </div>

              {/* GST Number (Optional) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  GST Number (Optional)
                </label>
                <Input
                  type="text"
                  value={shopDetails.gstNumber || ''}
                  onChange={(e) =>
                    setShopDetails({
                      ...shopDetails,
                      gstNumber: e.target.value,
                    })
                  }
                  className="w-full"
                />
              </div>

              {/* Company Size */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company Size
                </label>
                <Select
                  value={shopDetails.companySize}
                  onChange={(e) =>
                    setShopDetails({
                      ...shopDetails,
                      companySize: e.target.value,
                    })
                  }
                  required
                  className="w-full"
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

            {/* Submit Button */}
            <div className="flex justify-end">
              <Button type="submit" isLoading={isLoading}>
                Update Shop Information
              </Button>
            </div>
          </form>
        )}

        {activeTab === 'password' && (
          <div className="space-y-6">
            {/* Password Change Form */}
            <form onSubmit={handlePasswordChange} className="space-y-4">
              {/* Current Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Current Password
                </label>
                <Input
                  type="password"
                  value={passwordData.oldPassword}
                  onChange={(e) =>
                    setPasswordData({
                      ...passwordData,
                      oldPassword: e.target.value,
                    })
                  }
                  required
                  className="w-full"
                />
              </div>

              {/* New Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Password
                </label>
                <Input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) =>
                    setPasswordData({
                      ...passwordData,
                      newPassword: e.target.value,
                    })
                  }
                  required
                  className="w-full"
                />
              </div>

              {/* Confirm New Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm New Password
                </label>
                <Input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) =>
                    setPasswordData({
                      ...passwordData,
                      confirmPassword: e.target.value,
                    })
                  }
                  required
                  className="w-full"
                />
              </div>

              {/* Submit Button */}
              <div className="flex justify-end">
                <Button type="submit" isLoading={isLoading}>
                  Update Password
                </Button>
              </div>
            </form>

            {/* Forgot Password Section */}
            <div className="pt-6 border-t">
              <h3 className="text-lg font-medium mb-4">Forgot Password?</h3>
              <ForgotPasswordForm />
            </div>
          </div>
        )}

        {activeTab === 'shipping' && <ShippingSettings />}

        {activeTab === 'whatsapp' && (
          <form onSubmit={handleWhatsAppUpdate} className="space-y-4">
            {/* WhatsApp Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
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
                className="w-full"
              />
            </div>

            {/* Submit Button */}
            <Button type="submit" isLoading={isLoading}>
              Update WhatsApp Number
            </Button>
          </form>
        )}

        {activeTab === 'integrations' && (
          <div className="space-y-6">
            {/* Razorpay Integration */}
            <div className="bg-white p-6 rounded-lg border">
              <div className="flex flex-col sm:flex-row items-center justify-between">
                <div className="flex items-center space-x-4 mb-4 sm:mb-0">
                  {/* Uncomment and use Image component if needed */}
                  {/* <Image
                    src="/razorpay-logo.png"
                    alt="Razorpay"
                    width={32}
                    height={32}
                    className="object-contain"
                  /> */}
                  <div>
                    <h3 className="text-lg font-medium">Razorpay</h3>
                    <p className="text-sm text-gray-600">Accept online payments</p>
                  </div>
                </div>

                {initialData.razorpayAccessToken ? (
                  <div className="flex items-center space-x-4">
                    <span className="flex items-center text-green-600">
                      <svg
                        className="w-5 h-5 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      Connected
                    </span>
                    <button
                      onClick={handleRazorpayDisconnect}
                      className="text-sm text-red-600 hover:text-red-800"
                    >
                      Disconnect
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleConnect}
                    disabled={isLoading}
                    className="flex items-center px-4 py-2 border border-[#02042B] rounded-md hover:bg-gray-50 transition-all duration-200 w-full sm:w-auto"
                  >
                    {isLoading ? (
                      <span>Connecting...</span>
                    ) : (
                      <>
                        <span>Connect</span>
                        <svg
                          className="w-4 h-4 ml-2"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  </div>
);
  
}