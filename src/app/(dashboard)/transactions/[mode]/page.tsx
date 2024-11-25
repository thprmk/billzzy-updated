// app/billing/[mode]/page.tsx
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import {BillList} from '@/components/billing/BillList';
import React from 'react';  // Add this import

interface PageProps {
  params: {
    mode: 'online' | 'offline'
  }
}

export default async function BillsPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  // Given Date Object



  try {
    const bills = await prisma.transactionRecord.findMany({
      where: {
        organisationId: parseInt(session.user.id),
        billingMode: params.mode
      },
      include: {
        customer: {
          select: {
            name: true,
            phone: true
          }
        },
        items: {
          include: {
            product: true
          }
        }
      },
      orderBy: {
        billNo: 'desc'
      }
    });

    console.log(bills);
    

    const formattedBills = bills.map((bill) => {
    
      const date = new Date(bill.time);

// Options for 12-hour format with AM/PM
const options = {
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
};

// Extract and format the time
const formattedTime = date.toLocaleTimeString('en-US', options);

console.log(formattedTime); // Output: "7:53 PM"
      return {
        id: bill.id,
        billNo: bill.billNo,
        date: bill.date, // 'YYYY-MM-DD'
        time: formattedTime, // 'HH:MM AM/PM'
        totalPrice: bill.totalPrice,
        status: bill.status,
        billingMode: bill.billingMode,
        customer: bill.customer || { name: 'Walk-in Customer', phone: '-' },
        paymentMethod: bill.paymentMethod || '-',
        amountPaid: bill.amountPaid || 0,
        balance: bill.balance || 0,
        trackingNumber: bill.trackingNumber || null,
        weight: bill.weight || null,
        items: bill.items.map((item) => ({
          id: item.id,
          productName: item.product.name,
          quantity: item.quantity,
          totalPrice: item.totalPrice,
        })),
      };
    });

    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {params.mode === 'online' ? 'Online' : 'Offline'} Bills
            </h1>
            <p className="text-gray-600">
              Manage your {params.mode} transactions
            </p>
          </div>
          
        </div>

        <BillList
          initialBills={formattedBills}
          mode={params.mode}
        />
      </div>
    );
  } catch (error) {
    console.error('Error fetching bills:', error);
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <p className="text-red-600">
          Error loading bills. Please try again later.
        </p>
      </div>
    );
  }
}