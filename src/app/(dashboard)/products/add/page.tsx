// src/app/(dashboard)/products/add/page.tsx - Add Product Page
'use client';

import { useState, useEffect } from 'react';
import  ProductForm  from '@/components/products/ProductForm';

export default function AddProductPage() {
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    // Fetch categories
    const fetchCategories = async () => {
      const response = await fetch('/api/categories');
      const data = await response.json();
      setCategories(data);
    };
    fetchCategories();
  }, []);

  return (
    <div className="max-w-3xl mx-auto flex flex-col justify-center items-center h-[100vh]">
      <h1 className="text-2xl font-bold mb-6">Add New Product</h1>
      <div className="bg-white rounded-lg shadow p-6">
        <ProductForm categories={categories} />
      </div>
    </div>
  );
}