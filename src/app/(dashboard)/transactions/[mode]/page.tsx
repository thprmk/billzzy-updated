// app/billing/[mode]/page.tsx
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import {BillList} from '@/components/billing/BillList';
import React from 'react';  // Add this import
import { format } from 'date-fns';

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
            product: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        billNo: 'desc'
      }
    });

    const formattedBills = bills.map((bill) => {
      // Ensure date and time are valid before formatting
      let formattedDate = '';
      let formattedTime = '';
      
      try {
        formattedDate = bill.date ? format(new Date(bill.date), 'dd/MM/yyyy') : '';
        
        if (bill.time) {
          const time = new Date(bill.time);
          formattedTime = time.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          });
        }
      } catch (error) {
        console.error('Date formatting error:', error);
      }

      // Ensure all values are serializable
      return {
        id: bill.id,
        billNo: bill.billNo,
        date: formattedDate,
        time: formattedTime,
        totalPrice: Number(bill.totalPrice),
        status: bill.status || 'pending',
        billingMode: bill.billingMode,
        customer: bill.customer ? {
          name: bill.customer.name || 'Walk-in Customer',
          phone: bill.customer.phone || '-'
        } : {
          name: 'Walk-in Customer',
          phone: '-'
        },
        paymentMethod: bill.paymentMethod || '-',
        amountPaid: Number(bill.amountPaid || 0),
        balance: Number(bill.balance || 0),
        trackingNumber: bill.trackingNumber || null,
        weight: bill.weight ? Number(bill.weight) : null,
        items: bill.items.map((item) => ({
          id: item.id,
          productName: item.product?.name || 'Unknown Product',
          quantity: Number(item.quantity),
          totalPrice: Number(item.totalPrice),
        }))
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
    // Return a proper component instead of null
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-600">
            Error loading bills. Please try again later.
          </p>
        </div>
      </div>
    );
  }
}