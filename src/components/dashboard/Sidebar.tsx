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
import { MandateModal } from '../mandate/MandateModal';

interface Organisation {
  id: number;
  email: string;
  name: string;
  shopName: string;
  endDate: string;
  subscriptionType: 'trial' | 'active' | 'pro';
  smsCount: number;
  monthlyUsage?: number; // Add this field
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

// Hamburger Button Component
const HamburgerButton = ({ onClick, isOpen }: { onClick: () => void; isOpen: boolean }) => (
  <button
    className="md:hidden fixed top-4 left-4 z-50 p-2 rounded-md text-gray-500 hover:text-gray-600 hover:bg-gray-100 focus:outline-none"
    onClick={onClick}
  >
    {isOpen ? (
      <svg
        className="h-10 w-10"
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
    ) : (
      <svg
        className="h-8 w-10"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 6h16M4 12h16M4 18h16"
        />
      </svg>
    )}
  </button>
);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="w-full max-w-sm md:max-w-md lg:max-w-lg bg-white rounded-md shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Share Link</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            &times;
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-4">
            <div className="loader border-t-transparent border-blue-500"></div>
          </div>
        ) : (
          <>
            <div className="mb-4 break-words">{link}</div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 transition-colors"
                onClick={copyToClipboard}
              >
                Copy Link
              </button>
              <button
                className="bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600 transition-colors"
                onClick={shareToWhatsApp}
              >
                Share on WhatsApp
              </button>
            </div>
          </>
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
  { name: 'Printing', href: '/printing', icon: PrinterIcon },
  { name: 'Packing', href: '/packing', icon: PackageIcon },
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
  { name: 'Mandate', href: '/mandate', icon: CogIcon },
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

  // For upgrade modal
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const toggleItem = (name: string) => {
    setOpenItems((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  // fetch org data
  const { data, error, isLoading } = useSWR<GetOrganisationResponse>(
    '/api/organisation',
    fetcher
  );

  // fetch pending submissions
  const { data: submissionsData } = useSWR<{ submissions: CustomerSubmission[] }>(
    '/api/billing/customer_submission?status=pending',
    fetcher,
    { refreshInterval: 30000 }
  );

  const pendingCount = submissionsData?.submissions?.length || 0;

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

  const organisation = data?.organisation;
  const usageLimit = 1;
  const monthlyUsage = organisation?.monthlyUsage ?? 0;
  const usageExceeded = monthlyUsage >= usageLimit;

  return (
    <>
      <HamburgerButton onClick={() => setIsOpen(!isOpen)} isOpen={isOpen} />

      {/* Mobile overlay */}
      <div
        className={`fixed inset-0 z-40 bg-gray-600 bg-opacity-75 transition-opacity duration-300 md:hidden ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsOpen(false)}
      />

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-all duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 flex flex-col justify-between`}
      >
        <div className="relative h-full overflow-y-auto">
          <div className="flex items-center justify-between h-16 px-4 bg-indigo-600">
            <h1 className="text-white text-2xl font-bold">Billzzy</h1>
            <div className="flex items-center space-x-4">
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

          <RazorpayConnect />
        </div>

        <div className="px-4 py-6 border-t border-gray-200">
          {organisation ? (
            <div className="space-y-8">
             
              {/* Show usage if subscription not 'pro' */}
              {organisation.subscriptionType !== 'pro' && (
                <div className="space-y-2">
                  <p className="text-sm text-gray-700">
                    Monthly Usage: {monthlyUsage}/{usageLimit}
                  </p>

                  {usageExceeded ? (
                    <div className="bg-red-50 border border-red-200 p-3 rounded text-red-700">
                      <p className="font-semibold mb-2">Limit Reached</p>
                      <p className="mb-2">
                        You have reached {usageLimit} orders this month.
                        Please wait until{' '}
                        <strong>{new Date(organisation.endDate).toLocaleDateString()}</strong>{' '}
                        or upgrade to Pro.
                      </p>
                      <button
                        onClick={() => setShowUpgradeModal(true)}
                        className="px-4 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                      >
                        Upgrade to Pro
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500">
                      You can create up to {usageLimit} orders this month. Resets on{' '}
                      {new Date(organisation.endDate).toLocaleDateString()}.
                    </p>
                  )}
                </div>
              )}

              <EnhancedLogoutButton />
            </div>
          ) : (
            <p className="text-gray-500">Not signed in</p>
          )}
        </div>
      </div>

      <SharePopup isOpen={isSharePopupOpen} onClose={() => setIsSharePopupOpen(false)} />

      {/* The Mandate (Upgrade) Modal */}
      <MandateModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
      />
    </>
  );
}
