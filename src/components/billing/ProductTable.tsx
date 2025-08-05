// components/billing/ProductTable.tsx
'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useDebounce } from '@/hooks/useDebounce';
import { toast } from 'react-toastify';
import { LoadingSpinner } from '../ui/LoadingSpinner';

// --- INTERFACES ---
interface ProductVariant {
  id: number;
  SKU: string;
  sellingPrice: number;
  quantity: number;
  size?: string;
  color?: string;
}

export interface Product {
  id: number;
  name: string;
  productType: 'STANDARD' | 'BOUTIQUE';
  SKU: string | null;
  sellingPrice: number | null;
  quantity: number | null;
  variants?: ProductVariant[];
  availableQuantity?: number;
}

export interface BillItem {
  productId: number | null;
  productVariantId: number | null;
  name?: string;
  quantity: number;
  price: number;
  total: number;
  SKU?: string;
  availableQuantity?: number;
}

interface ProductRow {
  id: string;
  productId: number | null;
  productVariantId: number | null;
  productName: string;
  availableQuantity: number;
  sellingPrice: number;
  quantity: number;
  total: number;
  productOptions: Product[];
  SKU?: string;
}

interface ProductTableProps {
  onChange: (items: BillItem[]) => void;
  maxRows?: number;
  onCreateBill?: () => void;
  initialItems?: BillItem[];
}

export interface ProductTableRef {
  resetTable: () => void;
  focusFirstProductInput: () => void;
}

function createInitialRow(): ProductRow {
  return {
    id: Math.random().toString(36).substring(2, 9),
    productId: null, productVariantId: null, productName: '',
    availableQuantity: 0, sellingPrice: 0, quantity: 1,
    total: 0, productOptions: [], SKU: '',
  };
}

