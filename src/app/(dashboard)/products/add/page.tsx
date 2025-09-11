// src/app/(dashboard)/products/add/page.tsx

// REMOVED 'use client' - This is now a Server Component

import { prisma } from '@/lib/prisma';
import ProductForm from '@/components/products/ProductForm';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-options';
import { redirect } from 'next/navigation';
import React from 'react';

// This export ensures the data is fetched fresh each time the page is visited
export const revalidate = 0;

export default async function AddProductPage() {
  // 1. Authenticate and get the user's organisationId on the server
  const session = await getServerSession(authOptions);
  const organisationId = session?.user?.organisationId;

  // If the user isn't logged in, send them to the login page
  if (!organisationId) {
    redirect('/login');
  }
  
  // 2. Fetch both categories and productTypes directly from the database in parallel
  const [categories, productTypes] = await Promise.all([
    prisma.productCategory.findMany({
      where: { organisationId },
      orderBy: { name: 'asc' }
    }),
    prisma.productTypeTemplate.findMany({
      where: { organisationId },
      include: { 
        attributes: { // Important: Also fetch the attributes for each type
          orderBy: { id: 'asc' }
        }
      },
      orderBy: { name: 'asc' }
    })
  ]);

  // 3. Render the ProductForm and pass the fetched data as props
  return (
    // Note: You can re-add your Shopify import button and other UI elements here if needed
    <ProductForm categories={categories} productTypes={productTypes} />
  );
}