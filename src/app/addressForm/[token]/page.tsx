'use client';

import React, { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { toast } from 'react-toastify';
// import Image from 'next/image';
// import img from "../../../../public/images/company.png";
export default function AddressFormPage() {
  const router = useRouter();
  const params = useParams();
  const token = params.token;

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    flatNo: '',
    street: '',
    district: '',
    state: '',
    pincode: '',
    notes: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidToken, setIsValidToken] = useState(true);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/billing/customer_submission', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, ...formData }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit data');
      }

      toast.success('Your information has been submitted successfully!');
      router.push('/thankYou');
    } catch (error) {
      console.error(error);
      toast.error('Failed to submit data');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isValidToken) {
    return <div>Invalid or expired link.</div>;
  }

  return (
    <div className="min-h-[100dvh] place-content-center bg-gray-50 relative">
      {/* Main container with max width and centered content */}
      <div className="h-full w-full max-w-4xl place-content-center mx-auto px-4 sm:px-6 lg:px-8 flex flex-col justify-center">
        
        {/* Form card */}
        <div className="w-full my-8 md:my-0 place-content-center">
          <div className="bg-white rounded-lg shadow-sm place-content-center border border-gray-100 p-4 md:p-8">
            <h1 className="text-xl md:text-2xl font-semibold text-gray-900 mb-6 text-center">
              Delivery Information
            </h1>
            
            <div className="space-y-4 md:space-y-6">
              {/* Name and Phone section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Input
                    label="Name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    placeholder="Enter your full name"
                  />
                </div>
                <Input
                  label="Phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                  placeholder="Enter your phone number"
                />
                <Input
                  label="Pincode"
                  name="pincode"
                  value={formData.pincode}
                  onChange={handleChange}
                  required
                  placeholder="Enter pincode"
                />
              </div>

              {/* Address section */}
              <div className="space-y-4">
                <Input
                  label="Flat/House No"
                  name="flatNo"
                  value={formData.flatNo}
                  onChange={handleChange}
                  placeholder="Enter flat/house number"
                />
                <Input
                  label="Street"
                  name="street"
                  value={formData.street}
                  onChange={handleChange}
                  placeholder="Enter street name"
                />
              </div>

              {/* District and State */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="District"
                  name="district"
                  value={formData.district}
                  onChange={handleChange}
                  placeholder="Enter district"
                />
                <Input
                  label="State"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  placeholder="Enter state"
                />
              </div>

              {/* Notes section */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Notes
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm 
                           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                           resize-none"
                  rows={3}
                  placeholder="Any special delivery instructions..."
                />
              </div>

              {/* Submit button */}
              <Button
                onClick={handleSubmit}
                isLoading={isSubmitting}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-md 
                         font-medium transition-colors duration-200"
              >
                {isSubmitting ? 'Submitting...' : 'Confirm Address'}
              </Button>
            </div>
          </div>
        </div>

        {/* Watermark */}
        {/* <div className="relative bottom-4 right-0 md:bottom-0 md:right-0">
          <div className="flex items-center space-x-2 place-content-end ">
            <span className="text-xs translate-x-8 md:text-sm text-gray-500">Powered by</span>
            <Image
              src={img}
              alt="Company Logo"
              width={100}
              height={20}
              className="object-contain"
            />
          </div>
        </div> */}
      </div>
    </div>
  );
}