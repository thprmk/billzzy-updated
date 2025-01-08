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

const AdminDashboard = ({ organisations }: AdminDashboardProps) => {
  const [orgs, setOrgs] = useState(organisations);
  const [isDeleting, setIsDeleting] = useState<number | null>(null);
  const [isExtending, setIsExtending] = useState<number | null>(null);
  const router = useRouter();

  const formatDate = (date: Date | string | null) => {
    if (!date) return 'N/A';
    try {
      return format(new Date(date), 'dd/MM/yyyy');
    } catch (error) {
      return 'Invalid Date';
    }
  };

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
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ id }),
        });

        if (response.ok) {
          setOrgs(orgs.filter((org) => org.id !== id));
          Swal.fire(
            'Deleted!',
            'Organisation has been deleted.',
            'success'
          );
          router.refresh();
        } else {
          throw new Error('Failed to delete organisation');
        }
      }
    } catch (error) {
      Swal.fire(
        'Error!',
        'Failed to delete organisation.',
        'error'
      );
    } finally {
      setIsDeleting(null);
    }
  };

  const extendSubscription = async (id: number) => {
    try {
      const result = await Swal.fire({
        title: 'Extend Subscription',
        text: 'Do you want to extend the subscription by 30 days?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, extend it!'
      });

      if (result.isConfirmed) {
        setIsExtending(id);
        const response = await fetch('/api/admin/extendSubscription', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ id, days: 30 }),
        });

        if (response.ok) {
          const updatedOrg = await response.json();
          setOrgs(orgs.map(org => 
            org.id === id 
              ? { ...org, endDate: updatedOrg.endDate, remainingDays: updatedOrg.remainingDays }
              : org
          ));
          Swal.fire(
            'Extended!',
            'Subscription has been extended.',
            'success'
          );
          router.refresh();
        } else {
          throw new Error('Failed to extend subscription');
        }
      }
    } catch (error) {
      Swal.fire(
        'Error!',
        'Failed to extend subscription.',
        'error'
      );
    } finally {
      setIsExtending(null);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-4">Admin Dashboard</h1>

      <table className="min-w-full bg-white border border-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="py-3 px-4 border-b text-left">Organisation Name</th>
            <th className="py-3 px-4 border-b text-left">Email</th>
            <th className="py-3 px-4 border-b text-left">Mobile No</th>
            <th className="py-3 px-4 border-b text-left">SMS Amt</th>
            <th className="py-3 px-4 border-b text-left">End Date</th>
            <th className="py-3 px-4 border-b text-left">Remaining Days</th>
            <th className="py-3 px-4 border-b text-left">Actions</th>
          </tr>
        </thead>
        <tbody>
          {orgs.map((org) => (
            <tr key={org.id} className="hover:bg-gray-50">
              <td className="py-3 px-4 border-b">{org.name}</td>
              <td className="py-3 px-4 border-b">{org.email}</td>
              <td className="py-3 px-4 border-b">{org.mobileNumber}</td>
              <td className="py-3 px-4 border-b">Rs.{(org.smsCount * 0.30).toFixed(2)}</td>
              <td className="py-3 px-4 border-b">{formatDate(org.endDate)}</td>
              <td className="py-3 px-4 border-b">{org.remainingDays}</td>
              <td className="py-3 px-4 border-b">
                <div className="flex space-x-2">
                  <button
                    onClick={() => extendSubscription(org.id)}
                    disabled={isExtending === org.id}
                    className={`bg-blue-500 text-white px-3 py-1 rounded-md ${
                      isExtending === org.id ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-600'
                    }`}
                  >
                    {isExtending === org.id ? 'Extending...' : 'Extend for 30'}
                  </button>
                  <button
                    onClick={() => deleteOrganisation(org.id)}
                    disabled={isDeleting === org.id}
                    className={`bg-red-500 text-white px-3 py-1 rounded-md ${
                      isDeleting === org.id ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-600'
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
};

export default AdminDashboard;