'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import Link from 'next/link';
import { Modal } from '@/components/ui/Modal';
import { toast } from 'react-toastify';
import React from 'react';  // Add this import
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

interface Product {
  id: number;
  name: string;
  SKU: string;
  netPrice: number;
  sellingPrice: number;
  quantity: number;
  category?: {
    name: string;
    id: number;
  };
}

export default function ViewProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const fetchProducts = async (categoryId?: string) => {

    try {
      const url = categoryId ? `/api/products?category=${categoryId}` : '/api/products';
      const response = await fetch(url);
      const data = await response.json();

      setProducts(data);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCategories = async () => {
    const response = await fetch('/api/categories');
    const data = await response.json();
    setCategories(data);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
      const response = await fetch(`/api/products/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchProducts(selectedCategory);
        toast.success('Product deleted successfully');

      } else {
        alert('Failed to delete product');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to delete product');
    }
  };

  const handleEdit = async (product: Product) => {
    setEditingProduct(product);
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    try {
      const response = await fetch(`/api/products/${editingProduct.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editingProduct),
      });

      
      console.log(response);

      if (response.ok) {
        setShowEditModal(false);
        toast.success('Product updated successfully');
        fetchProducts(selectedCategory);
      } else {
        toast.error('Failed to update');
      }

    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to update');
    }
  };

  console.log(products);
  

  if (isLoading||!products) return <div className='h-[100vh] w-[100%]  flex items-center justify-center'><LoadingSpinner/></div>;

  return (
    <div className="space-y-6 md:mt-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl hidden md:block font-bold">Products</h1>
        <div className="flex space-x-4">
          <Link href="/products/add">
            <Button>Add Product</Button>
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <Select
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              fetchProducts(e.target.value);
            }}
            className="w-48"
          >
            <option value="">All Categories</option>
            {categories.map((cat: any) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="overflow-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  SKU
                </th>
             
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Selling Price
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Stock
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Category
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {(products).map((product) => (
                <tr key={product.id}>
                  <td className="px-6 py-4 whitespace-nowrap">{product.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{product.SKU}</td>
                 
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    ₹{product.sellingPrice}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    {product.quantity}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {product.category?.name || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="flex justify-center space-x-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleEdit(product)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(product.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Product"
      >
        {editingProduct && (
  <form onSubmit={handleEditSubmit} className="space-y-4">
    <div>
      <label htmlFor="productName" className="block text-sm font-medium mb-1">
        Product Name
      </label>
      <input
        id="productName"
        type="text"
        value={editingProduct.name}
        onChange={(e) =>
          setEditingProduct({ ...editingProduct, name: e.target.value })
        }
        className="w-full p-2 border rounded"
        placeholder="Product Name"
      />
    </div>

    <div>
      <label htmlFor="sku" className="block text-sm font-medium mb-1">
        SKU
      </label>
      <input
        id="sku"
        type="text"
        value={editingProduct.SKU}
        onChange={(e) =>
          setEditingProduct({ ...editingProduct, SKU: e.target.value })
        }
        className="w-full p-2 border rounded"
        placeholder="SKU"
      />
    </div>

    <div>
      <label htmlFor="netPrice" className="block text-sm font-medium mb-1">
        Net Price
      </label>
      <input
        id="netPrice"
        type="number"
        value={editingProduct.netPrice}
        onChange={(e) =>
          setEditingProduct({
            ...editingProduct,
            netPrice: parseFloat(e.target.value),
          })
        }
        className="w-full p-2 border rounded"
        placeholder="Net Price"
      />
    </div>

    <div>
      <label htmlFor="sellingPrice" className="block text-sm font-medium mb-1">
        Selling Price
      </label>
      <input
        id="sellingPrice"
        type="number"
        value={editingProduct.sellingPrice}
        onChange={(e) =>
          setEditingProduct({
            ...editingProduct,
            sellingPrice: parseFloat(e.target.value),
          })
        }
        className="w-full p-2 border rounded"
        placeholder="Selling Price"
      />
    </div>

    <div>
      <label htmlFor="quantity" className="block text-sm font-medium mb-1">
        Quantity
      </label>
      <input
        id="quantity"
        type="number"
        value={editingProduct.quantity}
        onChange={(e) =>
          setEditingProduct({
            ...editingProduct,
            quantity: parseInt(e.target.value),
          })
        }
        className="w-full p-2 border rounded"
        placeholder="Quantity"
      />
    </div>

    <div>
      <label htmlFor="category" className="block text-sm font-medium mb-1">
        Category
      </label>
      <Select
        id="category"
        value={editingProduct.category?.id || ''}
        onChange={(e) =>
          setEditingProduct({
            ...editingProduct,
            category: { 
              id: parseInt(e.target.value), 
              name: categories.find((c: any) => c.id === parseInt(e.target.value))?.name || '' 
            },
          })
        }
      >
        <option value="">Select Category</option>
        {categories.map((cat: any) => (
          <option key={cat.id} value={cat.id}>
            {cat.name}
          </option>
        ))}
      </Select>
    </div>

    <div className="flex justify-end space-x-2">
      <Button
        type="button"
        variant="secondary"
        onClick={() => setShowEditModal(false)}
      >
        Cancel
      </Button>
      <Button type="submit">
        Save Changes
      </Button>
    </div>
  </form>
)}
      </Modal>
    </div>
  );
}


// 468
// 471
// 473
// 472