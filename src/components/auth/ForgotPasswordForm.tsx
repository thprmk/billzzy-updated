'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from 'react-toastify';
import React from 'react';

export function ForgotPasswordForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    phone: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Something went wrong');
      }
      toast.success('A password reset link has been sent to your email.');
      setFormData({ email: '', phone: '' });
    } catch (error) {
      const err = error as Error;
      toast.error(err.message || 'Failed to process request');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Email Address
        </label>
        <Input
          type="email"
          value={formData.email}
          onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
          required
          placeholder="Enter your email"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Phone Number
        </label>
        <Input
          type="tel"
          value={formData.phone}
          onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
          required
          placeholder="Enter your phone number"
          pattern="[0-9]{10}"
          title="Please enter a valid 10-digit phone number"
        />
      </div>

      {/* --- THIS IS THE ONLY PART THAT HAS CHANGED --- */}
      <div className="flex justify-end pt-2">
        <Button
          type="submit"
          disabled={isLoading}
        >
          {isLoading ? 'Processing...' : 'Recover Password'}
        </Button>
      </div>
      
    </form>
  );
}