'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import React from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Switch } from '@/components/ui/Switch';
import { Label } from '@/components/ui/label'; // A good practice for accessibility
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

type Tax = {
  id?: number; // Tax might have an ID from the database
  name: string;
  type: 'Percentage' | 'Fixed';
  value: number;
  autoApply: boolean;
};

export const TaxSettings = () => {
  const [tax, setTax] = useState<Tax | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchTaxSettings = async () => {
      setIsLoading(true);
      try {
        const res = await axios.get('/api/settings/tax');
        // If tax settings exist, use them. Otherwise, create a default structure.
        if (res.data.tax) {
          setTax(res.data.tax);
        } else {
          setTax({ name: 'GST', type: 'Percentage', value: 0, autoApply: false });
        }
      } catch (err) {
        console.error(err);
        toast.error("Failed to load tax settings.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchTaxSettings();
  }, []);

  const handleChange = (field: keyof Tax, value: any) => {
    if (!tax) return;
    setTax(prev => (prev ? { ...prev, [field]: value } : null));
  };

  const saveTax = async () => {
    if (!tax) return;
    setIsSaving(true);
    try {
      await axios.post('/api/settings/tax', tax);
      toast.success('Tax settings saved successfully!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to save tax settings.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-48"><LoadingSpinner /></div>;
  }
  
  if (!tax) {
    return <div className="text-center p-8 text-gray-500">Could not load tax settings.</div>;
  }

  return (
    <div className="space-y-8">
      {/* --- Section 1: Main Tax Configuration --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Side: Title and Description */}
        <div className="md:col-span-1">
          <h2 className="text-lg font-semibold text-gray-800">Tax Configuration</h2>
          <p className="mt-1 text-sm text-gray-500">
            Set up the primary tax rate for your store. This can be auto-applied to all transactions.
          </p>
        </div>

        {/* Right Side: Form Fields */}
        <div className="md:col-span-2">
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <Label htmlFor="taxName">Tax Name</Label>
                <Input
                  id="taxName"
                  type="text"
                  name="name"
                  value={tax.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className="mt-1"
                  placeholder="e.g., GST, VAT"
                />
              </div>
              <div>
                <Label htmlFor="taxValue">Value ({tax.type === 'Percentage' ? '%' : '₹'})</Label>
                <Input
                  id="taxValue"
                  type="number"
                  name="value"
                  value={tax.value}
                  onChange={(e) => handleChange('value', parseFloat(e.target.value) || 0)}
                  className="mt-1"
                  placeholder={tax.type === 'Percentage' ? "e.g., 18" : "e.g., 50"}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="taxType">Tax Type</Label>
              <Select value={tax.type} onValueChange={(value: 'Percentage' | 'Fixed') => handleChange('type', value)}>
                <SelectTrigger id="taxType" className="mt-1">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Percentage">Percentage (%)</SelectItem>
                  <SelectItem value="Fixed">Fixed Amount (₹)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center space-x-2 pt-2">
              <Switch
                id="autoApply"
                checked={tax.autoApply}
                onCheckedChange={(checked) => handleChange('autoApply', checked)}
              />
              <Label htmlFor="autoApply" className="cursor-pointer">
                Auto-apply this tax to all bills
              </Label>
            </div>
          </div>
          
          <div className="flex justify-end pt-6 mt-6 border-t">
            <Button onClick={saveTax} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};