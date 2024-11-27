import { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useDebounce } from '@/hooks/useDebounce';
import type { BillItem } from '@/types/billing';
import React from 'react';

interface Product {
  id: number;
  name: string;
  SKU: string;
  sellingPrice: number;
  quantity: number;
}

interface ProductRow {
  id: string;
  productId: number | null;
  productName: string;
  availableQuantity: number;
  sellingPrice: number;
  quantity: number;
  total: number;
  productOptions: Product[];
}

interface ProductTableProps {
  onChange: (items: BillItem[]) => void;
}

export function ProductTable({ onChange }: ProductTableProps) {
  const [rows, setRows] = useState<ProductRow[]>([{
    id: Math.random().toString(36).substring(2, 9),
    productId: null,
    productName: '',
    availableQuantity: 0,
    sellingPrice: 0,
    quantity: 1,
    total: 0,
    productOptions: [],
  }]);
  
  const [searchTerm, setSearchTerm] = useState<{ id: string; term: string }>({ id: '', term: '' });
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

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

  const handleInputChange = (rowId: string, value: string) => {
    setRows(prevRows =>
      prevRows.map(row =>
        row.id === rowId ? { ...row, productName: value } : row
      )
    );
    
    handleProductSearch(rowId, value);
  };
  
  const handleProductSearch = async (rowId: string, query: string) => {
    try {
      const response = await fetch(`/api/products?sku=${encodeURIComponent(query)}`);
      if (!response.ok) throw new Error('Search failed');
  
      const products = await response.json();
      
      setRows(prevRows =>
        prevRows.map(row =>
          row.id === rowId
            ? { ...row, productOptions: products }
            : row
        )
      );
    } catch (error) {
      console.error('Product search error:', error);
    }
  };

  const handleProductSelect = (rowId: string, product: Product) => {
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
  };

  const handleQuantityChange = (rowId: string, quantityStr: string) => {
    const quantity = parseInt(quantityStr, 10);
    if (isNaN(quantity) || quantity < 0) return;

    setRows((prevRows) =>
      prevRows.map((row) =>
        row.id === rowId
          ? {
              ...row,
              quantity,
              total: row.sellingPrice * quantity,
            }
          : row
      )
    );
  };

  const addRow = () => {
    const newRow: ProductRow = {
      id: Math.random().toString(36).substring(2, 9),
      productId: null,
      productName: '',
      availableQuantity: 0,
      sellingPrice: 0,
      quantity: 1,
      total: 0,
      productOptions: [],
    };
    setRows((prevRows) => [...prevRows, newRow]);
  };

  const removeRow = (id: string) => {
    if (rows.length > 1) {
      setRows((prevRows) => prevRows.filter((row) => row.id !== id));
    }
  };

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
                  type="text"
                  placeholder="Search product..."
                  value={row.productName}
                  onChange={(e) => handleInputChange(row.id, e.target.value)}
                />
                {row.productOptions.length > 0 && (
                  <ul className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
                    {row.productOptions.map((product) => (
                      <li
                        key={product.id}
                        className="p-2 hover:bg-gray-100 cursor-pointer"
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
      </table>
      <Button variant="secondary" onClick={addRow}>
        Add Product
      </Button>
    </div>
  );
}