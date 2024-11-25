// components/Sidebar.tsx
'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  HomeIcon,
  ShoppingBagIcon,
  UsersIcon,
  DocumentTextIcon,
  CogIcon,
  ChartBarIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';
import { useState, useMemo } from 'react';
import useSWR from 'swr';
import EnhancedLogoutButton from '../ui/LogoutBtn';
import { differenceInCalendarDays, parseISO, isAfter } from 'date-fns'; // Import date-fns functions
import React from 'react';  // Add this import

interface Organisation {
  id: number;
  email: string;
  name: string;
  shopName: string;
  endDate: string; // ISO string
  subscriptionType: 'trial' | 'active' | 'pro'; // Adjust based on your subscription types
  smsCount: number;
}

interface GetOrganisationResponse {
  organisation: Organisation;
}

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  {
    name: 'Billing',
    icon: DocumentTextIcon,
    children: [
      { name: 'Online Bills', href: '/billing/online' },
      { name: 'Offline Bills', href: '/billing/offline' },
    ],
  },
  {
    name: 'Transactions',
    icon: ChartBarIcon,
    children: [
      { name: 'Online', href: '/transactions/online' },
      { name: 'Offline', href: '/transactions/offline' },
    ],
  },
  { name: 'Tracking Number', href: '/tracking', icon: UsersIcon },

  {
    name: 'Products',
    icon: ShoppingBagIcon,
    children: [
      { name: 'Add Product', href: '/products/add' },
      { name: 'Add Category', href: '/products/categories' },
      { name: 'View Products', href: '/products/view' },
    ],
  },
  { name: 'Customers', href: '/customers', icon: UsersIcon },
  { name: 'Settings', href: '/settings', icon: CogIcon },
];

// Fetcher function for SWR
const fetcher = (url: string) =>
  fetch(url)
    .then((res) => {
      if (!res.ok) {
        throw new Error('Failed to fetch');
      }
      return res.json() as Promise<GetOrganisationResponse>;
    })
    .catch((error) => {
      throw error;
    });

export default function Sidebar({
  isOpen,
  setIsOpen,
}: {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}) {
  const pathname = usePathname();
  const [openItems, setOpenItems] = useState<{ [key: string]: boolean }>({});

  const toggleItem = (name: string) => {
    setOpenItems((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  // Fetch organisation data using SWR
  const { data, error, isLoading } = useSWR<GetOrganisationResponse>('/api/organisation', fetcher);

  // Calculate remaining days using useMemo for optimization
  const remainingDays = useMemo(() => {
    if (data?.organisation?.endDate) {
      const endDate = parseISO(data.organisation.endDate);
      const currentDate = new Date();

      if (!isAfter(endDate, currentDate)) {
        // Subscription has ended
        return 0;
      }

      const diffDays = differenceInCalendarDays(endDate, currentDate);
      return diffDays;
    }
    return 0;
  }, [data]);

  // Handle loading and error states
  if (isLoading) {
    return (
      <div className="fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg flex flex-col justify-between">
        <div className="flex items-center justify-center h-full">
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg flex flex-col justify-between">
        <div className="flex items-center justify-center h-full">
          <p className="text-red-500">Failed to load data.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Mobile sidebar overlay */}
      <div
        className={`fixed inset-0 z-40 md:hidden ${
          isOpen ? 'block' : 'hidden'
        }`}
        onClick={() => setIsOpen(false)}
        aria-hidden="true"
      >
        <div className="absolute inset-0 bg-gray-600 opacity-75" />
      </div>

      {/* Sidebar component */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 flex flex-col justify-between`}
      >
        <div>
          <div className="flex items-center justify-between h-16 px-4 bg-indigo-600">
            <h1 className="text-white text-2xl font-bold">Billz</h1>
            {data?.organisation.subscriptionType === 'trial' && (
              <span className="inline-block mt-2 px-2 py-1 text-xs font-semibold text-white bg-yellow-500 rounded">
                Trial
              </span>
            )}
            {/* Close button for mobile */}
            <button
              className="md:hidden text-white focus:outline-none"
              onClick={() => setIsOpen(false)}
              aria-label="Close sidebar"
            >
              <svg
                className="h-6 w-6"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <nav className="mt-5 px-2">
            {navigation.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.children?.some((child) => pathname === child.href));

              const isItemOpen = openItems[item.name];

              return (
                <div key={item.name}>
                  {item.children ? (
                    <div className="space-y-1">
                      <button
                        onClick={() => toggleItem(item.name)}
                        className={`w-full group flex items-center justify-between px-2 py-2 text-sm font-medium rounded-md focus:outline-none ${
                          isActive
                            ? 'bg-indigo-100 text-indigo-900'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                      >
                        <div className="flex items-center">
                          <item.icon
                            className={`mr-3 h-6 w-6 ${
                              isActive
                                ? 'text-indigo-600'
                                : 'text-gray-400 group-hover:text-gray-500'
                            }`}
                          />
                          {item.name}
                        </div>
                        <ChevronDownIcon
                          className={`h-5 w-5 transform transition-transform ${
                            isItemOpen ? 'rotate-180' : 'rotate-0'
                          }`}
                        />
                      </button>
                      {isItemOpen && (
                        <div className="ml-8 space-y-1">
                          {item.children.map((child) => (
                            <Link
                              key={child.name}
                              href={child.href}
                              className={`block px-2 py-2 text-sm rounded-md ${
                                pathname === child.href
                                  ? 'text-indigo-600'
                                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                              }`}
                              onClick={() => setIsOpen(false)} // Close sidebar on link click (optional)
                            >
                              {child.name}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <Link
                      href={item.href}
                      className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                        isActive
                          ? 'bg-indigo-100 text-indigo-900'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                      onClick={() => setIsOpen(false)} // Close sidebar on link click (optional)
                    >
                      <item.icon
                        className={`mr-3 h-6 w-6 ${
                          isActive
                            ? 'text-indigo-600'
                            : 'text-gray-400 group-hover:text-gray-500'
                        }`}
                      />
                      {item.name}
                    </Link>
                  )}
                </div>
              );
            })}
          </nav>
        </div>

        {/* Bottom section for subscription info and logout */}
        <div className="px-4 py-6 border-t border-gray-200">
          {data?.organisation ? (
            <div className="space-y-8">
              {/* Subscription Progress */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium text-gray-700">
                    Subscription:{' '}
                    {data.organisation.subscriptionType === 'trial'
                      ? 'Trial'
                      : 'Active'}
                  </span>
                  <span className="text-sm text-gray-500">
                    {remainingDays} day{remainingDays !== 1 ? 's' : ''} left
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className={`bg-indigo-600 h-2.5 rounded-full`}
                    style={{
                      width: `${Math.min((remainingDays / 30) * 100, 100)}%`, // Assuming 30 days subscription
                    }}
                  ></div>
                </div>
              </div>

              {/* Logout Button */}
              <EnhancedLogoutButton />
            </div>
          ) : (
            <p className="text-gray-500">Not signed in</p>
          )}
        </div>
      </div>
    </>
  );
}
