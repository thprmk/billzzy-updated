import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-options';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();


export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
  ) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.organisationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const organisationId = session.user.organisationId;
    const templateId = parseInt(params.id, 10);
  
    if (isNaN(templateId)) {
      return NextResponse.json({ error: 'Invalid ID provided' }, { status: 400 });
    }
  
    try {
      // 1. Get the new data from the request body
      const body = await request.json();
      const { name, attributes } = body;
  
      // --- Validation ---
      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json({ error: 'Product type name is required.' }, { status: 400 });
      }
      if (!attributes || !Array.isArray(attributes) || attributes.length === 0) {
        return NextResponse.json({ error: 'At least one attribute is required.' }, { status: 400 });
      }
  
      // 2. Security Check: Verify the template belongs to the user's organisation before doing anything
      const template = await prisma.productTypeTemplate.findFirst({
        where: {
          id: templateId,
          organisationId: organisationId,
        },
      });
      if (!template) {
        return NextResponse.json({ error: 'Product type not found.' }, { status: 404 });
      }
  
      // 3. Use a transaction to safely update everything at once
      const updatedTemplate = await prisma.$transaction(async (tx) => {
        // a. Update the template's name
        await tx.productTypeTemplate.update({
          where: { id: templateId },
          data: { name: name.trim() },
        });
  
        // b. Delete all of the OLD attributes associated with this template
        await tx.attributeTemplate.deleteMany({
          where: { templateId: templateId },
        });
  
        // c. Create all the NEW attributes from the provided list
        const attributeData = attributes
          .map((attr: { name: string }) => attr.name.trim())
          .filter(attrName => attrName !== '') // Filter out any empty strings
          .map(attrName => ({
            name: attrName,
            templateId: templateId,
          }));
        
        if (attributeData.length > 0) {
          await tx.attributeTemplate.createMany({
            data: attributeData,
          });
        }
  
        // Return the updated template ID for fetching the final result
        return { id: templateId };
      });
  
      // 4. Fetch the final, fully updated product type to send back to the client
      const finalProductType = await prisma.productTypeTemplate.findUnique({
          where: { id: updatedTemplate.id },
          include: { attributes: true }
      });
  
      return NextResponse.json(finalProductType, { status: 200 });
  
    } catch (error) {
      console.error(`Error updating product type ${templateId}:`, error);
      return NextResponse.json({ error: 'Failed to update product type.' }, { status: 500 });
    }
  }


export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !session.user.organisationId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const organisationId = session.user.organisationId;
  const templateId = parseInt(params.id, 10);

  if (isNaN(templateId)) {
    return NextResponse.json({ error: 'Invalid ID provided' }, { status: 400 });
  }

  try {
    // 1. Security Check: First, verify the template belongs to the user's organisation.
    const template = await prisma.productTypeTemplate.findFirst({
      where: {
        id: templateId,
        organisationId: organisationId,
      },
      include: {
        // Also check how many products are using this template
        _count: {
          select: { products: true },
        },
      },
    });

    if (!template) {
      return NextResponse.json({ error: 'Product type not found.' }, { status: 404 });
    }

    // 2. Business Logic Check: Prevent deletion if the template is in use.
    if (template._count.products > 0) {
      return NextResponse.json(
        { error: `Cannot delete. This type is used by ${template._count.products} product(s).` },
        { status: 409 } // 409 Conflict
      );
    }

    // 3. If checks pass, delete the template.
    // The database is set to cascade delete, so its attributes will be deleted automatically.
    await prisma.productTypeTemplate.delete({
      where: {
        id: templateId,
      },
    });

    return NextResponse.json({ message: 'Product type deleted successfully.' }, { status: 200 });

  } catch (error) {
    console.error(`Error deleting product type ${templateId}:`, error);
    return NextResponse.json({ error: 'Failed to delete product type.' }, { status: 500 });
  }
}