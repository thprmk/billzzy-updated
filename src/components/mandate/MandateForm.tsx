'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { FaSpinner, FaCheckCircle, FaExclamationCircle } from 'react-icons/fa';
import Swal from 'sweetalert2';
import React from 'react';  // Add this import

interface MandateFormData {
 payerVa: string;
}

export function MandateForm() {
 const [loading, setLoading] = useState(false);
 const [success, setSuccess] = useState(false);
 const [error, setError] = useState<string | null>(null);

 const {
   register,
   handleSubmit,
   formState: { errors },
 } = useForm<MandateFormData>();

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
       timerProgressBar: true
     });

   } catch (error: any) {
     setError(error.message || 'Failed to create mandate. Please try again.');
   } finally {
     setLoading(false);
   }
 };

 return (
   <div className="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow-xl border border-gray-100">
     <h2 className="text-2xl font-bold text-gray-800 mb-6">Create UPI Mandate</h2>

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
               value: /^[\w\.\-]+@[a-zA-Z]+/,
               message: 'Please enter a valid UPI ID (e.g., example@upi)',
             },
           })}
           className={`w-full px-4 py-2 rounded-lg border ${
             errors.payerVa ? 'border-red-500' : 'border-gray-300'
           } focus:outline-none focus:ring-2 ${
             errors.payerVa ? 'focus:ring-red-500' : 'focus:ring-indigo-500'
           } focus:border-transparent transition-all`}
           placeholder="example@upi"
         />
         {errors.payerVa && (
           <p className="mt-2 text-sm text-red-600 flex items-center">
             <FaExclamationCircle className="mr-1" /> {errors.payerVa.message}
           </p>
         )}
       </div>

       <div className="bg-gray-50 p-4 rounded-lg">
         <p className="text-sm text-gray-600">
           <span className="font-semibold">Amount:</span> ₹499/month
           <br />
           <span className="font-semibold">Validity:</span> 1 year
           <br />
           <span className="font-semibold">Debit Date:</span> 5th of every month
         </p>
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
         } focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all`}
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
         <div className="mt-4 p-3 bg-red-50 rounded-lg text-red-600 text-sm flex items-center">
           <FaExclamationCircle className="mr-2" /> {error}
         </div>
       )}
     </form>
   </div>
 );
}