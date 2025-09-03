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
  netPrice: number; // Add netPrice for the modal
  sellingPrice: number;
  quantity: number;
  size: string | null;
  color: string | null;
}

interface Product {
  id: number;
  name: string;
  productType: 'STANDARD' | 'BOUTIQUE';
  SKU: string | null;
  netPrice: number | null;
  sellingPrice: number | null;
  quantity: number | null;
  categoryId: number | null;
  category?: { name: string; id: number };
  variants?: ProductVariant[];
  netWorth?: number;
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
  const [showEditModal, setShowEditModal] = useState(false); // For STANDARD products
  const [editingVariant, setEditingVariant] = useState<ProductVariant | null>(null);
  const [showVariantEditModal, setShowVariantEditModal] = useState(false); // For single variant edits
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [showBoutiqueEditModal, setShowBoutiqueEditModal] = useState(false); // For BOUTIQUE products

  // --- DATA FETCHING ---
  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const fetchProducts = async (categoryId?: string, search?: string) => {
    setIsLoading(true);
    try {
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
    const handler = setTimeout(() => {
      fetchProducts(selectedCategory, searchTerm);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm, selectedCategory]);

  // --- EVENT HANDLERS ---

  const handleDelete = async (id: number) => {
    try {
      const response = await fetch(`/api/products/${id}`, { method: 'DELETE' });
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
      setProductToDelete(null);
    }
  };

  // Handler for STANDARD product edit modal
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

  // Handler for SINGLE VARIANT edit modal (from dropdown)
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
      fetchProducts(selectedCategory, searchTerm);
    } catch (error: any) {
      toast.error(error.message);
    }
  };
  
  // Handlers for the FULL BOUTIQUE product edit modal
  const handleBoutiqueEdit = (product: Product) => {
    setEditingProduct({ ...product, variants: product.variants || [] });
    setShowBoutiqueEditModal(true);
  };

