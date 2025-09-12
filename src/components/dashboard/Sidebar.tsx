// components/dashboard/Sidebar.tsx
'use client';
import React, { useState, useMemo, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

import { 
  PackageIcon, PrinterIcon, Truck, FileDown, ClipboardList, 
  Home, CreditCard, BarChartBig, Share2, ShoppingBag, 
  Users, Settings, ChevronDown, Bell 
} from 'lucide-react';

import useSWR from 'swr';
import { parseISO, differenceInCalendarDays, isAfter } from 'date-fns';
import { toast } from 'react-toastify';
import EnhancedLogoutButton from '../ui/LogoutBtn';
import RazorpayConnect from '../ui/RazorpayConnect';
import { MandateModal } from '../mandate/MandateModal';
import { motion, AnimatePresence } from 'framer-motion';

import SharePopup from '../ui/SharedPopup';


interface Organisation {
  id: number;
  email: string;
  name: string;
  shopName: string;
  endDate: string;
  subscriptionType: 'trial' | 'active' | 'pro';
  smsCount: number;
  monthlyUsage?: number;
}

interface GetOrganisationResponse {
  organisation: Organisation;
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


// Fetcher

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error('Failed to fetch');
    return res.json();
  });


// Navigation

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  {
    name: 'Billing',
    icon: CreditCard,
    children: [
      { name: 'Online Bills', href: '/billing/online' },
      { name: 'Offline Bills', href: '/billing/offline' },
    ],
  },
  
  {
    name: 'Transactions',
    icon: BarChartBig,
    children: [
      { name: 'Online', href: '/transactions/online' },
      { name: 'Offline', href: '/transactions/offline' },
    ],
  },

  {
    name: 'Invoices',
    icon: ClipboardList, // Using an existing icon for now
    children: [
      { name: 'Create Invoice', href: '/invoices/new' },
      { name: 'View All Invoices', href: '/invoices/list' },
    ],
  },
  
  { name: 'Share Form Link', icon: Share2, isShareButton: true },
  { name: 'Printing', href: '/printing', icon: PrinterIcon },
  { name: 'Packing', href: '/packing', icon: PackageIcon },
  { name: 'Tracking Number', href: '/tracking', icon: Truck },  
  { name: 'Order sheet', href: '/ordersheet', icon: Truck },
  {
    name: 'Products',
    icon: ShoppingBag,
    children: [
      { name: 'Add Product', href: '/products/add' },
      { name: 'Add Category', href: '/products/categories' },
      { name: 'View Products', href: '/products/view' },
    ],
  },
  { name: 'Customers', href: '/customers', icon: Users },
  { name: 'Settings', href: '/settings', icon: Settings },

  {
    name: 'Report Download',
    icon: FileDown,
    href:'/reports'

  },
];


