'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';

import Link from 'next/link';
import { Modal } from '@/components/ui/Modal';
import { toast } from 'react-toastify';
import React from 'react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import ShopifyImportButton from '@/components/products/ShopifyImportButton'; 

interface Product {
  id: number;
  name: string;
  productType: 'STANDARD' | 'BOUTIQUE';
  SKU: string;
  netPrice: number;
  sellingPrice: number;
  quantity: number;
  category?: {
    name: string;
    id: number;
  };
}

interface Category {
    id: number;
    name: string;
}

export default function ViewProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [searchTerm, setSearchTerm] = useState(''); 
  const [isLoading, setIsLoading] = useState(true);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const fetchProducts = async (categoryId?: string, search?: string) => {
    setIsLoading(true);
    try {
      // Use URLSearchParams to build the URL cleanly
      const params = new URLSearchParams();
      if (categoryId) params.append('category', categoryId);
      if (search) params.append('search', search);

      const url = `/api/products?${params.toString()}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch products');
      const data = await response.json();
      setProducts(data);
    } catch (error: any) {
        toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories');
      if (!response.ok) throw new Error('Failed to fetch categories');
      const data = await response.json();
      setCategories(data);
    } catch (error: any) {
        toast.error(error.message);
    }
  };

  useEffect(() => {
    // Debounce: Wait 300ms after the user stops typing before fetching
    const handler = setTimeout(() => {
      fetchProducts(selectedCategory, searchTerm);
    }, 300);

    // Cleanup function: Cancel the timeout if the user types again
    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm, selectedCategory]); // Re-run when search or category changes

  // This useEffect fetches categories only once
  useEffect(() => {
    fetchCategories();
  }, []);

  const handleDelete = async (id: number) => {
    // Using a custom modal for confirmation is better than `window.confirm`
    if (!window.confirm('Are you sure you want to delete this product?')) return;

    try {
      const response = await fetch(`/api/products/${id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        toast.success('Product deleted successfully');
        fetchProducts(selectedCategory);
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to delete product');
      }
    } catch (error) {
      toast.error('Failed to delete product');
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setShowEditModal(true);
  };
  
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    try {
      const response = await fetch(`/api/products/${editingProduct.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            ...editingProduct,
            categoryId: editingProduct.category?.id ? Number(editingProduct.category.id) : null
        }),
      });

      if (response.ok) {
        setShowEditModal(false);
        toast.success('Product updated successfully');
        fetchProducts(selectedCategory);
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to update product');
      }
    } catch (error) {
      toast.error('Failed to update product');
    }
  };

  // Callback for the import button to refresh the list
  const handleImportComplete = () => {
    fetchProducts(selectedCategory);
  };

  if (isLoading && products.length === 0) return (
    <div className='h-screen w-full flex items-center justify-center'>
      <LoadingSpinner />
    </div>
  );

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <h1 className="text-2xl font-bold">Products</h1>
        <div className="flex items-center space-x-2">
           {/* --- NEW IMPORT BUTTON AND ADD BUTTON --- */}
          <ShopifyImportButton onImportComplete={handleImportComplete} />
          <Link href="/products/add">
            <Button variant="primary">Add Product</Button>
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md">
      <div className="p-4 border-b flex flex-col md:flex-row items-center gap-4">
      <div className="relative w-full md:w-auto md:flex-grow">
          <Input
            type="search"
            placeholder="Search by name or SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pr-8"
          />

{isLoading && (
      <div className="absolute inset-y-0 right-0 flex items-center pr-3">
        <LoadingSpinner className="h-4 w-4 text-gray-400" />
      </div>
    )}
  </div>
          <Select
            value={selectedCategory}
            onValueChange={(value) => {
              const categoryId = value === "all" ? "" : value;
              setSelectedCategory(categoryId);
            }}
          >
            <SelectTrigger className="w-full md:w-64">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={String(cat.id)}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Selling Price</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Stock</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {products.map((product) => (
                <tr key={product.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {product.name}
                    {product.productType === 'BOUTIQUE' && (
                      <span className="ml-2 text-xs font-semibold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
                        Boutique
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {product.productType === 'BOUTIQUE' 
                      ? <span className="text-gray-400">Multiple</span> 
                      : product.SKU
                    }
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    {product.productType === 'BOUTIQUE' 
                      ? <span className="text-gray-400">See Variants</span> 
                      : `₹${product.sellingPrice?.toFixed(2) ?? '0.00'}`
                    }
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    {product.productType === 'BOUTIQUE' 
                      ? <span className="text-gray-400">Multiple</span> 
                      : product.quantity
                    }
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">{product.category?.name || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="flex justify-center space-x-2">
                       {/* --- STEP 3: DISABLE EDIT BUTTON FOR BOUTIQUE --- */}
                      <Button 
                        size="sm" 
                        variant="secondary" 
                        onClick={() => handleEdit(product)}
                        disabled={product.productType === 'BOUTIQUE'}
                        title={product.productType === 'BOUTIQUE' ? "Variant editing coming soon" : "Edit product"}
                      >
                        Edit
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDelete(product.id)}>Delete</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Product">
        {editingProduct && (
          <form onSubmit={handleEditSubmit} className="space-y-4">
            {/* Input fields for product editing */}
            <input type="text" value={editingProduct.name} onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })} className="w-full p-2 border rounded" placeholder="Product Name" />
            <input type="text" value={editingProduct.SKU} onChange={(e) => setEditingProduct({ ...editingProduct, SKU: e.target.value })} className="w-full p-2 border rounded" placeholder="SKU" />
            <input type="number" value={editingProduct.netPrice} onChange={(e) => setEditingProduct({ ...editingProduct, netPrice: parseFloat(e.target.value) })} className="w-full p-2 border rounded" placeholder="Net Price" />
            <input type="number" value={editingProduct.sellingPrice} onChange={(e) => setEditingProduct({ ...editingProduct, sellingPrice: parseFloat(e.target.value) })} className="w-full p-2 border rounded" placeholder="Selling Price" />
            <input type="number" value={editingProduct.quantity} onChange={(e) => setEditingProduct({ ...editingProduct, quantity: parseInt(e.target.value) })} className="w-full p-2 border rounded" placeholder="Quantity" />
           {/* --- THIS IS THE NEW, UPGRADED DROPDOWN FOR THE MODAL --- */}
<Select
  value={editingProduct.category ? String(editingProduct.category.id) : "none"}
  onValueChange={(value) => {
    const catId = value === "none" ? undefined : parseInt(value);
    if (catId) {
      const catName = categories.find(c => c.id === catId)?.name || '';
      setEditingProduct({
        ...editingProduct,
        category: { id: catId, name: catName }
      });
    } else {
      setEditingProduct({
        ...editingProduct,
        category: undefined
      });
    }
  }}
>
  <SelectTrigger className="w-full">
    <SelectValue placeholder="Select Category" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="none">Select Category</SelectItem>
    {categories.map((cat) => (
      <SelectItem key={cat.id} value={String(cat.id)}>
        {cat.name}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="secondary" onClick={() => setShowEditModal(false)}>Cancel</Button>
              <Button type="submit">Save Changes</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}