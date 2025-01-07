// components/MandateForm.tsx
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import React from 'react';  // Add this import

interface MandateFormData {
  payerVa: string;
}

export function MandateForm() {
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<MandateFormData>();

  const onSubmit = async (data: MandateFormData) => {
    try {
      setLoading(true);
      const responses = await fetch('https://ifconfig.me');
console.log(responses.data, 'responses');

      const response = await fetch('/api/mandate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error);
      }

      console.log('Mandate created:', result);
      

      alert('Mandate created successfully! Please approve it in your UPI app.');
    } catch (error) {
      console.error('Error creating mandate:', error);
      alert('Failed to create mandate. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-8">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label htmlFor="payerVa" className="block text-sm font-medium text-gray-700">
            UPI ID (VPA)
          </label>
          <input
            type="text"
            id="payerVa"
            {...register('payerVa', { 
              required: 'UPI ID is required',
              pattern: {
                value: /^[\w\.\-]+@[a-zA-Z]+/,
                message: 'Please enter a valid UPI ID'
              }
            })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
          {errors.payerVa && (
            <p className="mt-1 text-sm text-red-600">{errors.payerVa.message}</p>
          )}
        </div>

        <div className="bg-gray-50 p-4 rounded-md">
          <p className="text-sm text-gray-600">
            Amount: ₹499/month
            <br />
            Validity: 1 year
            <br />
            Debit Date: 5th of every month
          </p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {loading ? 'Creating...' : 'Create Mandate'}
        </button>
      </form>
    </div>
  );
}