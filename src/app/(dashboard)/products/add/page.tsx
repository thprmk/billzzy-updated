// src/app/(dashboard)/products/add/page.tsx - Add Product Page
'use client';

import { useState, useEffect } from 'react';
import  ProductForm  from '@/components/products/ProductForm';
import React from 'react';  // Add this import

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
    <div className="min-h-screen flex  bg-gray-100 md:p-4 p-2">
      <div className="w-full max-w-3xl">
        <h1 className="text-2xl hidden md:block sm:text-3xl font-bold text-center mb-6">
          Add New Product
        </h1>
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
          <ProductForm categories={categories} />
        </div>
      </div>
    </div>
  );
}