// File: components/Sidebar.tsx

'use client';

import React, { useState, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  HomeIcon,
  ShoppingBagIcon,
  UsersIcon,
  DocumentTextIcon,
  CogIcon,
  ChartBarIcon,
  ChevronDownIcon,
  ShareIcon,
  ClipboardIcon,
  BellIcon,
} from '@heroicons/react/24/outline';
import useSWR from 'swr';
import { differenceInCalendarDays, parseISO, isAfter } from 'date-fns';
import { toast } from 'react-toastify';
import EnhancedLogoutButton from '../ui/LogoutBtn';
import { PackageIcon, PrinterIcon, Truck } from 'lucide-react';
import RazorpayConnect from '../ui/RazorpayConnect';

interface Organisation {
  id: number;
  email: string;
  name: string;
  shopName: string;
  endDate: string;
  subscriptionType: 'trial' | 'active' | 'pro';
  smsCount: number;
}

interface GetOrganisationResponse {
  organisation: Organisation;
}

interface SharePopupProps {
  isOpen: boolean;
  onClose: () => void;
}

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

const SharePopup = ({ isOpen, onClose }: SharePopupProps) => {
  const [link, setLink] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);

  const generateAndShareLink = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/billing/generateLink', {
        method: 'POST',
      });
      const data = await response.json();
      setLink(data.link);
    } catch (error) {
      toast.error('Failed to generate link');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(link);
    toast.success('Link copied!');
    onClose();
  };

  const shareToWhatsApp = () => {
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(link)}`;
    window.open(whatsappUrl, '_blank');
    onClose();
  };

  React.useEffect(() => {
    if (isOpen) {
      generateAndShareLink();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg p-6  space-y-4 transform transition-all duration-300 ease-in-out animate-fadeIn">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">Share Link</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            ×
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className='text-[14px]'>{link}</div>
            <button
              onClick={copyToClipboard}
              className="w-full flex items-center justify-center space-x-2 p-2 rounded bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              <ClipboardIcon className="h-5 w-5" />
              <span>Copy Link</span>
            </button>

            <button
              onClick={shareToWhatsApp}
              className="w-full flex items-center justify-center space-x-2 p-2 rounded bg-green-500 text-white hover:bg-green-600 transition-colors"
            >
              <ShareIcon className="h-5 w-5" />
              <span>Share on WhatsApp</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

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
  { name: 'Share Form Link', icon: ShareIcon, isShareButton: true },
  // Add this to your navigation array
{
  name: 'Printing',
  href: '/printing',
  icon: PrinterIcon, // Import from your icon library
},
{
  name: 'Packing',
  href: '/packing',
  icon: PackageIcon, // Import from your icon library
},

  { name: 'Tracking Number', href: '/tracking', icon: Truck },
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

const fetcher = (url: string) =>
  fetch(url)
    .then((res) => {
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
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
  const router = useRouter();
  const [openItems, setOpenItems] = useState<{ [key: string]: boolean }>({});
  const [isSharePopupOpen, setIsSharePopupOpen] = useState(false);

  const toggleItem = (name: string) => {
    setOpenItems((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  // Fetch organisation data
  const { data, error, isLoading } = useSWR<GetOrganisationResponse>(
    '/api/organisation',
    fetcher
  );

  // Fetch pending submissions
  const {
    data: submissionsData,
    error: submissionsError,
  } = useSWR<{ submissions: CustomerSubmission[] }>(
    '/api/billing/customer_submission?status=pending',
    fetcher,
    { refreshInterval: 30000 } // Refresh every 30 seconds
  );

  const pendingCount = submissionsData?.submissions?.length || 0;

  // Remaining days calculation
  const remainingDays = useMemo(() => {
    if (data?.organisation?.endDate) {
      const endDate = parseISO(data.organisation.endDate);
      const currentDate = new Date();
      if (!isAfter(endDate, currentDate)) return 0;
      return differenceInCalendarDays(endDate, currentDate);
    }
    return 0;
  }, [data]);

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
      <div
        className={`fixed inset-0 z-40 md:hidden ${
          isOpen ? 'block' : 'hidden'
        }`}
        onClick={() => setIsOpen(false)}
      >
        <div className="absolute inset-0 bg-gray-600 opacity-75" />
      </div>

      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 flex flex-col justify-between`}
      >
        <div className="relative">
          <div className="flex items-center justify-between h-16 px-4 bg-indigo-600 relative">
            <h1 className="text-white text-2xl font-bold">Billzzy</h1>

            <div className="flex items-center space-x-4">
              {/* Notification Icon */}
              <button
                className="relative text-white focus:outline-none"
                onClick={() => {
                  setIsOpen(false);
                  router.push('/billing/pendingBills');
                }}
              >
                <BellIcon className="h-6 w-6" />
                {pendingCount > 0 && (
                  <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1 py-0.5 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-500 rounded-full">
                    {pendingCount}
                  </span>
                )}
              </button>

              {/* Close Sidebar Button */}
              <button
                className="md:hidden text-white focus:outline-none"
                onClick={() => setIsOpen(false)}
              >
                <svg
                  className="h-6 w-6"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
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
          </div>

          <nav className="mt-5 px-2">
            {navigation.map((item) => {
              if (item.isShareButton) {
                return (
                  <button
                    key={item.name}
                    onClick={() => setIsSharePopupOpen(true)}
                    className="w-full group flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  >
                    <item.icon className="mr-3 h-6 w-6 text-gray-400 group-hover:text-gray-500" />
                    {item.name}
                  </button>
                );
              }

              const isActive =
                pathname === item.href ||
                item.children?.some((child) => pathname === child.href);
              const isItemOpen = openItems[item.name];

              if (item.children) {
                return (
                  <div key={item.name} className="space-y-1">
                    <button
                      onClick={() => toggleItem(item.name)}
                      className={`w-full group flex items-center justify-between px-2 py-2 text-sm font-medium rounded-md ${
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
                          isItemOpen ? 'rotate-180' : ''
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
                            onClick={() => setIsOpen(false)}
                          >
                            {child.name}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }


              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                    isActive
                      ? 'bg-indigo-100 text-indigo-900'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                  onClick={() => setIsOpen(false)}
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
              );
            })}
          </nav>

          <RazorpayConnect/>

        </div>

        <div className="px-4 py-6 border-t border-gray-200">
          {data?.organisation ? (
            <div className="space-y-8">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium text-gray-700">
                    Subscription:{' '}
                    {data.organisation.subscriptionType === 'trial' ? 'Trial' : 'Active'}
                  </span>
                  <span className="text-sm text-gray-500">
                    {remainingDays} day{remainingDays !== 1 ? 's' : ''} left
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="bg-indigo-600 h-2.5 rounded-full"
                    style={{
                      width: `${Math.min((remainingDays / 30) * 100, 100)}%`,
                    }}
                  />
                </div>
              </div>
              <EnhancedLogoutButton />
            </div>
          ) : (
            <p className="text-gray-500">Not signed in</p>
          )}
        </div>
      </div>

      <SharePopup isOpen={isSharePopupOpen} onClose={() => setIsSharePopupOpen(false)} />
    </>
  );
}
