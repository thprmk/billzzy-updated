// src/app/(dashboard)/dashboard/page.tsx

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import DashboardStats from '@/components/dashboard/DashboardStats';
import React from 'react';

async function getDashboardData(organisationId: string) {
   const orgId = parseInt(organisationId);

  // 2. Check if the ID is valid. If not, return default data.
  if (!orgId || isNaN(orgId)) {
    console.warn("getDashboardData received an invalid ID. Returning default data.");
    return {
      todayStats: { _sum: { totalPrice: 0 }, _count: 0 },
      totalProducts: 0,
      lowStockProducts: [],
      lowStockCount: 0,
      recentTransactions: [],
      smsCount: 0,
      totalCustomers: 0,
      ordersNeedingTracking: 0,
      packingOrdersCount: 0,
      printedOrdersCount: 0,
    };
  }
  
  const today = new Date();
  const startOfDay = new Date(today.setHours(0, 0, 0, 0));
  const endOfDay = new Date(today.setHours(23, 59, 59, 999));

  // CORRECTED: 10 variables in the list to match the 10 queries below.
  const [
    todayStats,
    totalProducts,
    lowStockStandardProducts, // This variable will hold an ARRAY of standard products
    lowStockVariantList,   // This variable will hold a NUMBER of variants
    recentTransactions,
    organisationData,
    totalCustomers,
    ordersNeedingTracking,
    packingOrdersCount,
    printedOrdersCount,
  ] = await Promise.all([
    // Query 1: Today's stats
    prisma.transactionRecord.aggregate({
      where: {
        organisationId: orgId,
        paymentStatus: 'PAID' ,
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      _sum: {
        totalPrice: true,
      },
      _count: true,
    }),

    // Query 2: Total products (This was the missing query)
    prisma.product.count({
      where: {
        organisationId: orgId,
      },
    }),

    // Query 3: Low stock STANDARD products (fetches the list of products for the tooltip)
    prisma.product.findMany({
      where: {
        organisationId: orgId,
        productType: 'STANDARD',
        quantity: {
          lte: 10, // Your low stock threshold
        },
      },
      select: { id: true, name: true, quantity: true }
    }),

    // Query 4: Low stock VARIANTS (fetches the count of variants)
  prisma.productVariant.findMany({
      where: {
        product: {
          organisationId: orgId,
        },
        quantity: {
          lte: 10,
        },
      },
      // Include the parent product to get its name
      include: {
        product: {
          select: { name: true }
        }
      }
    }),

    // Query 5: Recent transactions
    prisma.transactionRecord.findMany({
      where: {
        organisationId: orgId,
        paymentStatus: 'PAID'
      },
      include: {
        customer: true,
      },
      orderBy: {
        date: 'desc',
      },
      take: 5 // Limiting to 5 recent transactions
    }),

    // Query 6: SMS count from organisation
    prisma.organisation.findUnique({
      where: {
        id: orgId,
      },
      select: {
        smsCount: true,
      },
    }),

    // Query 7: Total customers
    prisma.customer.count({
      where: {
        organisationId: orgId,
      },
    }),

    // Query 8: Orders needing tracking numbers
    prisma.transactionRecord.count({
      where: {
        organisationId: orgId,
        billingMode: 'online',
        status: {
          in: ['processing', 'printed','packed']
        } ,
               trackingNumber: null,
      },
    }),

    // Query 9: Packing orders count
    prisma.transactionRecord.count({
      where: {
        organisationId: orgId,
        billingMode: 'online',
        status: {
          in: ['processing','printed' ]
        }
      },
    }),

    // Query 10: Dispatch orders count
    prisma.transactionRecord.count({
      where: {
        organisationId: orgId,
        billingMode: 'online',
        status: {
          in: ['processing' ]
        }
      },
    })
  ]);

  // CORRECTED: The return statement now uses the correct variables
  return {
    todayStats,
    totalProducts,
    lowStockProducts: [
      ...lowStockStandardProducts.map(p => ({ id: p.id, name: p.name, quantity: p.quantity })),
      // Use the correct variable name: lowStockVariantList
      ...lowStockVariantList.map(v => ({ id: v.id, name: `${v.product.name} (${v.size || v.color || 'Variant'})`, quantity: v.quantity }))
    ],
    // THE FIX: Combine the lengths of the two arrays for the stat card
    lowStockCount: lowStockStandardProducts.length + lowStockVariantList.length,// This is the combined NUMBER for the stat card
    recentTransactions,
    smsCount: organisationData?.smsCount || 0,
    totalCustomers,
    ordersNeedingTracking,
    packingOrdersCount,
    printedOrdersCount,
  };
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  const data = await getDashboardData(session.user.id);

  // CORRECTED: Pass session as a separate prop
  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 py-4">
        <DashboardStats data={{ ...data, organisationId: session.user.id }} session={session} />
      </div>
    </div>
  );
}