// Sidebar Component
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
  const [isMounted, setIsMounted] = useState(false);

  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Fetch org and submissions
  const { data, error, isLoading } = useSWR<GetOrganisationResponse>(
    '/api/organisation',
    fetcher,
    { refreshInterval: 30000 }

  );
  const { data: submissionsData } = useSWR<{ submissions: CustomerSubmission[] }>(
    '/api/billing/customer_submission?status=pending',
    fetcher,
    { refreshInterval: 30000 }
  );
  const pendingCount = submissionsData?.submissions?.length || 0;

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Toggle a parent nav item
  const toggleItem = (name: string) => {
    setOpenItems((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  // Calculate remaining days (optional usage)
  const remainingDays = useMemo(() => {
    if (data?.organisation?.endDate) {
      const endDate = parseISO(data.organisation.endDate);
      const currentDate = new Date();
      if (!isAfter(endDate, currentDate)) return 0;
      return differenceInCalendarDays(endDate, currentDate);
    }
    return 0;
  }, [data]);

  // 1) If not mounted (SSR), return null
  if (!isMounted) return null;

  // 2) Show a loading screen if sidebar is open & data is still loading
  if (isOpen && isLoading) {
    return (
      <>
        {/* Close button in top-right (mobile only) */}
        <button
          className="md:hidden fixed top-4 right-4 z-50 p-2 rounded-md text-gray-800 
                    hover:text-gray-600 hover:bg-gray-100 focus:outline-none 
                    transition-transform duration-300 transform"
          onClick={() => setIsOpen(false)}
        >
          {/* X icon */}
          <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M6 18L18 6M6 6l12 12" 
            />
          </svg>
        </button>

        <div
          className={`fixed inset-y-0 left-0 z-40 w-64 bg-white shadow-lg
                      transform transition-transform duration-300 ease-in-out
                      ${isOpen ? 'translate-x-0' : '-translate-x-full'}
                      md:translate-x-0 flex flex-col justify-center items-center`}
        >
          <p className="text-gray-500">Loading...</p>
        </div>
      </>
    );
  }

  // 3) Show an error if sidebar is open & data fetch fails
  if (isOpen && error) {
    return (
      <>
        <button
          className="md:hidden fixed top-4 right-4 z-50 p-2 rounded-md text-gray-500 
                    hover:text-gray-600 hover:bg-gray-100 focus:outline-none 
                    transition-transform duration-300 transform"
          onClick={() => setIsOpen(false)}
        >
          <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M6 18L18 6M6 6l12 12" 
            />
          </svg>
        </button>

        <div
          className={`fixed inset-y-0 left-0 z-40 w-64 bg-white shadow-lg
                      transform transition-transform duration-300 ease-in-out
                      ${isOpen ? 'translate-x-0' : '-translate-x-full'}
                      md:translate-x-0 flex flex-col justify-center items-center`}
        >
          <p className="text-red-500 mt-10">Failed to load data.</p>
        </div>
      </>
    );
  }

  // 4) Otherwise, normal sidebar rendering
  return (
    <>
      {/* 
        You can optionally place an overlay behind the sidebar 
        for mobile, to close when clicked:
      */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-40 
                    transition-opacity duration-300 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* The actual sidebar panel */}
      <div
        className={`
          fixed inset-y-0 left-0 z-40 w-64 bg-white shadow-lg
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0 flex flex-col justify-between
        `}
      >
        <div className="relative h-full overflow-y-auto">

          {/* Sidebar header area */}
          <div className="flex items-center justify-between h-16 px-4 bg-">

            {/* <h1 className="text-indigo-600 text-2xl font-bold">Billzzy</h1> */}
            
            <div className="flex justify-start pl-2 mt-1">
              <Image
              src="/assets/billzzy-logo.png"
              alt="Billzzy Logo"
              width={120}  // Reduced width
              height={120}  // Much smaller height
              className="w-auto h-18 -mr-8 mt-1"  // Control size with Tailwind classes
              />
            </div>

            <div className="flex items-center space-x-4">
              <button
                className="relative text-indigo-600 focus:outline-none"
                onClick={() => {
                  // close sidebar & navigate to pendingBills
                  setIsOpen(false);
                  router.push('/billing/pendingBills');
                }}
              >
                <Bell className="h-6 w-6" />
                {pendingCount > 0 && (
                  <span className="absolute top-0 right-0 inline-flex items-center 
                                  justify-center px-1 py-0.5 text-xs font-bold 
                                  leading-none text-white transform 
                                  translate-x-1/2 -translate-y-1/2 bg-red-500 rounded-full"
                  >
                    {pendingCount}
                  </span>
                )}
              </button>
            </div>
          </div>
          {/* Navigation menu */}
          <nav className="mt-5 px-2">
            {navigation.map((item) => {
              if (item.isShareButton) {
                // "Share" special button
                return (
                  <button
                    key={item.name}
                    onClick={() => setIsSharePopupOpen(true)}
                    className="w-full group flex items-center px-2 py-2 text-sm 
                              font-medium rounded-md text-gray-800 
                              hover:bg-gray-200 hover:text-gray-800"
                  >
                    <item.icon 
                      className="mr-3 h-6 w-6 text-gray-800 group-hover:text-gray-800" 
                    />
                    {item.name}
                  </button>
                );
              }
              
              const isActive =
                pathname === item.href ||
                item.children?.some((child) => pathname === child.href);

              // If has nested children
              if (item.children) {
                const isItemOpen = openItems[item.name] || false;
                return (
                  <div key={item.name} className="space-y-1">
                    <button
                      onClick={() => toggleItem(item.name)}
                      className={`w-full group flex items-center justify-between 
                                  px-2 py-2 text-sm font-medium rounded-md ${
                        isActive
                          ? 'bg-indigo-100 text-indigo-900'
                          : 'text-gray-800 hover:bg-gray-200 hover:text-gray-800'
                      }`}
                    >
                      <div className="flex items-center">
                        <item.icon
                          className={`mr-3 h-6 w-6 ${
                            isActive
                              ? 'text-indigo-600'
                              : 'text-gray-800 group-hover:text-gray-800'
                          }`}
                        />
                        {item.name}
                      </div>
                      <motion.div
    animate={{ rotate: isItemOpen ? 180 : 0 }} // Animate the chevron icon
    transition={{ duration: 0.2 }}
  >
    <ChevronDown className="h-5 w-5" />
  </motion.div>
                    </button>
                    {/* Child links */}
                    <AnimatePresence>
  {isItemOpen && (
    <motion.div
      key="content" // A unique key is important for AnimatePresence
      initial="collapsed"
      animate="open"
      exit="collapsed"
      variants={{
        open: { opacity: 1, height: 'auto' },
        collapsed: { opacity: 0, height: 0 },
      }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className="ml-8 space-y-1 overflow-hidden" // `overflow-hidden` is crucial for height animation
    >
      {item.children.map((child) => (
        <Link
          key={child.name}
          href={child.href}
          className={`block px-2 py-2 text-sm rounded-md ${
            pathname === child.href
              ? 'text-indigo-600'
              : 'text-black hover:text-gray-900 hover:bg-gray-200'
          }`}
          onClick={() => setIsOpen(false)}
        >
          {child.name}
        </Link>
      ))}
    </motion.div>
  )}
</AnimatePresence>
                  </div>
                );
              }

              // Simple item
              return (
                <Link
                  key={item.name}
                  href={item.href || '/'}
                  className={`group flex items-center px-2 py-2 text-sm font-medium 
                              rounded-md ${
                    isActive
                      ? 'bg-indigo-100 text-indigo-900'
                      : 'text-gray-800 hover:bg-gray-200 hover:text-gray-800'
                  }`}
                  // Close sidebar on mobile link click
                  onClick={() => setIsOpen(false)}
                >
                  <item.icon
                    className={`mr-3 h-6 w-6 ${
                      isActive
                        ? 'text-indigo-600'
                        : 'text-gray-800 group-hover:text-gray-800'
                    }`}
                  />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Example extra UI (RazorpayConnect) */}
          <RazorpayConnect />
        </div>

        {/* Footer area (org usage, etc.) */}
        <div className="px-4 py-6 border-t border-gray-200">
          {data?.organisation ? (
            <FooterSection
              org={data.organisation}
              setShowUpgradeModal={setShowUpgradeModal}
            />
          ) : (
            <p className="text-gray-500">Not signed in</p>
          )}
        </div>
      </div>

      {/* Share Modal */}
      <SharePopup 
        isOpen={isSharePopupOpen} 
        onClose={() => setIsSharePopupOpen(false)} 
      />

      {/* Mandate / Upgrade Modal */}
      <MandateModal 
        isOpen={showUpgradeModal} 
        onClose={() => setShowUpgradeModal(false)} 
      />
    </>
  );
}

// Footer sub-component
function FooterSection({
  org,
  setShowUpgradeModal,
}: {
  org: Organisation;
  setShowUpgradeModal: (val: boolean) => void;
}) {
  const usageLimit = 50;
  const monthlyUsage = org.monthlyUsage ?? 0;
  const usageExceeded = monthlyUsage >= usageLimit;

  return (
    <div className="space-y-4">
      {org.subscriptionType !== 'pro' && (
        <div className="space-y-4">
          <div className="flex flex-col justify-between ">
            <div>
              <p className="text-sm text-gray-700">
                Monthly Usage: {monthlyUsage}/{usageLimit}
              </p>
              {usageExceeded ? (
                <div className="mt-2 bg-yellow-50 border border-yellow-200 p-2 rounded text-yellow-700 text-sm">
                  <p>Monthly limit reached</p>
                </div>
              ) : (
                <p className="text-xs text-gray-500">
                  {usageLimit - monthlyUsage} orders remaining this month
                </p>
              )}
            </div>
            <button
  onClick={() => setShowUpgradeModal(true)}
  className={`
    px-2 py-1 rounded-lg mt-4 text-sm font-medium
    transition-all duration-200 ease-in-out
    flex items-center gap-1 text-[11.8px] justify-center
    ${usageExceeded 
      ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border border-yellow-300'
      : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'}
  `}
>
  {usageExceeded 
    ? 'Upgrade for unlimited bills →'
    : 'Switch to unlimited bills'}
</button>
          </div>
        </div>
      )}
      <EnhancedLogoutButton />
    </div>
  );
}