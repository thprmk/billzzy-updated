// File: src/components/settings/WhatsappSettings.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useSession } from 'next-auth/react';
import { z } from 'zod';

const whatsappSchema = z.object({
  whatsappNumber: z.string().regex(/^\+?\d{10,15}$/, 'Invalid WhatsApp number format'),
  goWhatsApiToken: z.string().min(1, 'GoWhats API Token is required'),
  phoneNumberId: z.string().min(1, 'Phone Number ID is required'),
  businessAccountId: z.string().min(1, 'Business Account ID is required'),
});

interface WhatsAppSettingsProps {
  id?: string | number | null;
  initialNumber?: string;
  initialAccessToken?: string;
  initialPhoneId?: string;
  initialBusinessId?: string;
  onSuccessAction: () => void;
}

export function WhatsAppSettings({
  id: propId,
  initialNumber = '',
  initialAccessToken = '',
  initialPhoneId = '',
  initialBusinessId = '',
  onSuccessAction,
}: WhatsAppSettingsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState(initialNumber);
  const [goWhatsApiToken, setGoWhatsApiToken] = useState(initialAccessToken);
  const [phoneNumberId, setPhoneNumberId] = useState(initialPhoneId);
  const [businessAccountId, setBusinessAccountId] = useState(initialBusinessId);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [hasExistingData, setHasExistingData] = useState(false);

  const { data: session, status } = useSession();

  useEffect(() => {
    if (propId != null) {
      setOrgId(String(propId));
    } else if (session?.user?.id) {
      setOrgId(String(session.user.id));
    }
  }, [session?.user?.id, propId]);

  // Fetch existing settings when component mounts
  useEffect(() => {
    if (status === 'authenticated' && session?.user?.id) {
      fetchExistingSettings();
    }
  }, [status, session?.user?.id]);

  const fetchExistingSettings = async () => {
    try {
      setIsFetching(true);
      console.log('Fetching existing WhatsApp settings...');
      
      const response = await fetch('/api/settings/whatsapp', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      console.log('Fetch response status:', response.status);

      if (!response.ok) {
        // Don't show error for 404 or when no settings exist
        if (response.status !== 404) {
          console.error('Failed to fetch settings:', response.status);
        }
        return;
      }

      const result = await response.json();
      console.log('Fetch result:', result);

      if (result.success && result.data) {
        const data = result.data;
        setWhatsappNumber(data.whatsappNumber || '');
        setGoWhatsApiToken(data.goWhatsApiToken || '');
        setPhoneNumberId(data.phoneNumberId || '');
        setBusinessAccountId(data.businessAccountId || '');
        setHasExistingData(true);
        console.log('Existing settings loaded successfully');
      }
    } catch (error) {
      console.error('Error fetching existing settings:', error);
      // Don't show error toast for fetch failures as they're not critical
    } finally {
      setIsFetching(false);
    }
  };

  const createPayload = () => ({
    whatsappNumber: whatsappNumber.trim(),
    goWhatsApiToken: goWhatsApiToken.trim(),
    phoneNumberId: phoneNumberId.trim(),
    businessAccountId: businessAccountId.trim(),
    whatsappEnabled: true,
  });

  const validateForm = () => {
    const payload = createPayload();
    const validation = whatsappSchema.safeParse(payload);
    
    if (!validation.success) {
      const firstError = validation.error.issues[0];
      toast.error(firstError.message);
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitAttempted(true);

    // Early validation checks
    if (!session || status !== 'authenticated') {
      toast.error('Please ensure you are logged in and try again.');
      return;
    }

    if (!orgId) {
      toast.error('Organization ID missing. Please refresh the page or re-login.');
      return;
    }

    if (!validateForm()) {
      return;
    }

    const payload = createPayload();
    setIsLoading(true);

    try {
      console.log('Submitting WhatsApp settings...');
      
      const response = await fetch('/api/settings/whatsapp', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType?.includes('application/json')) {
        console.error('Non-JSON response received:', contentType);
        const textResponse = await response.text();
        console.error('Response text:', textResponse);
        
        throw new Error('Server returned unexpected response format. Please try again or contact support.');
      }

      let data;
      try {
        data = await response.json();
        console.log('Parsed response:', data);
      } catch (jsonError) {
        console.error('Failed to parse JSON response:', jsonError);
        throw new Error('Invalid response from server. Please try again.');
      }

      if (!response.ok) {
        // Handle different types of errors based on the API response structure
        if (response.status === 401) {
          throw new Error(data?.error || 'Your session has expired. Please log in again.');
        } else if (response.status === 400) {
          if (data?.missing?.length > 0) {
            throw new Error(`Missing required fields: ${data.missing.join(', ')}`);
          }
          throw new Error(data?.error || 'Invalid request data');
        } else if (response.status >= 500) {
          throw new Error(data?.error || 'Server error occurred. Please try again later.');
        } else {
          throw new Error(data?.error || data?.message || `Request failed with status ${response.status}`);
        }
      }

      // Handle successful response
      if (data.success) {
        console.log('Settings saved successfully:', data);
        toast.success(data.message || 'WhatsApp settings saved successfully');
        setHasExistingData(true);
        onSuccessAction?.();
      } else {
        // Handle case where response is 200 but success is false
        throw new Error(data.message || data.error || 'Unknown error occurred');
      }

    } catch (error: any) {
      console.error('Submit error:', error);
      
      // Enhanced error handling with specific messages
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        toast.error('Network error. Please check your internet connection and try again.');
      } else if (error.message.includes('JSON') || error.message.includes('parse')) {
        toast.error('Server communication error. Please try again or contact support.');
      } else if (error.message.includes('session') || error.message.includes('login')) {
        toast.error('Please log in again and try.');
        // Optionally trigger a re-login here
      } else {
        // Use the specific error message if it's user-friendly, otherwise use generic message
        const userMessage = error.message || 'An unexpected error occurred while saving settings';
        toast.error(userMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Loading state for session
  if (status === 'loading') {
    return (
      <div className="max-w-2xl mx-auto p-4 text-center py-6">
        <div className="inline-flex items-center">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent mr-2"></div>
          Loading session...
        </div>
      </div>
    );
  }

  // Unauthenticated state
  if (status === 'unauthenticated') {
    return (
      <div className="max-w-2xl mx-auto p-4 text-center py-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          Please log in to access WhatsApp settings
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h3 className="text-lg font-semibold text-blue-800 mb-2">GoWhats Integration Setup</h3>
        <p className="text-blue-700 text-sm">
          Configure your GoWhats API settings to enable WhatsApp notifications for order updates, packing confirmations, and tracking information.
        </p>
        
        {hasExistingData && (
          <div className="mt-2 text-green-700 text-sm flex items-center">
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            WhatsApp integration is configured
          </div>
        )}
      </div>

      {isFetching && (
        <div className="text-center py-4">
          <div className="inline-flex items-center text-gray-600">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-400 border-t-transparent mr-2"></div>
            Loading existing settings...
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <Input
            label="WhatsApp Business Number"
            placeholder="+919876543210"
            type="tel"
            value={whatsappNumber}
            onChange={(e) => setWhatsappNumber(e.target.value)}
            autoFocus
            required
            disabled={isFetching}
          />
          <div className="text-sm text-gray-600 mt-1">
            Your registered WhatsApp Business number with country code
          </div>
        </div>

        <div>
          <Input
            label="GoWhats API Token"
            placeholder="Enter your GoWhats API token"
            type="password"
            value={goWhatsApiToken}
            onChange={(e) => setGoWhatsApiToken(e.target.value)}
            required
            disabled={isFetching}
          />
          <div className="text-sm text-gray-600 mt-1">
            Get this from your GoWhats dashboard
          </div>
        </div>

        <div>
          <Input
            label="Phone Number ID"
            placeholder="Enter Phone Number ID"
            value={phoneNumberId}
            onChange={(e) => setPhoneNumberId(e.target.value)}
            required
            disabled={isFetching}
          />
          <div className="text-sm text-gray-600 mt-1">
            Your WhatsApp Business Phone Number ID
          </div>
        </div>

        <div>
          <Input
            label="Business Account ID"
            placeholder="Enter Business Account ID"
            value={businessAccountId}
            onChange={(e) => setBusinessAccountId(e.target.value)}
            required
            disabled={isFetching}
          />
          <div className="text-sm text-gray-600 mt-1">
            Your WhatsApp Business Account ID
          </div>
        </div>

        {/* Enhanced error states */}
        {submitAttempted && !orgId && status === 'authenticated' && (
          <div className="text-red-500 text-sm bg-red-50 border border-red-200 p-3 rounded">
            ⚠️ Organisation ID is missing. Please refresh the page or re-login.
          </div>
        )}

        {status === 'authenticated' && !session?.user?.id && (
          <div className="text-orange-500 text-sm bg-orange-50 border border-orange-200 p-3 rounded">
            ⚠️ Session data incomplete. Some features may not work properly.
          </div>
        )}

        <div className="flex gap-4">
          <Button
            type="submit"
            isLoading={isLoading}
            disabled={isLoading || isFetching || !orgId || status !== 'authenticated'}
            className="flex-1"
          >
            {isLoading ? 'Updating...' : hasExistingData ? 'Update WhatsApp Settings' : 'Save WhatsApp Settings'}
          </Button>
          
          {hasExistingData && (
            <Button
              type="button"
              variant="outline"
              onClick={fetchExistingSettings}
              disabled={isLoading || isFetching}
              className="px-4"
            >
              Refresh
            </Button>
          )}
        </div>

        {/* Debug info in development */}
        {/* {process.env.NODE_ENV === 'development' && (
          <div className="text-xs text-gray-500 mt-4 p-2 bg-gray-50 rounded">
            <strong>Debug Info:</strong><br/>
            Status: {status}<br/>
            Org ID: {orgId || 'Not set'}<br/>
            Session User ID: {session?.user?.id || 'Not available'}<br/>
            Has Existing Data: {hasExistingData ? 'Yes' : 'No'}<br/>
            Is Fetching: {isFetching ? 'Yes' : 'No'}
          </div>
        )} */}
      </form>
    </div>
  );
}