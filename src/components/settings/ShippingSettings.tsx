'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Switch } from '@/components/ui/Switch';
import { toast } from 'react-toastify';
import React from 'react';
import { PlusCircle, Trash2 } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'; 
import { Label } from '@/components/ui/label'; 

// --- INTERFACES ---
interface ShippingMethod {
  id?: number;
  name: string;
  type: 'FREE_SHIPPING' | 'COURIER_PARTNER' | 'CUSTOM_SHIPPING';
  minAmount?: number | null;
  useWeight: boolean;
  ratePerKg?: number | null;
  fixedRate?: number | null;
  customRate?: number | null;
  isActive: boolean;
}

// --- MAIN COMPONENT ---
export function ShippingSettings() {
  const [methods, setMethods] = useState<ShippingMethod[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | 'new' | null>(null);

  // --- DATA FETCHING ---
  useEffect(() => {
    fetchShippingMethods();
  }, []);

  const fetchShippingMethods = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/settings/shipping/methods');
      if (!response.ok) throw new Error('Failed to fetch methods');
      const data = await response.json();
      setMethods(data);
    } catch (error) {
      toast.error('Failed to fetch shipping methods');
    } finally {
      setIsLoading(false);
    }
  };
  
  // --- EVENT HANDLERS ---
  const handleAddNew = () => {
    // Create a temporary unique ID for the new method for key and state tracking
    const tempId = Date.now();
    const newMethod: ShippingMethod = {
      id: tempId,
      name: '',
      type: 'COURIER_PARTNER',
      useWeight: false,
      isActive: true,
    };
    setMethods(prev => [newMethod, ...prev]);
    setEditingId(tempId);
  };
  
  const handleCancelEdit = (methodId: number | undefined) => {
    if (methodId === undefined) return;
    // If it was a new, unsaved method, remove it from the list
    if (String(methodId).length > 10) { // Simple check for temp ID
      setMethods(methods.filter(m => m.id !== methodId));
    }
    setEditingId(null);
  };

  const handleUpdateField = (id: number | undefined, field: keyof ShippingMethod, value: any) => {
    if (id === undefined) return;
    setMethods(prevMethods =>
      prevMethods.map(m => (m.id === id ? { ...m, [field]: value } : m))
    );
  };

  const handleSave = async (method: ShippingMethod) => {
    if (!method.name.trim()) return toast.error('Method name is required.');
    
    setIsSaving(true);
    const isNew = String(method.id).length > 10;
    const payload = isNew ? { ...method, id: undefined } : method;

    try {
      const response = await fetch('/api/settings/shipping/methods', {
        method: isNew ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error('Failed to save method');
      
      toast.success(`Shipping method ${isNew ? 'added' : 'updated'} successfully!`);
      setEditingId(null);
      await fetchShippingMethods();
    } catch (error) {
      toast.error('Failed to save shipping method');
    } finally {
      setIsSaving(false);
    }
  };


  const handleDelete = async (id: number | undefined) => {
    if (id === undefined) return;
    if (!window.confirm('Are you sure you want to delete this shipping method?')) return;
    
    setIsSaving(true);
    try {
      const response = await fetch(`/api/settings/shipping/methods?id=${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete method');
      
      toast.success('Shipping method deleted');
      await fetchShippingMethods();
    } catch (error) {
      toast.error('Failed to delete shipping method');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (methodToToggle: ShippingMethod, newStatus: boolean) => {
    setMethods(prev => 
      prev.map(m => 
        m.id === methodToToggle.id ? { ...m, isActive: newStatus } : m
      )
    );
  
    const updatedMethod = { ...methodToToggle, isActive: newStatus };
  
    try {
      const response = await fetch('/api/settings/shipping/methods', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedMethod),
      });
  
      if (!response.ok) {
        toast.error('Failed to update status.');
        // Revert on failure
        setMethods(prev => 
          prev.map(m => 
            m.id === methodToToggle.id ? { ...m, isActive: !newStatus } : m
          )
        );
      }
    } catch (error) {
      toast.error('Failed to update status.');
      // Revert on error
      setMethods(prev => 
        prev.map(m => 
          m.id === methodToToggle.id ? { ...m, isActive: !newStatus } : m
        )
      );
    }
  };

  // --- RENDER ---
  if (isLoading) {
    return <div className="flex justify-center items-center h-48"><LoadingSpinner /></div>;
  }
  
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">Shipping Methods</h2>
          <p className="mt-1 text-sm text-gray-500">
            Define how you charge for shipping at checkout.
          </p>
        </div>
        <Button onClick={handleAddNew} disabled={isSaving || editingId !== null}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Method
        </Button>
      </div>

      <div className="space-y-4">

          {methods.map((method) => (
            <div key={method.id}>
              <ShippingMethodCard
                method={method}
                isEditing={editingId === method.id}
                onEdit={() => setEditingId(method.id)}
                onCancel={() => handleCancelEdit(method.id)}
                onSave={() => handleSave(method)}
                onDelete={() => handleDelete(method.id)}
                onUpdateField={(field, value) => handleUpdateField(method.id, field, value)}
                onToggleActive={(newStatus) => handleToggleActive(method, newStatus)}
                isLoading={isSaving}
              />
            </div>
          ))}
     
        
        {methods.length === 0 && (
          <div className="text-center py-16 border-2 border-dashed border-gray-300 rounded-lg text-gray-500">
            <p>No shipping methods found.</p>
            <p className="text-sm mt-1">Click "Add Method" to create your first one.</p>
          </div>
        )}
      </div>
    </div>
  );
}


// --- SUB-COMPONENT for the Card ---
function ShippingMethodCard({ method, isEditing, onEdit, onCancel, onSave, onDelete, onUpdateField,  onToggleActive, isLoading }: {
  method: ShippingMethod;
  isEditing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
  onDelete: () => void;
  onUpdateField: (field: keyof ShippingMethod, value: any) => void;
  onToggleActive: (newStatus: boolean) => void;
  isLoading: boolean;
}) {

  const getMethodDescription = (m: ShippingMethod) => {
    switch (m.type) {
      case 'FREE_SHIPPING':
        return m.minAmount ? `Free shipping on orders over ₹${m.minAmount}` : 'Free for all orders';
      case 'COURIER_PARTNER':
        return m.useWeight ? `Weight-based rate at ₹${m.ratePerKg || 0}/kg` : `Fixed rate of ₹${m.fixedRate || 0}`;
      case 'CUSTOM_SHIPPING':
        return `Custom flat rate of ₹${m.customRate || 0}`;
      default:
        return '';
    }
  };

  return (
    <div className="rounded-lg border bg-white shadow-sm">
      {!isEditing ? (
        // --- READ MODE ---
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Switch
              id={`active-${method.id}`}
              checked={method.isActive}
              onCheckedChange={(checked) => onToggleActive(checked)}
            />
            <div>
              <Label htmlFor={`active-${method.id}`} className="font-semibold text-gray-800 cursor-pointer">{method.name || 'Untitled Method'}</Label>
              <p className="text-sm text-gray-500">{getMethodDescription(method)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onEdit}>Edit</Button>
            <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={onDelete}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        // --- EDIT MODE ---
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <Label className="block text-sm font-medium mb-1">Method Name</Label>
              <Input value={method.name} onChange={(e) => onUpdateField('name', e.target.value)} placeholder="e.g., Standard Shipping" />
            </div>
            <div>
              <Label className="block text-sm font-medium mb-1">Shipping Type</Label>
              <Select value={method.type} onValueChange={(v: ShippingMethod['type']) => {
                const updatedFields = { 
                  type: v, 
                  useWeight: false, 
                  ratePerKg: null, 
                  fixedRate: null, 
                  minAmount: null, 
                  customRate: v === 'CUSTOM_SHIPPING' ? 0 : null
                };
                Object.entries(updatedFields).forEach(([field, value]) => onUpdateField(field as keyof ShippingMethod, value));
              }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="FREE_SHIPPING">Free Shipping</SelectItem>
                  <SelectItem value="COURIER_PARTNER">Rate-based Shipping</SelectItem>
                  <SelectItem value="CUSTOM_SHIPPING">Custom Flat Rate</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

    
            <div className="mt-6 space-y-4">
              {method.type === 'FREE_SHIPPING' && (
                <div>
                  <Label className="block text-sm font-medium mb-1">Minimum Order Amount (optional)</Label>
                  <Input type="number" value={method.minAmount || ''} onChange={(e) => onUpdateField('minAmount', e.target.value ? parseFloat(e.target.value) : null)} placeholder="e.g., 500" />
                </div>
              )}
              {method.type === 'COURIER_PARTNER' && (
                <div className="space-y-4 rounded-md border p-4 bg-gray-50/50">
                  <div className="flex items-center gap-2">
                    <Switch checked={method.useWeight} onCheckedChange={(c) => onUpdateField('useWeight', c)} id={`useWeight-${method.id}`} />
                    <Label htmlFor={`useWeight-${method.id}`} className="font-medium cursor-pointer">Use Weight-based Pricing</Label>
                  </div>
                  {method.useWeight ? (
                    <div>
                      <Label className="block text-sm font-medium mb-1">Rate per KG (₹)</Label>
                      <Input type="number" value={method.ratePerKg || ''} onChange={(e) => onUpdateField('ratePerKg', e.target.value ? parseFloat(e.target.value) : null)} placeholder="e.g., 50" />
                    </div>
                  ) : (
                    <div>
                      <Label className="block text-sm font-medium mb-1">Fixed Shipping Rate (₹)</Label>
                      <Input type="number" value={method.fixedRate || ''} onChange={(e) => onUpdateField('fixedRate', e.target.value ? parseFloat(e.target.value) : null)} placeholder="e.g., 100" />
                    </div>
                  )}
                </div>
              )}
              {method.type === 'CUSTOM_SHIPPING' && (
                <div>
                  <Label className="block text-sm font-medium mb-1">Custom Shipping Rate (₹)</Label>
                  <Input type="number" value={method.customRate || ''} onChange={(e) => onUpdateField('customRate', e.target.value ? parseFloat(e.target.value) : null)} placeholder="e.g., 250" />
                </div>
              )}
            </div>


          <div className="flex justify-end gap-2 pt-6 mt-6 border-t">
            <Button variant="secondary" onClick={onCancel}>Cancel</Button>
            <Button onClick={onSave} disabled={isLoading}>{isLoading ? 'Saving...' : 'Save Method'}</Button>
          </div>
        </div>
      )}
    </div>
  );
}