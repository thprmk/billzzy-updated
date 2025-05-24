'use client';

import { useState } from 'react';
import React from 'react';
import { Input } from '../ui/Input';
import { toast } from 'react-toastify';

interface BillingAddressFormProps {
  initialData?: {
    name?: string;
    phone?: string;
    email?: string;
    flatNo?: string;
    street?: string;
    district?: string;
    state?: string;
    pincode?: string;
  };
  onChange: (data: BillingAddressData) => void;
}

export interface BillingAddressData {
  name: string;
  phone: string;
  email?: string; // Optional
  flatNo: string;
  street: string;
  district: string;
  state: string;
  pincode: string;
}

export function BillingAddressForm({ initialData, onChange }: BillingAddressFormProps) {
  const [formData, setFormData] = useState<BillingAddressData>({
    name: initialData?.name || '',
    phone: initialData?.phone || '',
    email: initialData?.email || '',
    flatNo: initialData?.flatNo || '',
    street: initialData?.street || '',
    district: initialData?.district || '',
    state: initialData?.state || '',
    pincode: initialData?.pincode || '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const updated = { ...formData, [name]: value };
    setFormData(updated);
    onChange(updated); // Simple onChange without special email handling
  };

  return (
    <div className="space-y-6">      
      <form className="space-y-6">
        {/* First Row: Phone Number and Customer Name */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number *
            </label>
            <Input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="Enter 10 digit number"
              pattern="[0-9]{10}"
              title="Please enter a valid 10-digit phone number"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Customer Name *
            </label>
            <Input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter customer name"
              required
            />
          </div>
        </div>

        {/* Second Row: Flat/House No and Street */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Flat/House No
            </label>
            <Input
              type="text"
              name="flatNo"
              value={formData.flatNo}
              onChange={handleChange}
              placeholder="Enter flat/house number"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Street
            </label>
            <Input
              type="text"
              name="street"
              value={formData.street}
              onChange={handleChange}
              placeholder="Enter street name"
            />
          </div>
        </div>

        {/* Third Row: Pincode, District, State */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Pincode
            </label>
            <Input
              type="text"
              name="pincode"
              value={formData.pincode}
              onChange={handleChange}
              placeholder="Enter 6 digit pincode"
              pattern="[0-9]{6}"
              title="Please enter a valid 6-digit pincode"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              District
            </label>
            <Input
              type="text"
              name="district"
              value={formData.district}
              onChange={handleChange}
              placeholder="Enter district"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              State
            </label>
            <Input
              type="text"
              name="state"
              value={formData.state}
              onChange={handleChange}
              placeholder="Enter state"
            />
          </div>
        </div>

        {/* Fourth Row: Email (full width) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email (Optional)
          </label>
          <Input
            type="email"
            name="email"
            value={formData.email || ''} // Handle undefined case
            onChange={handleChange}
            placeholder="Enter email address"
          />
        </div>
      </form>
    </div>
  );
}