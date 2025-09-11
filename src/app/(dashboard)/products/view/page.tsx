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
import { ChevronDownIcon, ChevronRightIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';

interface ProductVariant {
  id: number;
  SKU: string;
  netPrice: number; // Add netPrice for the modal
  sellingPrice: number;
  quantity: number;
  customAttributes: Record<string, string>;
}

interface Product {
  id: number;
  name: string;
  SKU: string | null;
  netPrice: number | null;
  sellingPrice: number | null;
  quantity: number | null;
  category: { name: string; id: number } | null;
  productTypeTemplate: { id: number, name: string, attributes: { name: string }[] } | null; 
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
  const [expandedProducts, setExpandedProducts] = useState<Set<number>>(new Set());



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


  const toggleExpand = (productId: number) => {
    setExpandedProducts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) newSet.delete(productId);
      else newSet.add(productId);
      return newSet;
    });
  };
  
  function formatAttributes(attributes: Record<string, string>): string {
    if (!attributes) return '';
    return Object.entries(attributes).map(([key, value]) => `${key}: ${value}`).join(', ');
  }

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

  const handleVariantChangeInModal = (index: number, fieldName: string, value: string) => {
    if (!editingProduct?.variants) return;
  
    const updatedVariants = [...editingProduct.variants];
    const variantToUpdate = { ...updatedVariants[index] };
  
    if (['SKU', 'netPrice', 'sellingPrice', 'quantity'].includes(fieldName)) {
      // It's a standard field
      variantToUpdate[fieldName] = fieldName === 'SKU' ? value.toUpperCase() : Number(value) || 0;
    } else {
      // It's a custom attribute
      variantToUpdate.customAttributes = {
        ...variantToUpdate.customAttributes,
        [fieldName]: value,
      };
    }
  
    updatedVariants[index] = variantToUpdate;
    setEditingProduct({ ...editingProduct, variants: updatedVariants });
  };

  const addVariantInModal = () => {
    if (!editingProduct || !editingProduct.productTypeTemplate) return;
  
    // This creates an empty object with keys from the template's attributes,
    // e.g., { "Size": "", "Color": "" }
    const newCustomAttributes = Object.fromEntries(
      editingProduct.productTypeTemplate.attributes.map(attr => [attr.name, ""])
    );
  
    // Note: The 'ProductVariant' type in your component needs to be updated
    // to remove 'size' and 'color' and add 'customAttributes'
    const newVariant = {
      id: Date.now(), // Temporary ID for React key
      SKU: '',
      netPrice: 0,
      sellingPrice: 0,
      quantity: 0,
      customAttributes: newCustomAttributes,
    };
  
    // Ensure variants is an array before spreading
    const existingVariants = editingProduct.variants || [];
    setEditingProduct({ ...editingProduct, variants: [...existingVariants, newVariant] });
  };

  const removeVariantInModal = (index: number) => {
    if (!editingProduct?.variants || editingProduct.variants.length <= 1) return;
    setEditingProduct({ ...editingProduct, variants: editingProduct.variants.filter((_, i) => i !== index) });
  };

  const handleBoutiqueEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    const submissionData = {
      name: editingProduct.name,
      categoryId: editingProduct.categoryId,
      productTypeTemplateId: editingProduct.productTypeTemplate?.id, // Send the template ID
      variants: editingProduct.variants?.map(v => {
        // We remove the old size/color fields and make sure customAttributes is sent
        const { size, color, ...rest } = v;
        return {
          ...rest,
          netPrice: Number(v.netPrice),
          sellingPrice: Number(v.sellingPrice),
          quantity: Number(v.quantity),
        };
      }),
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
        <h1 className="text-2xl font-semibold">Products</h1>
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
          <div className="flex items-center">
            {product.productTypeTemplate && product.variants && product.variants.length > 0 && (
              <button onClick={() => toggleExpand(product.id)} className="mr-2 p-1 rounded-full hover:bg-gray-200">
                {expandedProducts.has(product.id) ? <ChevronDownIcon className="h-4 w-4" /> : <ChevronRightIcon className="h-4 w-4" />}
              </button>
            )}
            {product.name}
            {product.productTypeTemplate && (
              <span className="ml-2 text-xs font-semibold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
                {product.productTypeTemplate.name}
              </span>
            )}
          </div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          {product.productTypeTemplate ? <span className="text-gray-400">Multiple</span> : product.SKU}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-right">
          {product.productTypeTemplate ? <span className="text-gray-400">-</span> : `₹${product.sellingPrice?.toFixed(2) ?? '0.00'}`}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-right">
          {product.productTypeTemplate ? <span className="text-gray-400">-</span> : product.quantity}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-right font-semibold text-gray-800">
          ₹{(product.netWorth || 0).toFixed(2)}
        </td>
        <td className="px-6 py-4 whitespace-nowrap">{product.category?.name || '-'}</td>
        <td className="px-6 py-4 whitespace-nowrap text-center">
          <div className="flex justify-center space-x-2">
            <Button 
              size="sm" 
              variant="secondary" 
              onClick={() => product.productTypeTemplate ? handleBoutiqueEdit(product) : handleEdit(product)}
            >
              Edit
            </Button>
            <Button size="sm" variant="destructive" onClick={() => setProductToDelete(product)}>
              Delete
            </Button>
          </div>
        </td>
      </tr>
      {expandedProducts.has(product.id) && product.variants?.map(variant => (
        <tr key={variant.id} className="bg-white">
          <td className="pl-12 pr-6 py-3 whitespace-nowrap text-sm text-gray-600">{formatAttributes(variant.customAttributes)}</td>
          <td className="px-6 py-3 whitespace-nowrap text-sm">{variant.SKU}</td>
          <td className="px-6 py-3 whitespace-nowrap text-right text-sm">₹{variant.sellingPrice.toFixed(2)}</td>
          <td className="px-6 py-3 whitespace-nowrap text-right text-sm">{variant.quantity}</td>
          <td colSpan={3}></td>
        </tr>
      ))}
    </React.Fragment>
  ))}
