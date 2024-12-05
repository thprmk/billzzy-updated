// components/ProductTable/types.ts
export interface Product {
  id: number;
  name: string;
  SKU: string;
  sellingPrice: number;
  quantity: number;
}

export interface BillItem {
  productId: number;
  quantity: number;
  price: number;
  total: number;
}

export interface ProductRow {
  id: string;
  productId: number | null;
  productName: string;
  availableQuantity: number;
  sellingPrice: number;
  quantity: number;
  total: number;
  productOptions: Product[];
}

export interface ProductTableProps {
  onChange: (items: BillItem[]) => void;
  maxRows?: number;
}

// components/ProductTable/ProductTable.tsx
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useDebounce } from '@/hooks/useDebounce';
import { toast } from 'react-toastify';
// import type { Product, BillItem, ProductRow, ProductTableProps } from './types';
import React from "react";
import { LoadingSpinner } from '../ui/LoadingSpinner';

export function ProductTable({ onChange, maxRows = 20 }: ProductTableProps) {
  const [rows, setRows] = useState<ProductRow[]>([createInitialRow()]);
  const [loading, setLoading] = useState<{ [key: string]: boolean }>({});
  const [searchTerm, setSearchTerm] = useState<{ id: string; term: string }>({ id: '', term: '' });
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number>(-1);
  const inputRefs = useRef<{ [key: string]: HTMLInputElement }>({});
  
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  function createInitialRow(): ProductRow {
    return {
      id: generateRowId(),
      productId: null,
      productName: '',
      availableQuantity: 0,
      sellingPrice: 0,
      quantity: 1,
      total: 0,
      productOptions: [],
    };
  }

  function generateRowId(): string {
    return Math.random().toString(36).substring(2, 9);
  }

  const totalAmount = useMemo(() => {
    return rows.reduce((sum, row) => sum + row.total, 0);
  }, [rows]);

  useEffect(() => {
    if (debouncedSearchTerm.term) {
      handleProductSearch(debouncedSearchTerm.id, debouncedSearchTerm.term);
    }
  }, [debouncedSearchTerm]);

  useEffect(() => {
    const items = rows
      .filter((row) => row.productId && row.quantity > 0)
      .map((row) => ({
        productId: row.productId!,
        quantity: row.quantity,
        price: row.sellingPrice,
        total: row.total,
      }));
    onChange(items);
  }, [rows, onChange]);

  const handleInputChange = useCallback((rowId: string, value: string) => {
    setRows(prevRows =>
      prevRows.map(row =>
        row.id === rowId ? { ...row, productName: value } : row
      )
    );
    
    setSearchTerm({ id: rowId, term: value });
    setSelectedOptionIndex(-1);
  }, []);

  const handleProductSearch = async (rowId: string, query: string) => {
    if (!query || query.length < 2) return;

    setLoading(prev => ({ ...prev, [rowId]: true }));

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(
        `/api/products?search=${encodeURIComponent(query)}`,
        { signal: controller.signal }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const products = await response.json();
      
      setRows(prevRows =>
        prevRows.map(row =>
          row.id === rowId
            ? { ...row, productOptions: products.slice(0, 10) }
            : row
        )
      );
    } catch (error) {
      if (error.name === 'AbortError') {
        toast.error('Search request timed out. Please try again.');
      } else {
        toast.error('Failed to search products. Please try again.');
        console.error('Product search error:', error);
      }
    } finally {
      setLoading(prev => ({ ...prev, [rowId]: false }));
    }
  };

  const handleProductSelect = useCallback((rowId: string, product: Product) => {
    setRows((prevRows) =>
      prevRows.map((row) =>
        row.id === rowId
          ? {
              ...row,
              productId: product.id,
              productName: product.name,
              availableQuantity: product.quantity,
              sellingPrice: product.sellingPrice,
              quantity: 1,
              total: product.sellingPrice,
              productOptions: [],
            }
          : row
      )
    );

    setSelectedOptionIndex(-1);

    // Focus quantity input after selection
    setTimeout(() => {
      const nextRow = document.querySelector(`input[type="number"][min="1"]`);
      if (nextRow instanceof HTMLInputElement) {
        nextRow.focus();
        nextRow.select();
      }
    }, 0);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent, rowId: string) => {
    const options = rows.find(r => r.id === rowId)?.productOptions || [];
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedOptionIndex(prev => 
          prev < options.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedOptionIndex(prev => prev > 0 ? prev - 1 : prev);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedOptionIndex >= 0 && options[selectedOptionIndex]) {
          handleProductSelect(rowId, options[selectedOptionIndex]);
        }
        break;
      case 'Escape':
        setRows(prevRows =>
          prevRows.map(row =>
            row.id === rowId ? { ...row, productOptions: [] } : row
          )
        );
        setSelectedOptionIndex(-1);
        break;
    }
  }, [rows, selectedOptionIndex, handleProductSelect]);

  const handleQuantityChange = useCallback((rowId: string, quantityStr: string) => {
    const quantity = parseInt(quantityStr, 10);
    if (isNaN(quantity) || quantity < 0) return;

    setRows((prevRows) =>
      prevRows.map((row) => {
        if (row.id !== rowId) return row;
        
        if (quantity > row.availableQuantity) {
          toast.error(`Only ${row.availableQuantity} units available`);
          return row;
        }

        return {
          ...row,
          quantity,
          total: row.sellingPrice * quantity,
        };
      })
    );
  }, []);

  const addRow = useCallback(() => {
    if (rows.length >= maxRows) {
      toast.error(`Maximum ${maxRows} products allowed`);
      return;
    }

    const newRow = createInitialRow();
    setRows((prevRows) => [...prevRows, newRow]);
    
    setTimeout(() => {
      inputRefs.current[newRow.id]?.focus();
    }, 0);
  }, [rows.length, maxRows]);

  const removeRow = useCallback((id: string) => {
    if (rows.length > 1) {
      setRows((prevRows) => prevRows.filter((row) => row.id !== id));
    }
  }, [rows.length]);

  return (
    <div className="space-y-4">
      <table className="min-w-full bg-white border">
        <thead>
          <tr>
            <th className="px-4 py-2 border">Product</th>
            <th className="px-4 py-2 border">Available</th>
            <th className="px-4 py-2 border">Quantity</th>
            <th className="px-4 py-2 border">Price</th>
            <th className="px-4 py-2 border">Total</th>
            <th className="px-4 py-2 border"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td className="px-4 py-2 border relative">
                <Input
                  ref={(el) => (inputRefs.current[row.id] = el!)}
                  type="text"
                  placeholder="Search product..."
                  value={row.productName}
                  onChange={(e) => handleInputChange(row.id, e.target.value.toUpperCase())}
                  onKeyDown={(e) => handleKeyDown(e, row.id)}
                  // disabled={loading[row.id]}
                />
                {loading[row.id] && (
                  <div className="absolute right-3 top-3">
                    <LoadingSpinner />
                  </div>
                )}
                {row.productOptions.length > 0 && (
                  <ul className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
                    {row.productOptions.map((product, index) => (
                      <li
                        key={product.id}
                        className={`p-2 cursor-pointer ${
                          index === selectedOptionIndex ? 'bg-gray-100' : 'hover:bg-gray-100'
                        }`}
                        onClick={() => handleProductSelect(row.id, product)}
                      >
                        <div className="flex justify-between">
                          <span>{product.name}</span>
                          <span>₹{product.sellingPrice.toFixed(2)}</span>
                        </div>
                        <div className="text-sm text-gray-500">
                          SKU: {product.SKU} | Stock: {product.quantity}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </td>
              <td className="px-4 py-2 border text-center">
                {row.availableQuantity}
              </td>
              <td className="px-4 py-2 border">
                <Input
                  type="number"
                  min="1"
                  max={row.availableQuantity}
                  value={row.quantity}
                  onChange={(e) => handleQuantityChange(row.id, e.target.value)}
                  disabled={!row.productId}
                />
              </td>
              <td className="px-4 py-2 border text-right">
                ₹{row.sellingPrice.toFixed(2)}
              </td>
              <td className="px-4 py-2 border text-right">
                ₹{row.total.toFixed(2)}
              </td>
              <td className="px-4 py-2 border text-center">
                {rows.length > 1 && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => removeRow(row.id)}
                  >
                    Remove
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={4} className="px-4 py-2 border text-right font-bold">
              Total Amount:
            </td>
            <td className="px-4 py-2 border text-right font-bold">
              ₹{totalAmount.toFixed(2)}
            </td>
            <td className="px-4 py-2 border"></td>
          </tr>
        </tfoot>
      </table>
      <div className="flex justify-between">
        <Button 
          variant="secondary" 
          onClick={addRow}
          disabled={rows.length >= maxRows}
        >
          Add Product
        </Button>
        {rows.length >= maxRows && (
          <p className="text-sm text-red-500">
            Maximum {maxRows} products allowed
          </p>
        )}
      </div>
    </div>
  );
}