'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { FaSpinner, FaCheckCircle, FaExclamationCircle, FaMobile, FaMobileAlt } from 'react-icons/fa';
import Swal from 'sweetalert2';
import React from 'react';

interface MandateFormData {
  payerVa: string;
}

export function MandateForm() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMobilePrompt, setShowMobilePrompt] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<MandateFormData>();

  // Reset success and mobile prompt states after 2 minutes
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (showMobilePrompt) {
      timer = setTimeout(() => {
        setShowMobilePrompt(false);
        setSuccess(false);
        reset();
      }, 120000); // 2 minutes
    }
    return () => clearTimeout(timer);
  }, [showMobilePrompt, reset]);

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
      setShowMobilePrompt(true);
      
      Swal.fire({
        icon: 'success',
        title: 'Mandate Created!',
        html: `
          <div class="space-y-4">
            <p>Please follow these steps:</p>
            <ol class="text-left pl-4">
              <li>1. Check your UPI app notifications</li>
              <li>2. Open the mandate approval request</li>
              <li>3. Review the mandate details</li>
              <li>4. Approve the mandate using your UPI PIN</li>
            </ol>
          </div>
        `,
        showConfirmButton: true,
        confirmButtonText: 'I understand',
        showCancelButton: true,
        cancelButtonText: 'Cancel mandate',
        timer: 90000,
        timerProgressBar: true
      }).then((result) => {
        if (result.isDismissed && result.dismiss === Swal.DismissReason.cancel) {
          setSuccess(false);
          setShowMobilePrompt(false);
          reset();
        }
      });
    } catch (error: any) {
      setError(error.message || 'Failed to create mandate. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-8 p-4 bg-white rounded-lg shadow-xl border border-gray-100">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Create UPI Mandate</h2>

      {showMobilePrompt && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <div className="flex items-center mb-2">
            <FaMobileAlt className="text-blue-500 mr-2" />
            <h3 className="font-semibold text-blue-700">Pending Approval</h3>
          </div>
          <p className="text-sm text-blue-600">
            Please check your UPI app to approve the mandate request. This will expire in 2 minutes if not approved.
          </p>
        </div>
      )}

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
            className={`w-full px-4 py-2 rounded-lg border ${
              errors.payerVa ? 'border-red-500' : 'border-gray-300'
            } focus:outline-none focus:ring-2 ${
              errors.payerVa ? 'focus:ring-red-500' : 'focus:ring-indigo-500'
            } focus:border-transparent transition-all`}
            placeholder="example@upi"
            disabled={showMobilePrompt}
          />
          {errors.payerVa && (
            <p className="mt-2 text-sm text-red-600 flex items-center">
              <FaExclamationCircle className="mr-1" /> {errors.payerVa.message}
            </p>
          )}
        </div>

        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-semibold text-gray-700 mb-2">Mandate Details</h4>
          <div className="space-y-2 text-sm text-gray-600">
            <p><span className="font-medium">Amount:</span> ₹499/month</p>
            <p><span className="font-medium">Validity:</span> 1 year</p>
            <p><span className="font-medium">First Debit:</span> Immediate</p>
            {/* <p><span className="font-medium">Subsequent Debits:</span> 5th of every month</p> */}
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || showMobilePrompt}
          className={`w-full flex justify-center items-center py-3 px-4 rounded-lg text-white font-semibold ${
            showMobilePrompt
              ? 'bg-green-500 cursor-not-allowed'
              : loading
              ? 'bg-indigo-400 cursor-not-allowed'
              : 'bg-indigo-600 hover:bg-indigo-700'
          } focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all`}
        >
          {loading ? (
            <>
              <FaSpinner className="animate-spin mr-2" /> Creating...
            </>
          ) : showMobilePrompt ? (
            <>
              <FaCheckCircle className="mr-2" /> Waiting for Approval
            </>
          ) : (
            'Create Mandate'
          )}
        </button>

        {error && (
          <div className="mt-4 p-3 bg-red-50 rounded-lg text-red-600 text-sm flex items-center">
            <FaExclamationCircle className="mr-2" /> {error}
          </div>
        )}
      </form>
    </div>
  );
}