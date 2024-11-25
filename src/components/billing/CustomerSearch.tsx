// components/billing/CustomerForm.tsx

'use client';

import { useState, useEffect } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import { Input } from '@/components/ui/Input';
import type { CustomerDetails } from '@/types/billing';
import React from 'react';  // Add this import

interface CustomerFormProps {
  onCustomerChange: (customer: CustomerDetails | null) => void;
}

export function CustomerForm({ onCustomerChange }: CustomerFormProps) {
  const [phone, setPhone] = useState('');
  const [customerDetails, setCustomerDetails] = useState<CustomerDetails | null>(null);
  const [isExistingCustomer, setIsExistingCustomer] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debouncedPhone = useDebounce(phone, 500);

  useEffect(() => {
    const fetchCustomer = async () => {
      // Only search if phone number is exactly 10 digits
      if (debouncedPhone.length !== 10) {
        setCustomerDetails(null);
        setIsExistingCustomer(false);
        onCustomerChange(null);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/customers?q=${debouncedPhone}`);
        const data = await response.json();

        if (!response.ok) {
          if (response.status === 404) {
            // No customer found, prepare form for new customer entry
            setCustomerDetails({
              name: '',
              phone: debouncedPhone,
              email: '',
              flatNo: '',
              street: '',
              district: '',
              state: '',
              pincode: '',
            });
            setIsExistingCustomer(false);
            onCustomerChange(null);
          } else {
            throw new Error(data.message || 'Failed to fetch customer');
          }
        } else {
          // Assuming phone numbers are unique, find exact match
          const exactMatch = data.find((cust: CustomerDetails) => cust.phone === debouncedPhone);

          if (exactMatch) {
            setCustomerDetails(exactMatch);
            setIsExistingCustomer(true);
            onCustomerChange(exactMatch);
          } else {
            // No exact match found
            setCustomerDetails({
              name: '',
              phone: debouncedPhone,
              email: '',
              flatNo: '',
              street: '',
              district: '',
              state: '',
              pincode: '',
            });
            setIsExistingCustomer(false);
            onCustomerChange(null);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch customer');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCustomer();
  }, [debouncedPhone, onCustomerChange]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(e.target.value);
    // Reset customer details when phone number changes
    setCustomerDetails(null);
    setIsExistingCustomer(false);
    onCustomerChange(null);
  };

  const handleFieldChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCustomerDetails(prev => (prev ? { ...prev, [name]: value } : null));
    if (customerDetails) {
      onCustomerChange({ ...customerDetails, [name]: value });
    }
  };

  return (
    <div className="space-y-6">
      {/* Phone Number Entry */}
      <div className="flex items-center gap-4">
        <Input
          label="Phone Number"
          type="tel"
          placeholder="e.g., 1234567890"
          value={phone}
          onChange={handleInputChange}
          pattern="[0-9]{10}"
          required
          maxLength={10}
        />
        {isLoading && <div className="text-sm text-gray-500">Searching...</div>}
      </div>

      {/* Error Message */}
      {error && (
        <div className="text-red-500 text-sm">
          {error}
        </div>
      )}

      {/* Customer Details Form */}
      <div className="space-y-6">
        {/* Contact Information */}
        <div>
          <h3 className="text-md font-semibold mb-2">Contact Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Name"
              name="name"
              placeholder="e.g., John Doe"
              value={customerDetails?.name || ''}
              onChange={handleFieldChange}
              required={!isExistingCustomer}
              disabled={isExistingCustomer}
            />
            <Input
              label="Email"
              name="email"
              type="email"
              placeholder="e.g., john@example.com"
              value={customerDetails?.email || ''}
              onChange={handleFieldChange}
              disabled={isExistingCustomer}
            />
          </div>
        </div>

        {/* Address Details */}
        <div>
          <h3 className="text-md font-semibold mb-2">Address Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Flat/House No"
              name="flatNo"
              placeholder="e.g., 12B"
              value={customerDetails?.flatNo || ''}
              onChange={handleFieldChange}
              disabled={isExistingCustomer}
            />
            <Input
              label="Street"
              name="street"
              placeholder="e.g., Baker Street"
              value={customerDetails?.street || ''}
              onChange={handleFieldChange}
              disabled={isExistingCustomer}
            />
            <Input
              label="District"
              name="district"
              placeholder="e.g., Central"
              value={customerDetails?.district || ''}
              onChange={handleFieldChange}
              disabled={isExistingCustomer}
            />
            <Input
              label="State"
              name="state"
              placeholder="e.g., California"
              value={customerDetails?.state || ''}
              onChange={handleFieldChange}
              disabled={isExistingCustomer}
            />
            <Input
              label="Pincode"
              name="pincode"
              type="text"
              pattern="[0-9]{6}"
              placeholder="e.g., 90001"
              value={customerDetails?.pincode || ''}
              onChange={handleFieldChange}
              disabled={isExistingCustomer}
            />
          </div>
        </div>
      </div>

      {/* Informational Message */}
      {/* {isExistingCustomer && customerDetails && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded">
          <h3 className="text-md font-medium text-green-700">Existing Customer Found</h3>
          <p><strong>Name:</strong> {customerDetails.name}</p>
          <p><strong>Email:</strong> {customerDetails.email || 'N/A'}</p>
          <p><strong>Address:</strong> {`${customerDetails.flatNo || ''} ${customerDetails.street || ''}, ${customerDetails.district || ''}, ${customerDetails.state || ''} - ${customerDetails.pincode || ''}`}</p>
        </div>
      )} */}
    </div>
  );
}
