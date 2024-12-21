'use client';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useState, useEffect } from 'react';
import React from 'react';

interface Product {
  id: number;
  SKU: string;
  name: string;
  quantity: number;
  verified: boolean;
}

interface PackingBill {
  billNo: number;
  products: Product[];
  allVerified: boolean;
}

export default function PackingModule() {
  const [billNo, setBillNo] = useState('');
  const [SKU, setSKU] = useState('');
  const [currentBill, setCurrentBill] = useState<PackingBill | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Initialize isManualMode to false for consistent SSR
  const [isManualMode, setIsManualMode] = useState<boolean>(false);
  const [isHydrated, setIsHydrated] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedMode = localStorage.getItem('isManualMode');
      if (storedMode !== null) {
        setIsManualMode(JSON.parse(storedMode));
      }
      setIsHydrated(true);
    }
  }, []);

  const focusBillInput = () => {
    const billInput = document.getElementById('billInput');
    if (billInput) {
      (billInput as HTMLInputElement).focus();
      (billInput as HTMLInputElement).select();
    }
  };

  const focusSKUInput = () => {
    const skuInput = document.getElementById('skuInput');
    if (skuInput) {
      (skuInput as HTMLInputElement).focus();
      (skuInput as HTMLInputElement).select();
    }
  };

  useEffect(() => {
    focusBillInput();
  }, [isHydrated]); // Ensure focus after hydration
  // Alternatively, you can have a separate useEffect to focus after hydration

  const handleBillNoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setBillNo(value);

    if (value.length >= 2 && !isManualMode) {
      fetchBillDetails(value);
    }
  };

  const fetchBillDetails = async (billNumber: string) => {
    if (!billNumber) return;

    try {
      setIsLoading(true);
      setError('');

      const response = await fetch(`/api/packing/packingId/${billNumber}`);
      if (!response.ok) {
        throw new Error('Failed to fetch bill details');
      }

      const data = await response.json();
      setCurrentBill({
        billNo: data.billNo,
        products: data.products.map((p: any) => ({ ...p, verified: false })),
        allVerified: false
      });
      setBillNo('');
      setTimeout(focusSKUInput, 100);

    } catch (error) {
      console.error('Fetch error:', error);
      setError('Error fetching bill details. Please try again.');
      setBillNo('');
      focusBillInput();
    } finally {
      setIsLoading(false);
    }
  };

  const handleSKUChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase();
    setSKU(value);

    if (value.length >= 2 && !isManualMode) {
      verifySKU(value);
    }
  };

  const verifySKU = async (skuValue: string) => {
    if (!currentBill || !skuValue) return;

    const product = currentBill.products.find(p => p.SKU === skuValue && !p.verified);
    console.log(product);
    
    if (!product) {
      setError('Invalid SKU or product already verified');
      // playErrorSound();
      setSKU('');
      focusSKUInput();
      return;
    }

    try {
      setIsLoading(true);
      setError('');

      const updatedProducts = currentBill.products.map(p => 
        p.SKU === skuValue ? { ...p, verified: true } : p
      );

      const allVerified = updatedProducts.every(p => p.verified);
      
      setCurrentBill({
        ...currentBill,
        products: updatedProducts,
        allVerified
      });

      setSKU('');
      // playSuccessSound();

      if (allVerified) {
        console.log('triggered');
        
        try {
          const response = await fetch(`/api/packing/packingComplete/${currentBill.billNo}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
          });

          if (!response.ok) {
            throw new Error('Failed to update packing status');
          }
          console.log(response);
          
          // Display success message and reload page after a delay
          setTimeout(() => {
            window.location.reload();
          }, 200);
          
        } catch (error) {
          console.error('Error updating packing status:', error);
          focusSKUInput();
        }
      } else {
        // Continue with next SKU verification
        setTimeout(() => {
          focusSKUInput();
        }, 100);
      }

    } catch (error) {
      setError('Error verifying SKU. Please try again.');
      console.error('Verification error:', error);
      focusSKUInput();
    } finally {
      setIsLoading(false);
    }
  };

  const playSuccessSound = () => {
    const audio = new Audio('/sounds/success.mp3');
    audio.play().catch(() => {});
  };

  const playErrorSound = () => {
    const audio = new Audio('/sounds/error.mp3');
    audio.play().catch(() => {});
  };

  const handleManualModeToggle = () => {
    setIsManualMode((prev) => {
      const newMode = !prev;
      // Update localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('isManualMode', JSON.stringify(newMode));
      }
      // Reset states
      setError('');
      setBillNo('');
      setSKU('');
      setCurrentBill(null);
      focusBillInput();
      return newMode;
    });
  };

  // Handle bill number submission
  const handleBillSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (billNo.length >= 2) {
      fetchBillDetails(billNo);
    } else {
      setError('Bill number must be at least 2 characters.');
      focusBillInput();
    }
  };

  // Handle SKU submission
  const handleSKUSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (SKU.length >= 2) {
      verifySKU(SKU);
    } else {
      setError('SKU must be at least 3 characters.');
      focusSKUInput();
    }
  };

  // If not hydrated, avoid rendering to prevent mismatch
  if (!isHydrated) {
    return null; // Or a loading spinner
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Packing Verification</h2>
          <Button
            onClick={handleManualModeToggle}
            variant="outline"
            size="sm"
          >
            {isManualMode ? 'Scanner Mode' : 'Manual Mode'}
          </Button>
        </div>

        {/* Bill Number Section */}
        <form onSubmit={isManualMode ? handleBillSubmit : undefined} className="flex gap-4 mb-6">
          <Input
            id="billInput"
            type="text"
            placeholder={isManualMode ? "Enter Bill Number" : "Scan Bill Number"}
            value={billNo}
            onChange={handleBillNoChange}
            className="flex-1"
            disabled={isLoading || (!isManualMode && currentBill !== null)}
          />
          {isManualMode && (
            <Button
              type="submit"
              disabled={isLoading || !billNo}
              className="px-8 w-[150px]"
            >
              Fetch Bill
            </Button>
          )}
        </form>

        {/* SKU Section */}
        {currentBill && (
          <form onSubmit={isManualMode ? handleSKUSubmit : undefined}>
            <Input
              id="skuInput"
              type="text"
              placeholder={isManualMode ? "Enter SKU" : "Scan SKU"}
              value={SKU}
              onChange={handleSKUChange}
              className="w-full"
              disabled={isLoading || currentBill.allVerified}
            />
          </form>
        )}

        {currentBill && (
          <div className="space-y-4">
            <div className="mt-4">
              <h3 className="font-semibold mb-2">Products to Pack:</h3>
              <div className="space-y-2">
                {currentBill.products
                  .filter(product => !product.verified)
                  .map((product) => (
                    <div
                      key={product.SKU}
                      className="p-3 rounded-lg border border-gray-200 bg-white"
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="font-medium">{product.name}</span>
                        </div>
                        <div className="text-sm">Qty: {product.quantity}</div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            <div className="mt-4">
              <h3 className="font-semibold mb-2">Verified Products:</h3>
              <div className="space-y-2">
                {currentBill.products
                  .filter(product => product.verified)
                  .map((product) => (
                    <div
                      key={product.SKU}
                      className="p-3 rounded-lg border border-green-200 bg-green-50"
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="font-medium">{product.name}</span>
                          <span className="text-sm text-gray-500 ml-2">
                            (SKU: {product.SKU})
                          </span>
                        </div>
                        <div className="text-sm">
                          Qty: {product.quantity} ✓
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {currentBill.allVerified && (
              <div className="mt-4 p-4 bg-green-50 text-green-700 rounded-lg">
                <p className="font-semibold">All products verified successfully!</p>
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-lg">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
