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


interface ProductVariant {
  id: number;
  SKU: string;
  sellingPrice: number;
  quantity: number;
  size: string | null;
  color: string | null;
}

interface Product {
  id: number;
  name: string;
  productType: 'STANDARD' | 'BOUTIQUE';
  SKU: string | null; // Can be null for boutique
  netPrice: number | null; // Can be null for boutique
  sellingPrice: number | null; // Can be null for boutique
  quantity: number | null; // Can be null for boutique
  categoryId: number | null;
  category?: { name: string; id: number; };
  variants?: ProductVariant[]; // Add this
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
  const [expandedProductId, setExpandedProductId] = useState<number | null>(null);
  const [editingVariant, setEditingVariant] = useState<ProductVariant | null>(null);
  const [showVariantEditModal, setShowVariantEditModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
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
    } finally {
      setProductToDelete(null); // Close the modal on completion
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

        body: JSON.stringify(editingProduct),

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

  const handleVariantUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVariant) return;

    try {
      const response = await fetch(`/api/products/variants/${editingVariant.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingVariant),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update variant');
      }

      toast.success('Variant updated successfully');
      setShowVariantEditModal(false);
      setEditingVariant(null);
      // Refresh the product list to show the new data
      fetchProducts(selectedCategory, searchTerm);

    } catch (error: any) {
      toast.error(error.message);
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
          <Button variant="default">Add Product</Button>
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
            <tbody className="bg-white divide-y divide-gray-200">
              {products.map((product) => (
                <React.Fragment key={product.id}>

                  {/* --- MAIN PRODUCT ROW --- */}
                  <tr className="hover:bg-gray-50">
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
                        ? <span className="text-gray-400"></span> 
                        : `₹${product.sellingPrice?.toFixed(2) ?? '0.00'}`
                      }
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      {product.productType === 'BOUTIQUE' 
                        ? <span className="text-gray-400"></span> 
                        : product.quantity
                      }
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{product.category?.name || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex justify-center space-x-2">
                        {product.productType === 'BOUTIQUE' ? (
                          <Button size="sm" variant="outline" onClick={() => setExpandedProductId(expandedProductId === product.id ? null : product.id)}>
                            {expandedProductId === product.id ? 'Hide' : 'View'} Variants
                          </Button>
                        ) : (
                          <Button size="sm" variant="secondary" onClick={() => handleEdit(product)}>Edit</Button>
                        )}
                        <Button size="sm" variant="destructive"onClick={() => setProductToDelete(product)}>Delete</Button>
                      </div>
                    </td>
                  </tr>

                  {/* --- EXPANDED VARIANTS SUB-TABLE --- */}
                  {product.productType === 'BOUTIQUE' && expandedProductId === product.id && (
                    <tr>
                     <td colSpan={6} className="p-0 border-l-4 border-indigo-200 bg-slate-50">
                        <div className="px-6 py-4">
                          <h4 className="text-sm font-semibold mb-2 text-gray-700">Variants for {product.name}</h4>
                          <table className="min-w-full bg-white border rounded shadow-sm">
                            <thead className="bg-gray-100">
                              <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">SKU</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">Size</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">Color</th>
                                <th className="px-4 py-2 text-right text-xs font-medium text-gray-600 uppercase">Price</th>
                                <th className="px-4 py-2 text-right text-xs font-medium text-gray-600 uppercase">Stock</th>
                                <th className="px-4 py-2 text-center text-xs font-medium text-gray-600 uppercase">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
  {product.variants && product.variants.length > 0 ? (
    product.variants.map(variant => ( // <-- NO extra braces or optional chaining needed
      <tr key={variant.id} className="border-t">
        <td className="px-4 py-2 whitespace-nowrap">{variant.SKU}</td>
        <td className="px-4 py-2 whitespace-nowrap">{variant.size || '-'}</td>
        <td className="px-4 py-2 whitespace-nowrap">{variant.color || '-'}</td>
        <td className="px-4 py-2 whitespace-nowrap text-right">₹{variant.sellingPrice.toFixed(2)}</td>
        <td className="px-4 py-2 whitespace-nowrap text-right">{variant.quantity}</td>
        <td className="px-4 py-2 text-center">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setEditingVariant(variant);
              setShowVariantEditModal(true);
            }}
          >
            Edit
          </Button>
        </td>
      </tr>
    ))
  ) : (
    <tr>
      <td colSpan={6} className="px-4 py-4 text-center text-sm text-gray-500">
        No variants found for this product.
      </td>
    </tr>
  )}
</tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

     <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Product">
  {editingProduct && (
    <form onSubmit={handleEditSubmit} className="space-y-4 p-6">
      {/* Each input is now wrapped in a div with a proper label */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
        <Input 
          value={editingProduct.name} 
          onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })} 
          placeholder="Product Name" 
          required 
        />
      </div>

      <div>
</div>


      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
        <Input 
          value={editingProduct.SKU || ''} 
          onChange={(e) => setEditingProduct({ ...editingProduct, SKU: e.target.value.toUpperCase() })} 
          placeholder="SKU" 
          required 
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Net Price</label>
        <Input 
          type="number" 
          value={editingProduct.netPrice || ''} 
          onChange={(e) => setEditingProduct({ ...editingProduct, netPrice: parseFloat(e.target.value) || 0 })} 
          placeholder="Net Price" 
          required 
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Selling Price</label>
        <Input 
          type="number" 
          value={editingProduct.sellingPrice || ''} 
          onChange={(e) => setEditingProduct({ ...editingProduct, sellingPrice: parseFloat(e.target.value) || 0 })} 
          placeholder="Selling Price" 
          required 
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Stock Quantity</label>
        <Input 
          type="number" 
          value={editingProduct.quantity || ''} 
          onChange={(e) => setEditingProduct({ ...editingProduct, quantity: parseInt(e.target.value) || 0 })} 
          placeholder="Quantity" 
          required 
        />
      </div>
  
<div>
  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
  <Select
    value={editingProduct.categoryId ? String(editingProduct.categoryId) : "none"}
    onValueChange={(value) => {
      const newCatId = value === "none" ? null : Number(value);
      const newCat = categories.find(c => c.id === newCatId);
      setEditingProduct(prev => prev ? { 
        ...prev, 
        categoryId: newCatId, 
        category: newCat 
      } : null);
    }}
  >
    <SelectTrigger aria-label="Product category">
      <SelectValue>
        {editingProduct.categoryId
          ? categories.find(c => c.id === editingProduct.categoryId)?.name
          : "None"}
      </SelectValue>
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="none">None</SelectItem>
      {categories.map((category) => (
        <SelectItem key={category.id} value={String(category.id)}>
          {category.name}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>

      <div className="flex justify-end space-x-2 pt-4 border-t">
        <Button type="button" variant="secondary" onClick={() => setShowEditModal(false)}>Cancel</Button>
        <Button type="submit">Save Changes</Button>
      </div>
    </form>
  )}
</Modal>

      <Modal isOpen={showVariantEditModal} onClose={() => setShowVariantEditModal(false)} title="Edit Variant">
        {editingVariant && (
        <form onSubmit={handleVariantUpdate} className="space-y-4 p-6">
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">SKU</label>
          <Input value={editingVariant.SKU} onChange={(e) => setEditingVariant({ ...editingVariant, SKU: e.target.value.toUpperCase() })} required />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">Selling Price</label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">₹</span>
            <Input type="number" value={editingVariant.sellingPrice} onChange={(e) => setEditingVariant({ ...editingVariant, sellingPrice: parseFloat(e.target.value) || 0 })} required className="pl-7" />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">Stock Quantity</label>
          <Input type="number" value={editingVariant.quantity} onChange={(e) => setEditingVariant({ ...editingVariant, quantity: parseInt(e.target.value) || 0 })} required />
        </div>
        <div className="flex justify-end space-x-2 pt-4 border-t mt-6">
          <Button type="button" variant="secondary" onClick={() => setShowVariantEditModal(false)}>Cancel</Button>
          <Button type="submit" isLoading={isSubmitting}>Save Changes</Button>
        </div>
      </form>     
    )}
      </Modal>

      {/* --- ADD THIS DELETE CONFIRMATION MODAL --- */}
<Modal isOpen={!!productToDelete} onClose={() => setProductToDelete(null)} title="Confirm Deletion">
  <div className="p-6">
    <p className="text-sm text-gray-700">
      Are you sure you want to delete the product "<strong>{productToDelete?.name}</strong>"?
      This action cannot be undone.
    </p>
    <div className="flex justify-end space-x-2 mt-6">
      <Button variant="secondary" onClick={() => setProductToDelete(null)}>Cancel</Button>
      <Button variant="destructive" onClick={() => { if (productToDelete) handleDelete(productToDelete.id); }}>
        Delete Product
      </Button>
    </div>
  </div>
</Modal>
    </div>
  );
}