</tbody>
          </table>
        </div>
      </div>

{/* --- ENHANCED MODAL FOR STANDARD PRODUCTS (v2) --- */}
<Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Product">
  {editingProduct && (
    <form onSubmit={handleEditSubmit}>
      {/* Main content area with more padding */}
      <div className="p-8 space-y-8 bg-white">
        
        {/* --- Section 1: Core Details (Refined 2x2 Grid) --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
          <div>
            <label htmlFor="productName" className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
            <Input 
              id="productName"
              value={editingProduct.name} 
              onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })} 
              placeholder="e.g., Classic Hair Oil" 
              required 
            />
          </div>
          <div>
            <label htmlFor="productSKU" className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
            <Input 
              id="productSKU"
              value={editingProduct.SKU || ''} 
              onChange={(e) => setEditingProduct({ ...editingProduct, SKU: e.target.value.toUpperCase() })} 
              placeholder="e.g., HO-001" 
              required 
            />
          </div>
          <div className="md:col-span-2">
            <label htmlFor="productCategory" className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <Select
              value={editingProduct.categoryId ? String(editingProduct.categoryId) : "none"}
              onValueChange={(value) => {
                const newCatId = value === "none" ? null : Number(value);
                setEditingProduct(prev => prev ? { ...prev, categoryId: newCatId } : null);
              }}
            >
              <SelectTrigger id="productCategory" aria-label="Product category">
                <SelectValue placeholder="Select a category" />
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
        </div>

        {/* --- Section 2: Pricing & Inventory --- */}
        <div className="border-t border-gray-200 pt-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-5">
            <div>
              <label htmlFor="netPrice" className="block text-sm font-medium text-gray-700 mb-1">Net Price (₹)</label>
              <Input 
                id="netPrice"
                type="number" 
                value={editingProduct.netPrice || ''} 
                onChange={(e) => setEditingProduct({ ...editingProduct, netPrice: parseFloat(e.target.value) || 0 })} 
                placeholder="0.00" 
                required 
              />
            </div>
            <div>
              <label htmlFor="sellingPrice" className="block text-sm font-medium text-gray-700 mb-1">Selling Price (₹)</label>
              <Input 
                id="sellingPrice"
                type="number" 
                value={editingProduct.sellingPrice || ''} 
                onChange={(e) => setEditingProduct({ ...editingProduct, sellingPrice: parseFloat(e.target.value) || 0 })} 
                placeholder="0.00" 
                required 
              />
            </div>
            <div>
              <label htmlFor="stockQuantity" className="block text-sm font-medium text-gray-700 mb-1">Stock Quantity</label>
              <Input 
                id="stockQuantity"
                type="number" 
                value={editingProduct.quantity || ''} 
                onChange={(e) => setEditingProduct({ ...editingProduct, quantity: parseInt(e.target.value) || 0 })} 
                placeholder="0" 
                required 
              />
            </div>
          </div>
        </div>
      </div>

      {/* --- Footer with Actions --- */}
      <div className="flex justify-end space-x-3 bg-gray-50 px-6 py-4 rounded-b-lg">
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

<Modal isOpen={showBoutiqueEditModal} onClose={() => setShowBoutiqueEditModal(false)} title="Edit Product with Variants" className="max-w-4xl w-full">
  {editingProduct && (
    <form onSubmit={handleBoutiqueEditSubmit} className="w-full">
      <div className="p-6 space-y-6">
        {/* Basic Info */}
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
        
        {/* Variants Section */}
        <div>
          <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2">
            {/* Table Header */}
            {editingProduct.variants && editingProduct.variants.length > 0 && editingProduct.productTypeTemplate && (
              <div className="hidden md:grid grid-cols-12 gap-x-3 text-xs font-medium text-gray-500 mb-1">
                {editingProduct.productTypeTemplate.attributes.map(attr => (
                  <div key={attr.name} className="col-span-2">{attr.name}</div>
                ))}
                <div className="col-span-2">SKU</div>
                <div className="col-span-1">Net Price</div>
                <div className="col-span-2">Selling Price</div>
                <div className="col-span-1">Stock</div>
                <div className="col-span-1"></div>
              </div>
            )}
            {/* Table Rows */}
            {editingProduct.variants?.map((variant, index) => (
              <div key={variant.id || index} className="grid grid-cols-12 gap-x-3 items-center">
                {editingProduct.productTypeTemplate?.attributes.map(attr => (
                  <div key={attr.name} className="col-span-2">
                    <Input 
                      name={attr.name} 
                      value={variant.customAttributes[attr.name] || ''} 
                      onChange={(e) => handleVariantChangeInModal(index, attr.name, e.target.value)}
                    />
                  </div>
                ))}
                <div className="col-span-2">
                  <Input name="SKU" value={variant.SKU} onChange={(e) => handleVariantChangeInModal(index, 'SKU', e.target.value)} required />
                </div>
                <div className="col-span-1">
                  <Input type="number" name="netPrice" value={variant.netPrice} onChange={(e) => handleVariantChangeInModal(index, 'netPrice', e.target.value)} required />
                </div>
                <div className="col-span-2">
                  <Input type="number" name="sellingPrice" value={variant.sellingPrice} onChange={(e) => handleVariantChangeInModal(index, 'sellingPrice', e.target.value)} required />
                </div>
                <div className="col-span-1">
                  <Input type="number" name="quantity" value={variant.quantity} onChange={(e) => handleVariantChangeInModal(index, 'quantity', e.target.value)} required />
                </div>
                <div className="col-span-1 flex justify-end">
                  <button type="button" onClick={() => removeVariantInModal(index)} className="p-1 text-gray-400 rounded-full hover:bg-red-100 hover:text-red-600">
                    <TrashIcon className="h-5 w-5" />
                  </button>
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