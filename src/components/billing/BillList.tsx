'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';

import { formatDate } from '@/lib/utils';
import { toast } from 'react-toastify';
import { Modal } from '@/components/ui/Modal';
import React from 'react';  
import { EditBillModal } from './EditBillModal';

interface BillItem {
  productId: number;
  quantity: number;
}

interface Bill {
  id: number;
  billNo: number;
  date: string; // 'YYYY-MM-DD'
  time: string; // 'HH:MM AM/PM'
  totalPrice: number;
  status: string;
  billingMode: string;
  customer: {
    name: string;
    phone: string;
    district?: string;
    state?: string;
  };
  items: Array<{
    id: number;
    productName: string;
    quantity: number;
    totalPrice: number;
    SKU: string; 
  }>;
  paymentMethod?: string;
  amountPaid?: number;
  balance?: number;
  trackingNumber?: string | null;
  weight?: number | null;
  paymentStatus: string;     // <-- FIX
  isEdited: boolean;         // <-- FIX
  notes: string | null;      // <-- FIX
  salesSource?: string | null; // <-- Our new field
  shipping?: {               // <-- FIX
    methodName: string;
    totalCost: number;
  } | null;
}


interface BillListProps {
  initialBills: Bill[];
  mode: 'online' | 'offline';
}

