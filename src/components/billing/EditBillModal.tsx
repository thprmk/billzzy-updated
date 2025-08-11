// src/components/billing/EditBillModal.tsx

import React, { useMemo, useRef, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { ProductTable, ProductTableRef, BillItem } from './ProductTable';
import { toast } from 'react-toastify';

// This interface should match the one in ProductTable.tsx
// I've added 'id' which might be missing.
interface BillItemForModal extends BillItem {
    id?: number;
}

interface EditBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  bill: any;
  onSave: (items: BillItem[]) => Promise<void>;
}

export function EditBillModal({ isOpen, onClose, bill, onSave }: EditBillModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const productTableRef = useRef<ProductTableRef>(null);

  const handleSave = async () => {
    // Check if the ref and getItems function exist before calling
    if (!productTableRef.current || typeof productTableRef.current.getItems !== 'function') {
        toast.error("Cannot get items from table. Ref is not set.");
        return;
    }
    
    const currentItems = productTableRef.current.getItems();
    if (!currentItems || currentItems.length === 0) {
      toast.error('Please add at least one product to save.');
      return;
    }

    setIsLoading(true);
    try {
      await onSave(currentItems);
      onClose(); // Close modal on successful save
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save changes. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // This is the correct pattern.
  // We use useMemo to calculate the items to display.
  // This avoids the timing issue caused by useEffect and useState.
  const initialTableItems = useMemo(() => {
    if (!bill || !bill.items) {
        return [];
    }

    return bill.items.map((item: any): BillItemForModal | null => {
      const pricePerItem = item.totalPrice / item.quantity;
      if (item.productVariant) {
        const variant = item.productVariant;
        const parentProduct = variant.product;
        return {
          id: variant.id, 
          productVariantId: variant.id, 
          productId: parentProduct.id,
          name: `${parentProduct.name} - ${variant.size || ''} ${variant.color || ''}`.trim(),
          SKU: variant.SKU, 
          quantity: item.quantity, 
          price: pricePerItem,
          availableQuantity: variant.quantity, 
          total: item.totalPrice,
        };
      } else if (item.product) {
        const product = item.product;
        return {
          id: product.id, 
          productId: product.id, 
          name: product.name, 
          SKU: product.SKU,
          quantity: item.quantity, 
          price: pricePerItem,
          availableQuantity: product.quantity, 
          total: item.totalPrice,
          productVariantId: null,
        };
      }
      return null;
    }).filter(Boolean) as BillItemForModal[];
  }, [bill]); // This hook correctly depends only on the 'bill' prop.

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Edit Bill" 
      className="max-w-3xl w-full mx-4 md:mx-auto"
    >
      <div className="space-y-4 p-4">
        {bill && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="bg-gray-50 p-3 rounded">
                <p className="font-medium text-gray-700">Bill No:</p>
                <p className="text-gray-900">{bill.companyBillNo || bill.billNo}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <p className="font-medium text-gray-700">Customer:</p>
                <p className="text-gray-900">{bill.customer?.name}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <p className="font-medium text-gray-700">Total Amount:</p>
                <p className="text-gray-900">₹{bill.totalPrice}</p>
              </div>
            </div>

            <div className="mt-6">
              <ProductTable
                key={bill.id} // The key is ESSENTIAL for re-mounting the component.
                ref={productTableRef}
                initialItems={initialTableItems} // Pass the directly calculated items.
                onChange={() => {}} // No longer need to sync state upwards.
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t mt-6">
              <Button 
                variant="outline" 
                onClick={onClose} 
                disabled={isLoading}
                className="px-6"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSave} 
                disabled={isLoading}
                className="px-6"
              >
                {isLoading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}