'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import {Input} from '../ui/Input';
import {Button} from '../ui/Button';
import { ProductSearch } from '../ui/ProductSearch';
import { CustomerSearch } from '../ui/CustomerSearch';

interface Product {
  id: number;
  name: string;
  SKU: string;
  sellingPrice: number;
  quantity: number;
}

interface BillItem {
  product: Product;
  quantity: number;
  total: number;
}

export default function OnlineBillForm() {
  const { data: session } = useSession();
  const [items, setItems] = useState<BillItem[]>([]);
  const [customer, setCustomer] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + item.total, 0);
  };

  const handleAddProduct = (product: Product) => {
    setItems(prev => {
      const existingItem = prev.find(item => item.product.id === product.id);
      if (existingItem) {
        return prev.map(item =>
          item.product.id === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
                total: (item.quantity + 1) * item.product.sellingPrice
              }
            : item
        );
      }
      return [...prev, { product, quantity: 1, total: product.sellingPrice }];
    });
  };

  const handleQuantityChange = (productId: number, quantity: number) => {
    setItems(prev =>
      prev.map(item =>
        item.product.id === productId
          ? {
              ...item,
              quantity,
              total: quantity * item.product.sellingPrice
            }
          : item
      )
    );
  };

  const handleRemoveItem = (productId: number) => {
    setItems(prev => prev.filter(item => item.product.id !== productId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/billing/online', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: customer?.id,
          items: items.map(item => ({
            productId: item.product.id,
            quantity: item.quantity,
            price: item.product.sellingPrice,
            total: item.total
          })),
          total: calculateTotal(),
          organisationId: session?.user?.id
        })
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.message);

      // Handle success (e.g., show invoice, clear form)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create bill');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 text-red-500 p-3 rounded">
          {error}
        </div>
      )}

      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium mb-4">Customer Details</h3>
        <CustomerSearch
          onSelect={setCustomer}
          onCreate={setCustomer}
        />

        {customer && (
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Name
              </label>
              <div className="mt-1">{customer.name}</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Phone
              </label>
              <div className="mt-1">{customer.phone}</div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium mb-4">Products</h3>
        <ProductSearch onSelect={handleAddProduct} />

        {items.length > 0 && (
          <div className="mt-4">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {items.map((item) => (
                  <tr key={item.product.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {item.product.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => 
                          handleQuantityChange(
                            item.product.id, 
                            parseInt(e.target.value)
                          )
                        }
                        className="w-20"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      ₹{item.product.sellingPrice}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      ₹{item.total}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleRemoveItem(item.product.id)}
                      >
                        Remove
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3} className="px-6 py-4 text-right font-medium">
                    Total:
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap font-medium">
                    ₹{calculateTotal()}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <Button
          type="submit"
          isLoading={isLoading}
          disabled={!customer || items.length === 0}
        >
          Generate Bill
        </Button>
      </div>
    </form>
  );
}