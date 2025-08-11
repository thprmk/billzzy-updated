// app/api/analytics/top-products/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    // Get the ID from the user's logged-in session for security and correct type
    const organisationId = parseInt(session.user.id); 
    const timeRange = searchParams.get('timeRange') || 'week';

    const today = new Date();
    let startDate = new Date();

    // Set date range based on selected time period
    switch (timeRange) {
      case 'week':
        startDate.setDate(today.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(today.getMonth() - 1);
        break;
      case '3months':
        startDate.setMonth(today.getMonth() - 3);
        break;
      case 'year':
        startDate.setFullYear(today.getFullYear() - 1);
        break;
      default:
        startDate.setDate(today.getDate() - 7);
    }

    // Get top selling products
    // 1. Get top selling STANDARD products (where productVariantId is null)
    const topStandardProducts = await prisma.transactionItem.groupBy({
      by: ['productId' as any],
      where: {
        transaction: {
          paymentStatus: 'PAID',
          organisationId: organisationId,
          date: { gte: startDate, lte: today },
        },
        productVariantId: null, // Only standard products
        productId: { not: null } // Ensure productId exists
      },
      _sum: {
        quantity: true,
        totalPrice: true,
      },
      orderBy: { _sum: { quantity: 'desc' } },
    });

    // 2. Get top selling PRODUCT VARIANTS (where productId is null)
    const topVariantProducts = await prisma.transactionItem.groupBy({
     by: ['productVariantId' as any],
      where: {
        transaction: {
          paymentStatus: 'PAID',
          organisationId: organisationId,
          date: { gte: startDate, lte: today },
        },
        productId: null, // Only variant products
        productVariantId: { not: null } // Ensure productVariantId exists
      },
      _sum: {
        quantity: true,
        totalPrice: true,
      },
      orderBy: { _sum: { quantity: 'desc' } },
    });

    // 3. Fetch details for all the top products and variants
    const standardProductIds = topStandardProducts.map(item => item.productId!);
    const standardProducts = await prisma.product.findMany({
      where: { id: { in: standardProductIds } },
    });

    const variantIds = topVariantProducts.map(item => item.productVariantId!);
    const variants = await prisma.productVariant.findMany({
      where: { id: { in: variantIds } },
      include: { product: true }, // Include parent for the name
    });
    
    // 4. Combine and format the data
    const formattedStandard = topStandardProducts.map(item => {
      const product = standardProducts.find(p => p.id === item.productId);
      return {
        name: product?.name || 'Unknown Product',
        quantity: item._sum?.quantity || 0,
        revenue: item._sum?.totalPrice || 0,
      };
    });

    const formattedVariants = topVariantProducts.map(item => {
      const variant = variants.find(v => v.id === item.productVariantId);
      const name = variant ? `${variant.product.name} (${variant.size || variant.color})` : 'Unknown Variant';
      return {
        name: name,
        quantity: item._sum?.quantity || 0,
        revenue: item._sum?.totalPrice || 0,
      };
    });
    
    // 5. Merge, sort, and take the top results
    const combinedTopProducts = [...formattedStandard, ...formattedVariants]
      .sort((a, b) => b.quantity - a.quantity) // Sort by quantity descending
      .slice(0, 5); // Take the top 5 overall

    return NextResponse.json({
      success: true,
      data: combinedTopProducts,
    });

  } catch (error) {
    console.error('Error fetching top products:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}