// components/admin/AdminTable.tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Organisation } from '@prisma/client';
import { format } from 'date-fns';
import Swal from 'sweetalert2';

interface OrganisationWithRemainingDays extends Organisation {
  remainingDays: number;
}

interface AdminDashboardProps {
  organisations: OrganisationWithRemainingDays[];
}

export default function AdminDashboard({ organisations }: AdminDashboardProps) {
  const [orgs, setOrgs] = useState(organisations);
  const [isDeleting, setIsDeleting] = useState<number | null>(null);
  const router = useRouter();

  // Helper to format a date
  const formatDate = (date: Date | string | null) => {
    if (!date) return 'N/A';
    try {
      return format(new Date(date), 'dd/MM/yyyy');
    } catch {
      return 'Invalid Date';
    }
  };

  // Delete an org (and related data)
  const deleteOrganisation = async (id: number) => {
    try {
      const result = await Swal.fire({
        title: 'Are you sure?',
        text: "You won't be able to revert this!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, delete it!'
      });

      if (result.isConfirmed) {
        setIsDeleting(id);
        const response = await fetch('/api/admin/deleteOrganisation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id }),
        });

        if (response.ok) {
          // remove from local state
          setOrgs((prev) => prev.filter((org) => org.id !== id));
          Swal.fire('Deleted!', 'Organisation has been deleted.', 'success');
          router.refresh();
        } else {
          throw new Error('Failed to delete organisation');
        }
      }
    } catch (error) {
      Swal.fire('Error!', 'Failed to delete organisation.', 'error');
    } finally {
      setIsDeleting(null);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-4">Admin Dashboard</h1>

      <table className="min-w-full bg-white border border-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="py-3 px-4 border-b text-left">ID</th>
            <th className="py-3 px-4 border-b text-left">Phone</th>
            <th className="py-3 px-4 border-b text-left">Name</th>
            <th className="py-3 px-4 border-b text-left">Company Size</th>
            <th className="py-3 px-4 border-b text-left">Shop Name</th>
            <th className="py-3 px-4 border-b text-left">District</th>
            <th className="py-3 px-4 border-b text-left">State</th>
            <th className="py-3 px-4 border-b text-left">SMS Count</th>
            <th className="py-3 px-4 border-b text-left">Subscription</th>
            <th className="py-3 px-4 border-b text-left">Monthly Usage</th>
            <th className="py-3 px-4 border-b text-left">End Date</th>
            <th className="py-3 px-4 border-b text-left">Remaining Days</th>
            <th className="py-3 px-4 border-b text-left">Actions</th>
          </tr>
        </thead>
        <tbody>
          {orgs.map((org) => (
            <tr key={org.id} className="hover:bg-gray-50">
              <td className="py-3 px-4 border-b">{org.id}</td>
              <td className="py-3 px-4 border-b">{org.phone}</td>
              <td className="py-3 px-4 border-b">{org.name}</td>
              <td className="py-3 px-4 border-b">{org.companySize}</td>
              <td className="py-3 px-4 border-b">{org.shopName}</td>
              <td className="py-3 px-4 border-b">{org.district}</td>
              <td className="py-3 px-4 border-b">{org.state}</td>
              <td className="py-3 px-4 border-b">{org.smsCount}</td>
              <td className="py-3 px-4 border-b">{org.subscriptionType}</td>
              <td className="py-3 px-4 border-b">{org.monthlyUsage}</td>
              <td className="py-3 px-4 border-b">{formatDate(org.endDate)}</td>
              <td className="py-3 px-4 border-b">{org.remainingDays}</td>
              <td className="py-3 px-4 border-b">
                <div className="flex flex-wrap gap-2">
                  {/* View Mandate Button */}
                  <button
                    onClick={() => router.push(`/admin/${org.id}`)}
                    className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                  >
                    View Mandate
                  </button>
                  {/* Delete Button */}
                  <button
                    onClick={() => deleteOrganisation(org.id)}
                    disabled={isDeleting === org.id}
                    className={`bg-red-500 text-white px-3 py-1 rounded ${
                      isDeleting === org.id
                        ? 'opacity-50 cursor-not-allowed'
                        : 'hover:bg-red-600'
                    }`}
                  >
                    {isDeleting === org.id ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
