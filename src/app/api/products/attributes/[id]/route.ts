import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-options';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// PUT /api/products/attributes/[id]
// Updates an existing variant option (attribute) and its values.
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  // 1. Authenticate and authorize the user
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !session.user.organisationId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const organisationId = parseInt(session.user.organisationId as any, 10);
  const attributeId = parseInt(params.id, 10);

  if (isNaN(organisationId) || isNaN(attributeId)) {
    return NextResponse.json({ error: 'Invalid ID provided' }, { status: 400 });
  }

  try {
    // 2. Verify that the attribute belongs to the user's organisation
    const attribute = await prisma.variantOption.findFirst({
      where: {
        id: attributeId,
        organisationId: organisationId,
      },
    });

    if (!attribute) {
      return NextResponse.json({ error: 'Attribute not found or you do not have permission to edit it.' }, { status: 404 });
    }

    // 3. Get the updated data from the request body
    const body = await request.json();
    const { name, values } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Attribute name is required.' }, { status: 400 });
    }
    if (!Array.isArray(values)) {
      return NextResponse.json({ error: 'Values must be an array.' }, { status: 400 });
    }

    // 4. Use a transaction to perform multiple database operations safely
    const updatedAttribute = await prisma.$transaction(async (tx) => {
      // a. Update the attribute's name
      const updatedOption = await tx.variantOption.update({
        where: { id: attributeId },
        data: { name: name.trim() },
      });

      // b. Delete all existing values for this attribute
      await tx.variantValue.deleteMany({
        where: { optionId: attributeId },
      });

      // c. Create the new values from the provided array
      // We only create values that are not empty strings
      const validValues = values
        .map(v => ({ value: v.value.trim(), optionId: attributeId }))
        .filter(v => v.value !== '');
        
      if (validValues.length > 0) {
        await tx.variantValue.createMany({
          data: validValues,
        });
      }

      // Return the updated option
      return updatedOption;
    });

    // 5. Fetch the final, updated attribute with its new values to return to the client
    const finalAttribute = await prisma.variantOption.findUnique({
      where: { id: attributeId },
      include: { values: true },
    });

    return NextResponse.json(finalAttribute, { status: 200 });

  } catch (error) {
    console.error(`Error updating attribute ${attributeId}:`, error);
    return NextResponse.json(
      { error: 'An error occurred while updating the attribute.' },
      { status: 500 }
    );
  }
}