  const handleVariantChangeInModal = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    if (!editingProduct?.variants) return;
    const { name, value } = e.target;
    const updatedVariants = [...editingProduct.variants];
    const currentVariant = updatedVariants[index];
    updatedVariants[index] = { ...currentVariant, [name]: value };
    setEditingProduct({ ...editingProduct, variants: updatedVariants });
  };

  const addVariantInModal = () => {
    if (!editingProduct) return;
    const newVariant: ProductVariant = {
      id: Date.now(), // Temporary ID for the key
      SKU: '',
      netPrice: 0,
      sellingPrice: 0,
      quantity: 0,
      size: '',
      color: '',
    };
    setEditingProduct({ ...editingProduct, variants: [...(editingProduct.variants || []), newVariant] });
  };

  const removeVariantInModal = (index: number) => {
    if (!editingProduct?.variants || editingProduct.variants.length <= 1) return;
    setEditingProduct({ ...editingProduct, variants: editingProduct.variants.filter((_, i) => i !== index) });
  };

  const handleBoutiqueEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    const submissionData = {
      productType: 'BOUTIQUE',
      name: editingProduct.name,
      categoryId: editingProduct.categoryId,
      variants: editingProduct.variants?.map(v => ({
        ...v,
        netPrice: Number(v.netPrice),
        sellingPrice: Number(v.sellingPrice),
        quantity: Number(v.quantity),
      })),
    };
    try {
      const response = await fetch(`/api/products/${editingProduct.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submissionData),
      });
      if (response.ok) {
        setShowBoutiqueEditModal(false);
        toast.success('Product updated successfully');
        fetchProducts(selectedCategory, searchTerm);
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to update product');
      }
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleImportComplete = () => {
    fetchProducts(selectedCategory);
  };

  if (isLoading && products.length === 0) {
    return (
      <div className='h-screen w-full flex items-center justify-center'>
        <LoadingSpinner />
      </div>
    );
  }

  // --- JSX RENDER ---
  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <h1 className="text-2xl font-bold">Products</h1>
        <div className="flex items-center space-x-2">
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
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Net Worth</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {products.map((product) => (
                <React.Fragment key={product.id}>
                  <tr className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      {product.name}
                      {product.productType === 'BOUTIQUE' && (
                        <span className="ml-2 text-xs font-semibold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">Boutique</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {product.productType === 'BOUTIQUE' ? <span className="text-gray-400">Multiple</span> : product.SKU}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      {product.productType === 'BOUTIQUE' ? <span className="text-gray-400">-</span> : `₹${product.sellingPrice?.toFixed(2) ?? '0.00'}`}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      {product.productType === 'BOUTIQUE' ? <span className="text-gray-400">-</span> : product.quantity}
                    </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right font-semibold text-gray-800">
        ₹{(product.netWorth || 0).toFixed(2)}
      </td>
                    <td className="px-6 py-4 whitespace-nowrap">{product.category?.name || '-'}</td>

   <td className="px-6 py-4 whitespace-nowrap text-center">
  <div className="flex justify-center space-x-2">
    {/* A single "Edit" button that calls the correct function based on type */}
    <Button 
      size="sm" 
      variant="secondary" 
      onClick={() => product.productType === 'BOUTIQUE' ? handleBoutiqueEdit(product) : handleEdit(product)}
    >
      Edit
    </Button>
    
    {/* The Delete button remains the same */}
    <Button size="sm" variant="destructive" onClick={() => setProductToDelete(product)}>
      Delete
    </Button>
  </div>
</td>
                  
                  </tr>
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Product">
        {editingProduct && (
          <form onSubmit={handleEditSubmit} className="space-y-4 p-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
              <Input value={editingProduct.name} onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
              <Input value={editingProduct.SKU || ''} onChange={(e) => setEditingProduct({ ...editingProduct, SKU: e.target.value.toUpperCase() })} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Net Price</label>
              <Input type="number" value={editingProduct.netPrice || ''} onChange={(e) => setEditingProduct({ ...editingProduct, netPrice: parseFloat(e.target.value) || 0 })} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Selling Price</label>
              <Input type="number" value={editingProduct.sellingPrice || ''} onChange={(e) => setEditingProduct({ ...editingProduct, sellingPrice: parseFloat(e.target.value) || 0 })} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stock Quantity</label>
              <Input type="number" value={editingProduct.quantity || ''} onChange={(e) => setEditingProduct({ ...editingProduct, quantity: parseInt(e.target.value) || 0 })} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <Select value={editingProduct.categoryId ? String(editingProduct.categoryId) : "none"}
                onValueChange={(value) => {
                  const newCatId = value === "none" ? null : Number(value);
                  setEditingProduct(prev => prev ? { ...prev, categoryId: newCatId } : null);
                }}
              >
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={String(category.id)}>{category.name}</SelectItem>
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
              <Input type="number" value={editingVariant.sellingPrice} onChange={(e) => setEditingVariant({ ...editingVariant, sellingPrice: parseFloat(e.target.value) || 0 })} required />
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

      <Modal isOpen={showBoutiqueEditModal} onClose={() => setShowBoutiqueEditModal(false)} title="Edit Boutique Product" className="max-w-6xl w-full">
        {editingProduct && (
          <form onSubmit={handleBoutiqueEditSubmit} className="w-full">
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
                  <Input value={editingProduct.name} onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <Select value={editingProduct.categoryId ? String(editingProduct.categoryId) : "none"} onValueChange={(value) => setEditingProduct(prev => prev ? { ...prev, categoryId: value === "none" ? null : Number(value) } : null)}>
                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {categories.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-lg font-medium text-gray-800">Variants</h3>
                  <Button type="button" size="sm" onClick={addVariantInModal}>Add Variant</Button>
                </div>
                <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2">
                 {editingProduct.variants?.map((variant, index) => (
  <div key={variant.id || index} className="grid grid-cols-8 gap-3 p-2 border rounded-md bg-gray-50 items-end"> {/* CHANGE: grid-cols-8 and gap-3 */}
    
    <div className="col-span-2"> {/* CHANGE: SKU now takes up 2 of 8 columns */}
      <label className="text-xs font-medium text-gray-600">SKU</label>
      <Input name="SKU" value={variant.SKU} onChange={(e) => handleVariantChangeInModal(index, e)} required />
    </div>

    <div> {/* Size takes 1 column */}
      <label className="text-xs font-medium text-gray-600">Size</label>
      <Input name="size" value={variant.size || ''} onChange={(e) => handleVariantChangeInModal(index, e)} />
    </div>

    <div> {/* Color takes 1 column */}
      <label className="text-xs font-medium text-gray-600">Color</label>
      <Input name="color" value={variant.color || ''} onChange={(e) => handleVariantChangeInModal(index, e)} />
    </div>

    <div> {/* Net Price takes 1 column */}
      <label className="text-xs font-medium text-gray-600">Net Price</label>
      <Input type="number" name="netPrice" value={variant.netPrice || ''} onChange={(e) => handleVariantChangeInModal(index, e)} required />
    </div>

    <div> {/* Sell Price takes 1 column */}
      <label className="text-xs font-medium text-gray-600">Sell Price</label>
      <Input type="number" name="sellingPrice" value={variant.sellingPrice} onChange={(e) => handleVariantChangeInModal(index, e)} required />
    </div>

    <div className="col-span-2 flex items-end gap-2"> {/* CHANGE: Stock + Button container takes up last 2 columns */}
      <div className="flex-grow">
        <label className="text-xs font-medium text-gray-600">Stock</label>
        <Input type="number" name="quantity" value={variant.quantity} onChange={(e) => handleVariantChangeInModal(index, e)} required />
      </div>
      <Button 
        type="button" 
        size="icon" 
        variant="destructive" 
        onClick={() => removeVariantInModal(index)} 
        disabled={editingProduct.variants && editingProduct.variants.length <= 1}
        className="flex-shrink-0" // This keeps the button from shrinking
      >
        X
      </Button>
    </div>
  </div>
))}
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-2 p-4 bg-gray-50 border-t">
              <Button type="button" variant="secondary" onClick={() => setShowBoutiqueEditModal(false)}>Cancel</Button>
              <Button type="submit">Save Changes</Button>
            </div>
          </form>
        )}
      </Modal>

      <Modal isOpen={!!productToDelete} onClose={() => setProductToDelete(null)} title="Confirm Deletion">
        <div className="p-6">
          <p className="text-sm text-gray-700">Are you sure you want to delete the product "<strong>{productToDelete?.name}</strong>"? This action cannot be undone.</p>
          <div className="flex justify-end space-x-2 mt-6">
            <Button variant="secondary" onClick={() => setProductToDelete(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => { if (productToDelete) handleDelete(productToDelete.id); }}>Delete Product</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}