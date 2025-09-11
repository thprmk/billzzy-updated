// src/app/(dashboard)/products/[id]/edit/page.tsx

import ProductForm from '@/components/products/ProductForm';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth-options';
import { getServerSession } from 'next-auth';
import { notFound, redirect } from 'next/navigation'; 


// --- The Page Component ---
export default async function EditProductPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const organisationId = Number(session.user.organisationId);

  if (!organisationId) {
    redirect('/login');
  }

  const productId = Number(params.id);

  // Fetch both the product and categories in parallel
  const [product, categories, productTypes] = await Promise.all([
 prisma.product.findFirst({
    where: { 
      id: productId, 
      organisationId: organisationId
    },
    include: {
      productTypeTemplate: { // Include the linked template
        include: {
          attributes: true,
        }
      },
      variants: true, 
    },
  }),
  // Fetch all categories for the dropdown
  prisma.productCategory.findMany({
    where: { organisationId },
    orderBy: { name: 'asc' },
  }),
  // --- NEW: Fetch all Product Type Templates for the dropdown ---
  prisma.productTypeTemplate.findMany({
    where: { organisationId },
    include: {
      attributes: true,
    },
    orderBy: { name: 'asc' },
  })
]);

  if (!product) {
    // If the product doesn't exist or doesn't belong to the user, show a 404 page
    return notFound();
  }

  // The ProductForm is now used for editing, passing the fetched data
  return (
    <ProductForm initialData={product} categories={categories} productTypes={productTypes} />
  );
}