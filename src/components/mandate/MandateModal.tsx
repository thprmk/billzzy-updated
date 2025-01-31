'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import Swal from 'sweetalert2';
import { FaSpinner, FaCheckCircle, FaExclamationCircle } from 'react-icons/fa';
import React from 'react';

interface MandateFormData {
  payerVa: string;
}

interface MandateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/** A reusable popup for entering the UPI ID and creating the mandate. */
export function MandateModal({ isOpen, onClose }: MandateModalProps) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<MandateFormData>();

  const onSubmit = async (data: MandateFormData) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/mandate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to create mandate');
      }

      setSuccess(true);
      Swal.fire({
        icon: 'success',
        title: 'Success!',
        text: 'Mandate created successfully! Please approve it in your UPI app.',
        showConfirmButton: true,
        timer: 5000,
        timerProgressBar: true,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to create mandate. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Don't render if isOpen is false
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white p-6 rounded-md shadow-md relative max-w-md w-full">
        <button
          className="absolute top-2 right-2 text-gray-600 hover:text-gray-800"
          onClick={onClose}
        >
          ✕
        </button>
        
        <h2 className="text-2xl font-bold mb-4">Upgrade to Pro</h2>
        <p className="text-sm text-gray-500 mb-4">
          Enter your UPI ID to create a subscription mandate.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <label htmlFor="payerVa" className="block text-sm font-medium text-gray-700 mb-2">
              UPI ID (VPA)
            </label>
            <input
              type="text"
              id="payerVa"
              {...register('payerVa', {
                required: 'UPI ID is required',
                pattern: {
                  value: /^[\w.\-]+@[a-zA-Z]+/,
                  message: 'Please enter a valid UPI ID (e.g., example@upi)',
                },
              })}
              disabled={loading || success}
              className={`w-full px-4 py-2 rounded-lg border ${
                errors.payerVa ? 'border-red-500' : 'border-gray-300'
              } focus:outline-none focus:ring-2 ${
                errors.payerVa ? 'focus:ring-red-500' : 'focus:ring-indigo-500'
              } transition-all`}
              placeholder="example@upi"
            />
            {errors.payerVa && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <FaExclamationCircle className="mr-1" /> {errors.payerVa.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || success}
            className={`w-full flex justify-center items-center py-3 px-4 rounded-lg text-white font-semibold ${
              success
                ? 'bg-green-500 cursor-not-allowed'
                : loading
                ? 'bg-indigo-400 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700'
            } transition-all`}
          >
            {loading ? (
              <>
                <FaSpinner className="animate-spin mr-2" /> Creating...
              </>
            ) : success ? (
              <>
                <FaCheckCircle className="mr-2" /> Mandate Created!
              </>
            ) : (
              'Create Mandate'
            )}
          </button>

          {error && (
            <div className="mt-2 p-3 bg-red-50 rounded text-red-600 text-sm flex items-center">
              <FaExclamationCircle className="mr-2" /> {error}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