// --- MAIN COMPONENT ---
export const ProductTable = React.forwardRef<ProductTableRef, ProductTableProps>(
  ({ onChange, maxRows = 20, onCreateBill, initialItems }, ref) => {
    const [rows, setRows] = useState<ProductRow[]>([createInitialRow()]);
    const [loading, setLoading] = useState<{ [key: string]: boolean }>({});
    const [searchTerm, setSearchTerm] = useState<{ id: string; term: string }>({ id: '', term: '' });
    const [selectedOptionIndex, setSelectedOptionIndex] = useState<number>(-1);
    const inputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

    const [isVariantModalOpen, setIsVariantModalOpen] = useState(false);
    const [selectedBoutiqueProduct, setSelectedBoutiqueProduct] = useState<Product | null>(null);
    const [activeRowId, setActiveRowId] = useState<string | null>(null);

    const debouncedSearchTerm = useDebounce(searchTerm, 300);

    const totalAmount = useMemo(() => {
      return rows.reduce((sum, row) => sum + (row.total || 0), 0);
    }, [rows]);

    useEffect(() => {
      if (debouncedSearchTerm.term) {
        handleProductSearch(debouncedSearchTerm.id, debouncedSearchTerm.term);
      }
    }, [debouncedSearchTerm]);

    const handleProductSearch = async (rowId: string, query: string) => {
      if (!query || query.length < 2) return;
      setLoading(prev => ({ ...prev, [rowId]: true }));
      try {
        const response = await fetch(`/api/products/search?search=${encodeURIComponent(query)}`);
        if (!response.ok) throw new Error('Search failed');
        const products = await response.json();
        setRows(prevRows => prevRows.map(row => row.id === rowId ? { ...row, productOptions: products } : row));
      } catch (error: any) {
        toast.error('Failed to search products');
      } finally {
        setLoading(prev => ({ ...prev, [rowId]: false }));
      }
    };

    const handleInputChange = useCallback((rowId: string, value: string) => {
      setRows(prevRows =>
        prevRows.map(row =>
          row.id === rowId ? { 
            ...createInitialRow(), // Reset the row but keep the id
            id: row.id,
            productName: value, 
          } : row
        )
      );
      setSearchTerm({ id: rowId, term: value });
      setSelectedOptionIndex(-1);
    }, []);

    const handleProductSelect = useCallback((rowId: string, product: Product) => {
      if (product.productType === 'BOUTIQUE') {
        setSelectedBoutiqueProduct(product);
        setActiveRowId(rowId);
        setIsVariantModalOpen(true);
      } else {
        const productPrice = product.sellingPrice || 0;
        setRows((prevRows) => {
          const updatedRows = prevRows.map((row) =>
            row.id === rowId ? {
              ...row,
              productId: product.id, productVariantId: null,
              productName: product.name, availableQuantity: product.quantity || 0,
              sellingPrice: productPrice, quantity: 1, total: productPrice,
              productOptions: [], SKU: product.SKU || '',
            } : row
          );
          if (!updatedRows.some(r => !r.productId && !r.productVariantId)) {
            if (updatedRows.length < maxRows) return [...updatedRows, createInitialRow()];
          }
          return updatedRows;
        });
      }
      setSelectedOptionIndex(-1);
    }, [maxRows]);

    const handleVariantSelect = (variant: ProductVariant) => {
      if (!activeRowId || !selectedBoutiqueProduct) return;
      const productPrice = variant.sellingPrice || 0;
      setRows((prevRows) => {
        const updatedRows = prevRows.map((row) =>
          row.id === activeRowId ? {
            ...row,
            productId: selectedBoutiqueProduct.id, productVariantId: variant.id,
            productName: `${selectedBoutiqueProduct.name} (${variant.size || variant.color || 'Variant'})`,
            availableQuantity: variant.quantity, sellingPrice: productPrice,
            quantity: 1, total: productPrice,
            productOptions: [], SKU: variant.SKU,
          } : row
        );
        if (!updatedRows.some(r => !r.productId && !r.productVariantId)) {
          if (updatedRows.length < maxRows) return [...updatedRows, createInitialRow()];
        }
        return updatedRows;
      });
      setIsVariantModalOpen(false);
      setSelectedBoutiqueProduct(null);
      setActiveRowId(null);
    };

    const handleQuantityChange = useCallback((rowId: string, quantityStr: string) => {
      const quantity = parseInt(quantityStr, 10);
      if (isNaN(quantity) || quantity < 0) return;
      setRows((prevRows) =>
        prevRows.map((row) => {
          if (row.id !== rowId) return row;
          const finalQuantity = row.availableQuantity && quantity > row.availableQuantity ? row.availableQuantity : quantity;
          if (finalQuantity !== quantity) toast.error(`Only ${row.availableQuantity} units available`);
          return { ...row, quantity: finalQuantity, total: (row.sellingPrice || 0) * finalQuantity };
        })
      );
    }, []);

    const handleKeyDown = useCallback((e: React.KeyboardEvent, rowId: string) => {
      const row = rows.find(r => r.id === rowId);
      if (!row) return;
      const options = row.productOptions || [];
      switch (e.key) {
        case 'ArrowDown': e.preventDefault(); setSelectedOptionIndex(prev => prev < options.length - 1 ? prev + 1 : prev); break;
        case 'ArrowUp': e.preventDefault(); setSelectedOptionIndex(prev => prev > 0 ? prev - 1 : prev); break;
        case 'Enter':
          e.preventDefault();
          if (options.length > 0 && selectedOptionIndex >= 0 && options[selectedOptionIndex]) {
            handleProductSelect(rowId, options[selectedOptionIndex]);
          } else if (onCreateBill) {
            onCreateBill();
          }
          break;
        case 'Escape': setRows(prev => prev.map(r => r.id === rowId ? { ...r, productOptions: [] } : r)); setSelectedOptionIndex(-1); break;
      }
    }, [rows, selectedOptionIndex, handleProductSelect, onCreateBill]);

    const removeRow = useCallback((id: string) => {
      setRows((prevRows) => prevRows.length === 1 ? prevRows : prevRows.filter(row => row.id !== id));
    }, []);

    useEffect(() => {
      const items: BillItem[] = rows
        .filter((row) => (row.productId || row.productVariantId) && row.quantity > 0)
        .map((row) => ({
          productId: row.productId, productVariantId: row.productVariantId,
          name: row.productName, quantity: row.quantity,
          price: row.sellingPrice || 0, total: row.total || 0,
          SKU: row.SKU, availableQuantity: row.availableQuantity
        }));
      onChange(items);
    }, [rows, onChange]);

    const resetTable = useCallback(() => { setRows([createInitialRow()]); onChange([]); }, [onChange]);
    const focusFirstProductInput = useCallback(() => {
      if (rows[0]?.id && inputRefs.current[rows[0].id]) {
        inputRefs.current[rows[0].id]?.focus();
      }
    }, [rows]);

    React.useImperativeHandle(ref, () => ({ resetTable, focusFirstProductInput }));

    return (
      <div className="space-y-4">
        <div className="hidden md:block">
          <table className="min-w-full bg-white border">
            <thead>
              <tr>
                <th className="px-4 py-2 border">Product</th><th className="px-4 py-2 border">Available</th>
                <th className="px-4 py-2 border">Quantity</th><th className="px-4 py-2 border">Price</th>
                <th className="px-4 py-2 border">Total</th><th className="px-4 py-2 border"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-2 border relative">
                    <input
                      ref={(el) => { inputRefs.current[row.id] = el; }}
                      type="text"
                      className='outline rounded outline-gray-200 w-full p-2'
                      placeholder="Search product..."
                      value={row.productName}
                      onChange={(e) => handleInputChange(row.id, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, row.id)}
                      disabled={!!row.productVariantId}
                    />
                    {loading[row.id] && <div className="absolute right-3 top-3"><LoadingSpinner /></div>}
                    {row.productOptions.length > 0 && (
                      <ul className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
                        {row.productOptions.map((product, index) => (
                          <li
                            key={product.id}
                            className={`p-2 cursor-pointer ${index === selectedOptionIndex ? 'bg-gray-100' : 'hover:bg-gray-100'}`}
                            onClick={() => handleProductSelect(row.id, product)}
                          >
                            <div className="flex justify-between">
                              <span>{product.name}</span>
                              <span>{product.productType === 'BOUTIQUE' ? 'Multiple Prices' : `₹${(product.sellingPrice || 0).toFixed(2)}`}</span>
                            </div>
                            <div className="text-sm text-gray-500">
                              {product.productType === 'BOUTIQUE'
                                ? <span className="font-semibold text-blue-600">Has Variants</span>
                                : `SKU: ${product.SKU} | Stock: ${product.quantity}`}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </td>
                  <td className="px-4 py-2 border text-center">{row.availableQuantity}</td>
                  <td className="px-4 py-2 border">
                    <Input
                      type="number" min="1" max={row.availableQuantity}
                      value={row.quantity} onChange={(e) => handleQuantityChange(row.id, e.target.value)}
                      disabled={!row.productId && !row.productVariantId}
                    />
                  </td>
                  <td className="px-4 py-2 border text-right">₹{(row.sellingPrice || 0).toFixed(2)}</td>
                  <td className="px-4 py-2 border text-right">₹{(row.total || 0).toFixed(2)}</td>
                  <td className="px-4 py-2 border text-center">
                    {rows.length > 1 && <Button variant="destructive" size="sm" onClick={() => removeRow(row.id)}>Remove</Button>}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4} className="px-4 py-2 border text-right font-bold">Total Amount:</td>
                <td className="px-4 py-2 border text-right font-bold">₹{(totalAmount || 0).toFixed(2)}</td>
                <td className="px-4 py-2 border"></td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* --- YOUR FULL MOBILE VIEW IS RESTORED HERE --- */}
        <div className="md:hidden">
          <div className="space-y-4">
            {rows.map((row) => (
              <div key={row.id} className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-4 relative">
                  <input
                    ref={(el) => { inputRefs.current[row.id] = el; }}
                    type="text"
                    className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Search product..."
                    value={row.productName}
                    onChange={(e) => handleInputChange(row.id, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, row.id)}
                    disabled={!!row.productVariantId}
                  />
                  {loading[row.id] && <div className="absolute right-6 top-6"><LoadingSpinner /></div>}
                  {row.productOptions.length > 0 && (
                    <ul className="absolute z-10 left-4 right-4 mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
                      {row.productOptions.map((product, index) => (
                        <li
                          key={product.id}
                          className={`p-3 border-b last:border-b-0 ${index === selectedOptionIndex ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
                          onClick={() => handleProductSelect(row.id, product)}
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-medium">{product.name}</span>
                            <span className="text-blue-600">{product.productType === 'BOUTIQUE' ? 'Multiple Prices' : `₹${(product.sellingPrice || 0).toFixed(2)}`}</span>
                          </div>
                          <div className="text-sm text-gray-500 mt-1">
                            {product.productType === 'BOUTIQUE'
                              ? <span className="font-semibold text-blue-600">Has Variants</span>
                              : `SKU: ${product.SKU} • Stock: ${product.quantity}`}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="px-4 pb-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-3 rounded-md">
                      <label className="text-sm text-gray-500 block mb-1">Available</label>
                      <span className="font-medium">{row.availableQuantity}</span>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-md">
                      <label className="text-sm text-gray-500 block mb-1">Quantity</label>
                      <Input
                        type="number" min="1" max={row.availableQuantity}
                        value={row.quantity} onChange={(e) => handleQuantityChange(row.id, e.target.value)}
                        disabled={!row.productId && !row.productVariantId}
                        className="w-full"
                      />
                    </div>
                    <div className="bg-gray-50 p-3 rounded-md">
                      <label className="text-sm text-gray-500 block mb-1">Price</label>
                      <span className="font-medium">₹{(row.sellingPrice || 0).toFixed(2)}</span>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-md">
                      <label className="text-sm text-gray-500 block mb-1">Total</label>
                      <span className="font-medium">₹{(row.total || 0).toFixed(2)}</span>
                    </div>
                  </div>
                  {rows.length > 1 && (
                    <div className="mt-4 flex justify-end">
                      <Button variant="destructive" size="sm" onClick={() => removeRow(row.id)} className="w-full sm:w-auto">
                        Remove
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-gray-700">Total Amount</span>
                <span className="text-lg font-bold text-blue-600">₹{(totalAmount || 0).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        <SelectVariantModal
          isOpen={isVariantModalOpen}
          onClose={() => setIsVariantModalOpen(false)}
          product={selectedBoutiqueProduct}
          onSelectVariant={handleVariantSelect}
        />
      </div>
    );
  }
);

ProductTable.displayName = 'ProductTable';

// --- MODAL COMPONENT (Correctly placed outside the main component) ---
interface SelectVariantModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  onSelectVariant: (variant: ProductVariant) => void;
}

const SelectVariantModal: React.FC<SelectVariantModalProps> = ({ isOpen, onClose, product, onSelectVariant }) => {
  if (!isOpen || !product) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="text-lg font-semibold">Select Variant for {product.name}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-2xl font-bold">×</button>
        </div>
        <div className="p-4 max-h-[60vh] overflow-y-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2">SKU</th><th className="px-4 py-2">Size</th>
                <th className="px-4 py-2">Color</th><th className="px-4 py-2 text-right">Price</th>
                <th className="px-4 py-2 text-right">Stock</th>
              </tr>
            </thead>
            <tbody>
              {product.variants && product.variants.length > 0 ? (
                product.variants.map((variant) => (
                  <tr key={variant.id} onClick={() => onSelectVariant(variant)} className="cursor-pointer hover:bg-gray-100 border-b">
                    <td className="px-4 py-2 font-medium">{variant.SKU}</td>
                    <td className="px-4 py-2">{variant.size || '-'}</td>
                    <td className="px-4 py-2">{variant.color || '-'}</td>
                    <td className="px-4 py-2 text-right">₹{variant.sellingPrice.toFixed(2)}</td>
                    <td className="px-4 py-2 text-right">{variant.quantity}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="text-center p-4 text-gray-500">No variants found for this product.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};