// components/RazorpayConnect.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import React from 'react';  // Add this import

export default function RazorpayConnect() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

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

  return (
    <button
      onClick={handleConnect}
      disabled={isLoading}
      className="w-full mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors disabled:bg-indigo-400"
    >
      {isLoading ? 'Connecting...' : 'Connect Razorpay'}
    </button>
  );
}