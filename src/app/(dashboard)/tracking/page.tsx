// app/tracking/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from 'react-toastify';

interface BillDetails {
  id: number;
  billNo: number;
  customer: {
    name: string;
    phone: string;
    district?: string;
    state?: string;
    pincode?: string;
  };
  items: Array<{
    productName: string;
    quantity: number;
    totalPrice: number;
  }>;
  totalPrice: number;
  date: string;
  time: string;
  trackingNumber?: string | null;
  weight?: number | null;
}

export default function TrackingPage() {
  const router = useRouter();
  const [billId, setBillId] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [weight, setWeight] = useState('');
  const [billDetails, setBillDetails] = useState<BillDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!billId || !trackingNumber) {
      toast.error('Please enter tracking number');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/billing/tracking`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            billId:billId,
          trackingNumber,
          weight: weight ? parseFloat(weight) : null,
          status: 'sent' // Update status as per your requirements
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }

      toast.success('Tracking details updated successfully');
      router.push('/tracking');
    } catch (error) {
      toast.error('Failed to update tracking details');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Enter Tracking Details</h1>

        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          <div className="p-6">
            {/* Bill ID Search */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bill ID
              </label>
              <div className="flex gap-4">
                <Input
                  type="text"
                  value={billId}
                  onChange={(e) => setBillId(e.target.value)}
                  placeholder="Enter Bill ID"
                  className="flex-1"
                />
              </div>
 
            </div>



                {/* Tracking Form */}
                <form onSubmit={handleSubmit}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tracking Number
                      </label>
                      <Input
                        type="text"
                        value={trackingNumber}
                        onChange={(e) => setTrackingNumber(e.target.value)}
                        required
                        placeholder="Enter tracking number"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Weight (kg)
                      </label>
                      <Input
                        type="number"
                        step="0.01"
                        value={weight}
                        onChange={(e) => setWeight(e.target.value)}
                        placeholder="Enter weight (optional)"
                      />
                    </div>

                    <div className="flex justify-end space-x-3 pt-4">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => router.push('/billing/online')}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        isLoading={isLoading}
                      >
                        Save Tracking Details
                      </Button>
                    </div>
                  </div>
                </form>

          </div>
        </div>
      </div>
    </div>
  );
}