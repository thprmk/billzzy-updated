// components/AdminDashboard.tsx

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Organisation } from '@prisma/client';
import { format } from 'date-fns';
import { toast } from 'react-toastify';
import React from 'react';  // Add this import

interface OrganisationWithRemainingDays extends Organisation {
  remainingDays: number;
}

interface AdminDashboardProps {
  organisations: OrganisationWithRemainingDays[];
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ organisations }) => {
  const [orgs, setOrgs] = useState(organisations);
  const router = useRouter();

  const deleteOrganisation = async (id: number) => {
    if (confirm('Are you sure you want to delete this organisation?')) {
      try {
        const response = await fetch('/api/admin/deleteOrganisation', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ id }),
        });

        if (response.ok) {
          setOrgs(orgs.filter((org) => org.id !== id));
          router.refresh(); // Refresh data
        } else {
          console.error('Failed to delete organisation');
        }
      } catch (error) {
        console.error(error);
      }
    }
  };

  const extendSubscription = async (id: number, days: number) => {
    try {
      const response = await fetch('/api/admin/extendSubscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id, days }),
      });

      if (response) {

        router.refresh(); 
      } else {
        console.error('Failed to extend subscription');
      }
      toast.success("subcription extended")
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-4">Admin Dashboard</h1>

      <table className="min-w-full bg-white">
        <thead>
          <tr>
            <th className="py-2 px-4 border-b">Organisation Name</th>
            <th className="py-2 px-4 border-b">Email</th>
            <th className="py-2 px-4 border-b">Mobile No</th>

            <th className="py-2 px-4 border-b">End Date</th>
            <th className="py-2 px-4 border-b">Remaining Days</th>
            <th className="py-2 px-4 border-b">Actions</th>
          </tr>
        </thead>
        <tbody>
          {orgs.map((org) => (
            <tr key={org.id}>
              <td className="py-2 px-4 border-b">{org.name}</td>
              <td className="py-2 px-4 border-b">{org.email}</td>
              <td className="py-2 px-4 border-b">{org.mobileNumber}</td>

              <td className="py-2 px-4 border-b">
                {format(new Date(org.endDate), 'dd/MM/yyyy')}
              </td>
              <td className="py-2 px-4 border-b">{org.remainingDays}</td>
              <td className="py-2 px-4 border-b">
                <div className="flex space-x-2">
                 
                  <button
                    onClick={() =>extendSubscription(org.id, parseInt('30'))
                    }
                    className="bg-red-500 text-white px-2 py-1 rounded"
                  >
                    Extend for 30
                  </button>
                  <button
                    onClick={() => deleteOrganisation(org.id)}
                    className="bg-red-500 text-white px-2 py-1 rounded"
                  >
                    Delete
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
