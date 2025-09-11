// app/billing/[mode]/page.tsx
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { BillList } from '@/components/billing/BillList';
import React from 'react';
import { format } from 'date-fns';

interface PageProps {
  params: Promise<{
    mode: 'online' | 'offline'
  }>
}

export default async function BillsPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);
  const { mode } = await params;  // Await params here

  if (!session) {
    redirect('/login');
  }

  try {
      const bills = await prisma.transactionRecord.findMany({
      where: {
        organisationId: session.user.organisationId,
        billingMode: mode
      },
  // The NEW, CORRECT include block

include: {
  customer: true,
  items: {
    include: {
      // For every item, get its parent product...
      product: {
        include: {
          // ...and if that product has a template, get the template details.
          productTypeTemplate: true,
        }

      },
      // Also include the specific variant details
      productVariant: true,
    }
  },
  TransactionShipping: true,
},
      orderBy: {
        companyBillNo: 'desc'
      }
    });

    console.log('bills: main', bills);


     const serializableBills = bills.map((bill) => {
      // Create a safe, serializable version of the bill to pass to the client
      const safeBill = {
        ...bill,
        date: bill.date.toISOString(), // Convert Date to a string
        time: new Date(bill.time).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
}),
        // Convert any Decimal fields to plain numbers
        totalPrice: Number(bill.totalPrice),
        amountPaid: Number(bill.amountPaid),
        balance: Number(bill.balance),
        taxAmount: bill.taxAmount ? Number(bill.taxAmount) : null,
        weight: bill.weight ? Number(bill.weight) : null,
        items: bill.items.map(item => ({
          ...item,
          totalPrice: Number(item.totalPrice),
        })),
        shipping: bill.TransactionShipping?.[0] ? {
          ...bill.TransactionShipping[0],
          totalCost: Number(bill.TransactionShipping[0].totalCost)
        } : null,
      };
      delete (safeBill as any).TransactionShipping;
      return safeBill;
    });
    

    return (
      <div className="container mx-auto px-0 md:py-8">
        <div className="flex justify-between items-center mb-4">
        <div className="space-y-1  gap-x-2 hidden md:flex items-center">
                <h1 className="text-2xl sm:text-2xl font-semibold text-gray-900">
                  {mode === 'online' ? 'Online' : 'Offline'} Bills
                </h1> 
                <div>|</div>
                <p className="text-sm sm:text-base text-gray-600">
                  Manage your {mode} transactions
                </p>
              </div>
        </div>

 <BillList
  initialBills={serializableBills}
  mode={mode}
/>
      </div>
    );
  } catch (error) {
    console.error('Error fetching bills:', error);
    return (
      <div className="  px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-600">
            Error loading bills. Please try again later.
          </p>
        </div>
      </div>
    );
  }
}