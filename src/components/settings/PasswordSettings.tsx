'use client';

import { useState, ChangeEvent, FormEvent } from 'react';
import { toast } from 'react-toastify';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';
import React from 'react';

// Main component for the Password tab content
export function PasswordSettings({ onSuccess }: { onSuccess: () => void }) {
  const [isLoading, setIsLoading] = useState(false);
  const [passwords, setPasswords] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswords(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (passwords.newPassword !== passwords.confirmPassword) {
      toast.error("New passwords do not match.");
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch('/api/settings/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          oldPassword: passwords.oldPassword,
          newPassword: passwords.newPassword,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update password');
      }
      toast.success('Password updated successfully');
      setPasswords({ oldPassword: '', newPassword: '', confirmPassword: '' });
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Password update failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    // Main container with vertical spacing for the sections
    <div className="space-y-12">

      {/* --- Section 1: Change Password --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Side: Title and Description */}
        <div className="md:col-span-1">
          <h2 className="text-lg font-semibold text-gray-800">Change Password</h2>
          <p className="mt-1 text-sm text-gray-500">
            Update your password here. For your security, please choose a strong password.
          </p>
        </div>

        {/* Right Side: Form Fields */}
        <div className="md:col-span-2">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700">Current Password</label>
              <Input
                type="password" name="oldPassword" value={passwords.oldPassword}
                onChange={handleInputChange} required autoComplete="current-password"
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-700">New Password</label>
                <Input
                  type="password" name="newPassword" value={passwords.newPassword}
                  onChange={handleInputChange} required autoComplete="new-password"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Confirm New Password</label>
                <Input
                  type="password" name="confirmPassword" value={passwords.confirmPassword}
                  onChange={handleInputChange} required autoComplete="new-password"
                  className="mt-1"
                />
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Updating...' : 'Update Password'}
              </Button>
            </div>
          </form>
        </div>
      </div>
      
      {/* Divider */}
      <hr className="border-gray-200" />

      {/* --- Section 2: Forgot Password --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Side: Title and Description */}
        <div className="md:col-span-1">
          <h2 className="text-lg font-semibold text-gray-800">Forgot Password?</h2>
          <p className="mt-1 text-sm text-gray-500">
            Request a password reset link to be sent to your registered email and phone.
          </p>
        </div>

        {/* Right Side: Form Component */}
        <div className="md:col-span-2">
          {/* Assuming ForgotPasswordForm is styled similarly */}
          <ForgotPasswordForm />
        </div>
      </div>

    </div>
  );
}