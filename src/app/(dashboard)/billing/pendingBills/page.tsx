// File: app/pending_bills/page.tsx

'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { useRouter } from 'next/navigation';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

interface CustomerSubmission {
  id: number;
  notes: string;
  createdAt: string;
  customer: {
    id: number;
    name: string;
    phone: string;
    email: string;
  };
}

export default function PendingBillsPage() {
  const router = useRouter();

  const fetcher = (url: string) =>
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch');
        return res.json();
      })
      .catch((error) => {
        throw error;
      });

  const { data, error } = useSWR<{ submissions: CustomerSubmission[] }>(
    '/api/billing/customer_submission?status=pending',
    fetcher
  );

  if (error) {
    return <div className="p-4">Failed to load pending bills.</div>;
  }

  if (!data) {
<div className='h-[100vh] w-[100%]  flex items-center justify-center'><LoadingSpinner/></div>  }

  const submissions = data.submissions;

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Pending Bills</h1>
      {submissions.length > 0 ? (
        <ul className="space-y-4">
          {submissions.map((submission) => (
            <li key={submission.id} className="border rounded p-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-lg font-semibold">{submission.customer.name}</p>
                  <p className="text-sm text-gray-600">{submission.customer.phone}</p>
                  <p className="text-sm text-gray-600">{submission.customer.email}</p>
                  <p className="text-sm text-gray-600">
                    Notes: {submission.notes || 'None'}
                  </p>
                </div>
                <div className="text-indigo-600 hover:text-indigo-800 font-medium">

                <Link href={`/billing/processSubmission/${submission.id}`}>
                    Process
                </Link>
                </div>

              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p>No pending bills at the moment.</p>
      )}
    </div>
  );
}