export function BillList({ initialBills, mode }: BillListProps) {
  const router = useRouter();
  const [bills, setBills] = useState<Bill[]>(initialBills);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [hasTrackingFilter, setHasTrackingFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleteAllModalOpen, setIsDeleteAllModalOpen] = useState(false);
  const [billToDelete, setBillToDelete] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 6;
  const [totalCount, setTotalCount] = useState(0);

  // State variables for tracking modal
  const [isTrackingModalOpen, setIsTrackingModalOpen] = useState(false);
  const [trackingBillId, setTrackingBillId] = useState<number | null>(null);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [weight, setWeight] = useState('');
  const trackingInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchBills(currentPage);
  }, [searchQuery, dateFilter, statusFilter, hasTrackingFilter]);

  const fetchBills = async (page: number) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        q: searchQuery,
        mode,
        date: dateFilter,
        status: statusFilter,
        page: page.toString(),
        pageSize: pageSize.toString(),
      });
  
      if (hasTrackingFilter !== 'all') {
        params.append('hasTracking', hasTrackingFilter);
      }
  

      if (sourceFilter !== 'all') {
        params.append('source', sourceFilter);
      }


      const response = await fetch(`/api/billing/search?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch bills');
      }
  
      const data = await response.json();
      
      // Verify the data structure in development
      console.log('Fetched bills:', data);
  
      setBills(data.bills);
      setTotalCount(data.totalCount);
      setCurrentPage(page);
    } catch (error) {
      console.error('Fetch error:', error);
      toast.error('Failed to fetch bills. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Call this function when component mounts or filters change
  useEffect(() => {
    fetchBills(1);
  }, [searchQuery, dateFilter, statusFilter, hasTrackingFilter, sourceFilter]);
  
  // Update bill function for editing
  const handleUpdateBill = async (items: BillItem[]) => {
    try {
      console.log('Updating bill:', billToEdit.id, items);
      
      const response = await fetch(`/api/billing/${billToEdit.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update bill');
      }
  
      await fetchBills(currentPage);
      toast.success('Bill updated successfully');
      setIsEditModalOpen(false);
      setBillToEdit(null);
    } catch (error) {
      console.error('Update error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update bill');
    }
  };

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [billToEdit, setBillToEdit] = useState<any>(null);



  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (bills.some(bill => bill.paymentMethod === 'razorpay_link' &&
      bill.paymentStatus !== 'PAID' && bill.paymentStatus !== 'FAILED')) {
      intervalId = setInterval(() => {
        fetchBills(currentPage);
      }, 5000); // Poll every 5 seconds
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [bills]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const handleDateFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setDateFilter(e.target.value);
    setCurrentPage(1);
  };

  const handleStatusFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value);
    setCurrentPage(1);
  };

  const handleHasTrackingFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setHasTrackingFilter(e.target.value);
    setCurrentPage(1);
  };


  const handleSourceFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSourceFilter(e.target.value);
    setCurrentPage(1);
  };


  const handlePageChange = (page: number) => {
    fetchBills(page);
  };

  const handleStatusChange = async (billId: number, newStatus: string) => {
    if (newStatus === 'shipped') {
      setTrackingBillId(billId);
      setIsTrackingModalOpen(true);
      // Focus input on next tick after modal opens
      setTimeout(() => {
        trackingInputRef.current?.focus();
      }, 100);
    } else {
      await updateStatus(billId, newStatus);
    }
  };

  const handleTrackingFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (trackingNumber.trim()) {
      handleTrackingSubmit();
    }
  };

  const updateStatus = async (billId: number, newStatus: string) => {

    try {
      const response = await fetch('/api/billing/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ billId, status: newStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update status');
      }

      // First update local state
      setBills(prevBills =>
        prevBills.map((bill) =>
          bill.id === billId ? { ...bill, status: newStatus } : bill
        )
      );

      await fetchBills(currentPage);

      // Force a client-side navigation to refresh the page
      router.refresh();

      toast.success('Status updated successfully');
    } catch (error) {
      console.error('Status update error:', error);
      toast.error('Failed to update status');
    }
  };

  const handleTrackingSubmit = async () => {
    if (!trackingBillId || !trackingNumber) {
      toast.error('Tracking number is required');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/billing/tracking`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          billId: trackingBillId,
          trackingNumber,
          weight: weight ? parseFloat(weight) : null,
          status: 'sent' // Update status as per your requirements
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update tracking details');
      }

      // Update the local state
      setBills(
        bills.map((bill) =>
          bill.id === trackingBillId
            ? {
              ...bill,
              status: 'shipped',
              trackingNumber,
              weight: weight ? parseFloat(weight) : null,
            }
            : bill
        )
      );

      await fetchBills(currentPage);

      // Force a client-side navigation to refresh the page
      router.refresh();


      toast.success('Tracking details updated and SMS sent successfully');

    } catch (error) {
      toast.error('Failed to update tracking details');
    } finally {
      setIsLoading(false);
      setIsTrackingModalOpen(false);
      setTrackingBillId(null);
      setTrackingNumber('');
      setWeight('');
    }
  };

  const handleDelete = async (billId: number) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/billing/${billId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete bill');
      }

      setBills(bills.filter((bill) => bill.id !== billId));
      toast.success('Bill deleted successfully');
      router.refresh();
    } catch (error) {
      toast.error('Failed to delete bill');
    } finally {
      setIsLoading(false);
      setIsDeleteModalOpen(false);
    }
  };


  const handlePaymentStatusChange = async (billId: number, newPaymentStatus: string) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/billing/manualPaymentStatus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          billId,
          paymentStatus: newPaymentStatus,
          status: newPaymentStatus === 'PAID' ? 'processing' : 'paymentPending'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update payment status');
      }

      // Update local state
      setBills(prevBills =>
        prevBills.map(bill =>
          bill.id === billId ? {
            ...bill,
            paymentStatus: newPaymentStatus,
            status: newPaymentStatus === 'PAID' ? 'processing' : 'paymentPending'
          } : bill
        )
      );

      await fetchBills(currentPage);
      router.refresh();
      toast.success('Payment status updated successfully');
    } catch (error) {
      console.error('Payment status update error:', error);
      toast.error('Failed to update payment status');
    } finally {
      setIsLoading(false);
    }
  };
  const handleDeleteAll = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/billing/all/${mode}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete bills');
      }

      setBills([]);
      toast.success('All bills deleted successfully');
      router.refresh();
    } catch (error) {
      toast.error('Failed to delete bills');
    } finally {
      setIsLoading(false);
      setIsDeleteAllModalOpen(false);
    }
  };

  console.log('bills:', bills);
  

  return (
    <>
      {/* --- FINAL, CORRECTED FILTER BAR --- */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
        <Input
          type="search"
          placeholder="Search bills..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full md:w-auto md:max-w-xs"
        />
        <div className="flex flex-col md:flex-row items-center gap-2 w-full md:w-auto">
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-full md:w-auto"><SelectValue placeholder="All Time" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
            </SelectContent>
          </Select>

            {/* Conditional filters for ONLINE mode */}
            
          {mode === "online" && (
            <>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-auto"><SelectValue placeholder="All Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="paymentPending">Payment Pending</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="printed">Printed</SelectItem>
                  <SelectItem value="packed">Packed</SelectItem>
                  <SelectItem value="shipped">Shipped</SelectItem>
                </SelectContent>
              </Select>
              <Select value={hasTrackingFilter} onValueChange={setHasTrackingFilter}>
                <SelectTrigger className="w-full md:w-auto"><SelectValue placeholder="All Tracking" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tracking</SelectItem>
                  <SelectItem value="true">With Tracking</SelectItem>
                  <SelectItem value="false">Without Tracking</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="w-full md:w-auto"><SelectValue placeholder="All Sources" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value="Instagram">Instagram</SelectItem>
                  <SelectItem value="Facebook">Facebook</SelectItem>
                  <SelectItem value="YouTube">YouTube</SelectItem>
                  <SelectItem value="Website">Website</SelectItem>
                  <SelectItem value="Referral">Referral</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </>
          )}
          <Button variant="destructive" onClick={() => setIsDeleteAllModalOpen(true)} disabled={bills.length === 0}>
              Delete All Bills
          </Button>
        </div>
      </div>

      {/* --- FINAL, CORRECTED BILLS TABLE --- */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bill No</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date & Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                {mode === 'online' && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
              )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase min-w-[200px]">Order Details</th>
                {mode === 'offline' ? (
                  <>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount Paid</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Balance</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                  </>
                  ) : (
                <>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tracking Info</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                </>
                  )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {bills.map((bill) => (
                <tr key={bill.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{bill.billNo}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div>{formatDate(bill.date)}</div>
                    <div className="text-xs">{bill.time}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="font-medium text-gray-900">{bill.customer.name}</div>
                    <div>{bill.customer.phone}</div>
                  </td>
                  {mode === 'online' && (
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{bill.salesSource || '-'}</td>
                )}
                
                <td className="px-6 py-4 text-sm text-gray-500">
                    {bill.items.map(item => <div key={item.id}>{item.SKU || 'N/A'} × {item.quantity} = ₹{item.totalPrice.toFixed(2)}</div>)}
                    {bill.shipping && <div className="font-semibold mt-1">Shipping: {bill.shipping.methodName} (₹{bill.shipping.totalCost.toFixed(2)})</div>}
                    <div className="font-bold text-gray-800 mt-1">Total: ₹{bill.totalPrice.toFixed(2)}</div>
                </td>

                  {/* --- FIXED: The conditional rendering for columns --- */}
                  {mode === 'offline' ? (
                    <>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{bill.paymentMethod}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right">₹{bill.amountPaid?.toFixed(2)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right">₹{bill.balance?.toFixed(2)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{bill.notes || '-'}</td>
                    </>
                  ) : (
                    <>
                      {/* This is the online status cell */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-600">Payment:</span>
                          <Select
                            value={bill.paymentStatus}
                            onValueChange={(newStatus: string) => { if (newStatus) { handlePaymentStatusChange(bill.id, newStatus); }}}
                            disabled={isLoading}
                          >
                            <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue placeholder="Select Status" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="PENDING">Pending</SelectItem>
                              <SelectItem value="PAID">Paid</SelectItem>
                              <SelectItem value="FAILED">Failed</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                            <span className="font-medium text-gray-600">Order:</span>
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full uppercase ${
                              bill.status === 'paymentPending' ? 'bg-orange-100 text-orange-800' :
                              bill.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                              bill.status === 'shipped' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>{bill.status}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{bill.trackingNumber || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{bill.notes || '-'}</td>
                    </>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex items-center space-x-2">
                      <Button size="sm" variant="destructive" onClick={() => { setBillToDelete(bill.id); setIsDeleteModalOpen(true); }}>Delete</Button>
                      {mode === 'online' && (bill.status === 'processing' || bill.status === 'paymentPending') && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setBillToEdit(bill);
                          setIsEditModalOpen(true);
                        }}
                      >
                        Edit
                      </Button>
                    )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Responsive Pagination Controls */}
      <div className="mt-4 space-y-3 sm:space-y-0 sm:flex sm:justify-between sm:items-center">
        <div className="text-sm text-gray-600 text-center sm:text-left">
          Showing {(currentPage - 1) * pageSize + 1} to{' '}
          {Math.min(currentPage * pageSize, totalCount)} of {totalCount} bills
        </div>
        <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-2">
          <div className="flex items-center space-x-2 w-full sm:w-auto justify-center">
            <Button
              variant="secondary"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1 || isLoading}
              className="w-24 sm:w-auto"
            >
              Previous
            </Button>
            <div className="text-sm">
              <span className="hidden sm:inline">Page </span>
              {currentPage} / {Math.ceil(totalCount / pageSize)}
            </div>
            <Button
              variant="secondary"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= Math.ceil(totalCount / pageSize) || isLoading}
              className="w-24 sm:w-auto"
            >
              Next
            </Button>
          </div>
        </div>
        {isEditModalOpen && (
          <EditBillModal
            isOpen={isEditModalOpen}
            onClose={() => {
              setIsEditModalOpen(false);
              setBillToEdit(null);
            }}
            bill={billToEdit}
            onSave={handleUpdateBill}
          />
        )}

        {/* Delete confirmation modal */}
        {isDeleteModalOpen && (
          <Modal
            isOpen={isDeleteModalOpen}
            onClose={() => setIsDeleteModalOpen(false)}
            title="Confirm Delete"
          >
            <div className="p-6">
              <p>Are you sure you want to delete this bill?</p>
              <div className="mt-4 flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setIsDeleteModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleDelete(billToDelete!)}
                  disabled={isLoading}
                >
                  {isLoading ? 'Deleting...' : 'Delete'}
                </Button>
              </div>
            </div>
          </Modal>
        )}
        
        {/* Delete all confirmation modal */}
        {isDeleteAllModalOpen && (
          <Modal
            isOpen={isDeleteAllModalOpen}
            onClose={() => setIsDeleteAllModalOpen(false)}
            title="Confirm Delete All"
          >
            <div className="p-6">
              <p>Are you sure you want to delete all bills?</p>
              <div className="mt-4 flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setIsDeleteAllModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeleteAll}
                  disabled={isLoading}
                >
                  {isLoading ? 'Deleting...' : 'Delete All'}
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </>
  );
}