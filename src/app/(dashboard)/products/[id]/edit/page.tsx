// src/app/(dashboard)/products/[id]/edit/page.tsx

import ProductForm from '@/components/products/ProductForm';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth-options';
import { getServerSession } from 'next-auth';
import { notFound } from 'next/navigation';

// This function fetches all categories for the dropdown
async function getCategories(organisationId: number) {
  const categories = await prisma.productCategory.findMany({
    where: { organisationId },
    orderBy: { name: 'asc' },
  });
  return categories;
}

// This function fetches the specific product being edited
async function getProduct(id: number, organisationId: number) {
  const product = await prisma.product.findFirst({
    where: { id, organisationId },
    include: {
      // We must include the variants if it's a boutique product
      variants: true, 
    },
  });
  return product;
}


// --- The Page Component ---
export default async function EditProductPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organisationId) {
    return notFound(); // Or redirect to login
  }

  const organisationId = Number(session.user.organisationId);
  const productId = Number(params.id);

  // Fetch both the product and categories in parallel
  const [product, categories] = await Promise.all([
    getProduct(productId, organisationId),
    getCategories(organisationId),
  ]);

  if (!product) {
    // If the product doesn't exist or doesn't belong to the user, show a 404 page
    return notFound();
  }

  // The ProductForm is now used for editing, passing the fetched data
  return (
    <ProductForm initialData={product} categories={categories} />
  );
}