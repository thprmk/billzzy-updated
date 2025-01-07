// components/settings/ShippingSettings.tsx
'use client';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Switch } from '@/components/ui/Switch';
import { toast } from 'react-toastify';
import React from 'react';

interface ShippingMethod {
  id?: number;
  name: string;
  type: 'FREE_SHIPPING' | 'COURIER_PARTNER';
  minAmount?: number;
  useWeight: boolean;
  ratePerKg?: number;
  fixedRate?: number; // Added for fixed rate
  isActive: boolean;
}

export function ShippingSettings() {
  const [methods, setMethods] = useState<ShippingMethod[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState<number | null>(null);

  useEffect(() => {
    fetchShippingMethods();
  }, []);

  const fetchShippingMethods = async () => {
    try {
      const response = await fetch('/api/settings/shipping/methods');
      if (response.ok) {
        const data = await response.json();
        setMethods(data);
      }
    } catch (error) {
      toast.error('Failed to fetch shipping methods');
    }
  };

  const addNewMethod = () => {
    const newMethod: ShippingMethod = {
      name: '',
      type: 'COURIER_PARTNER',
      useWeight: false,
      isActive: true,
    };
    setMethods([...methods, newMethod]);
    setIsEditing(methods.length);
  };

  const handleMethodDelete = async (id: number) => {
    try {
      const response = await fetch(`/api/settings/shipping/methods?id=${id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setMethods(methods.filter(m => m.id !== id));
        toast.success('Shipping method deleted');
      } else {
        toast.error('Failed to delete shipping method');
      }
    } catch (error) {
      toast.error('Failed to delete shipping method');
    }
  };

  const handleMethodSave = async (method: ShippingMethod, index: number) => {
    if (!method.name) {
      toast.error('Please enter a method name');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/settings/shipping/methods', {
        method: method.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(method),
      });

      if (!response.ok) throw new Error('Failed to save shipping method');
      
      const savedMethod = await response.json();
      const updatedMethods = [...methods];
      updatedMethods[index] = savedMethod;
      setMethods(updatedMethods);
      setIsEditing(null);
      
      toast.success('Shipping method saved successfully');
    } catch (error) {
      toast.error('Failed to save shipping method');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="bg-white p-6 rounded-lg border">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-medium">Current Shipping Methods</h3>
          <Button onClick={addNewMethod}>Add New Method</Button>
        </div>

        <div className="divide-y">
          {methods.map((method, index) => (
            <div key={index} className="py-4">
              {isEditing === index ? (
                <div className="space-y-4">
                  <Input
                    label="Method Name"
                    value={method.name}
                    onChange={(e) => {
                      const updated = [...methods];
                      updated[index] = { ...method, name: e.target.value };
                      setMethods(updated);
                    }}
                  />

                  <Select
                    label="Shipping Type"
                    value={method.type}
                    onChange={(e) => {
                      const updated = [...methods];
                      updated[index] = { 
                        ...method, 
                        type: e.target.value as ShippingMethod['type']
                      };
                      // Reset fields if type changes
                      if (e.target.value === 'FREE_SHIPPING') {
                        updated[index].useWeight = false;
                        updated[index].ratePerKg = undefined;
                        updated[index].fixedRate = undefined;
                      }
                      setMethods(updated);
                    }}
                  >
                    <option value="FREE_SHIPPING">Free Shipping</option>
                    <option value="COURIER_PARTNER">Courier Partner</option>
                  </Select>

                  {method.type === 'FREE_SHIPPING' && (
                    <Input
                      type="number"
                      label="Minimum Order Amount (optional)"
                      value={method.minAmount || ''}
                      onChange={(e) => {
                        const updated = [...methods];
                        updated[index] = { 
                          ...method, 
                          minAmount: e.target.value ? parseFloat(e.target.value) : undefined 
                        };
                        setMethods(updated);
                      }}
                    />
                  )}

                  {method.type === 'COURIER_PARTNER' && (
                    <>
                      <Switch
                        label="Use Weight-based Pricing"
                        checked={method.useWeight}
                        onChange={(checked) => {
                          const updated = [...methods];
                          updated[index] = { 
                            ...method, 
                            useWeight: checked,
                            // If switching to weight-based, clear fixedRate
                            // If switching off weight-based, clear ratePerKg
                            ratePerKg: checked ? method.ratePerKg : undefined,
                            fixedRate: checked ? undefined : method.fixedRate
                          };
                          setMethods(updated);
                        }}
                      />

                      {method.useWeight ? (
                        <Input
                          type="number"
                          label="Rate per KG"
                          value={method.ratePerKg || ''}
                          onChange={(e) => {
                            const updated = [...methods];
                            updated[index] = { 
                              ...method, 
                              ratePerKg: e.target.value ? parseFloat(e.target.value) : undefined
                            };
                            setMethods(updated);
                          }}
                        />
                      ) : (
                        <Input
                          type="number"
                          label="Fixed Shipping Rate"
                          value={method.fixedRate || ''}
                          onChange={(e) => {
                            const updated = [...methods];
                            updated[index] = { 
                              ...method, 
                              fixedRate: e.target.value ? parseFloat(e.target.value) : undefined
                            };
                            setMethods(updated);
                          }}
                        />
                      )}
                    </>
                  )}

                  <Switch
                    label="Active"
                    checked={method.isActive}
                    onChange={(checked) => {
                      const updated = [...methods];
                      updated[index] = { ...method, isActive: checked };
                      setMethods(updated);
                    }}
                  />

                  <div className="flex justify-end space-x-4">
                    <Button
                      variant="secondary"
                      onClick={() => setIsEditing(null)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={() => handleMethodSave(method, index)}
                      isLoading={isLoading}
                    >
                      Save Method
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-medium">{method.name}</h4>
                    <p className="text-sm text-gray-600">
                      {method.type === 'FREE_SHIPPING' ? (
                        method.minAmount
                          ? `Free shipping for orders above ₹${method.minAmount}`
                          : 'Completely free shipping'
                      ) : method.useWeight ? 
                        `Weight-based: ₹${method.ratePerKg}/kg` : 
                        `Fixed rate: ₹${method.fixedRate}`
                      }
                    </p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <Switch
                      checked={method.isActive}
                      onChange={(checked) => {
                        const updated = [...methods];
                        updated[index] = { ...method, isActive: checked };
                        setMethods(updated);
                        handleMethodSave(updated[index], index);
                      }}
                      label="Active"
                    />
                    <Button
                      variant="secondary"
                      onClick={() => setIsEditing(index)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => method.id && handleMethodDelete(method.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
