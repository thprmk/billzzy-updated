// app/api/billing/search/route.ts

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth-options';

interface CustomError extends Error {
    message: string;
}

interface SearchParams {
    q: string | null;
    mode: string;
    date: string;
    status: string;
    hasTracking: string;
    page: number;
    pageSize: number;
}

interface BillResponse {
    id: number;
    billNo: number;
    date: string;
    time: string;
    totalPrice: number;
    status: string;
    billingMode: string;
    customer: {
        name: string;
        phone: string;
        district?: string;
        state?: string;
    };
    paymentMethod: string;
    amountPaid: number;
    balance: number;
    trackingNumber: string | null;
    weight: number | null;
    items: Array<{
        id: number;
        productName: string;
        quantity: number;
        totalPrice: number;
    }>;
}

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const query = searchParams.get('q') || '';
        const mode = searchParams.get('mode') || 'online';
        const dateFilter = searchParams.get('date') || 'all';
        const statusFilter = searchParams.get('status') || 'all';
        const hasTracking = searchParams.get('hasTracking') || 'all';
        const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
        const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '10')));

        if (isNaN(page) || isNaN(pageSize)) {
            return NextResponse.json(
                { error: 'Invalid pagination parameters' },
                { status: 400 }
            );
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (isNaN(today.getTime())) {
            return NextResponse.json(
                { error: 'Invalid date format' },
                { status: 400 }
            );
        }

        let dateRange: { gte: Date; lt: Date } | undefined;

        switch (dateFilter) {
            case 'today':
                dateRange = {
                    gte: today,
                    lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
                };
                break;
            case 'week':
                const weekStart = new Date(today);
                weekStart.setDate(today.getDate() - today.getDay());
                dateRange = {
                    gte: weekStart,
                    lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
                };
                break;
            case 'month':
                const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
                dateRange = {
                    gte: monthStart,
                    lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
                };
                break;
            default:
                dateRange = undefined;
        }

        const whereClause: any = {
            organisationId: parseInt(session.user.id),
            billingMode: mode,
        };

        if (statusFilter !== 'all') {
            whereClause.status = statusFilter;
        }

        if (dateRange) {
            whereClause.date = dateRange;
        }

        if (hasTracking === 'true') {
            whereClause.trackingNumber = { not: null };
        } else if (hasTracking === 'false') {
            whereClause.trackingNumber = null;
        }

        if (query) {
            const billNo = parseInt(query);
            const isBillNo = !isNaN(billNo);

            whereClause.OR = [
                ...(isBillNo ? [{ billNo: billNo }] : []),
                {
                    customer: {
                        is: {
                            OR: [
                                { name: { contains: query } },
                                { phone: { contains: query } },
                            ],
                        },
                    },
                },
            ];
        }

        const totalCount = await prisma.transactionRecord.count({
            where: whereClause,
        });

        const bills = await prisma.transactionRecord.findMany({
            where: whereClause,
            include: {
                customer: {
                    select: {
                        name: true,
                        phone: true,
                        district: true,
                        state: true,
                    },
                },
                items: {
                    include: {
                        product: {
                            select: {
                                name: true,
                                SKU: true,
                            },
                        },
                    },
                },
            },
            orderBy: {
                billNo: 'desc',
            },
            skip: (page - 1) * pageSize,
            take: pageSize,
        });

        console.log(bills);
        

        const formattedBills: BillResponse[] = bills.map((bill) => {
            const dateObj = new Date(bill.date);
            const timeObj = new Date(bill.time);
            // const timeObj = new Date(bill.time);

            // Define options for 12-hour format
            const options = {
              hour: 'numeric',
              minute: 'numeric',
              hour12: true,
              timeZone: 'UTC' // Change to your desired timezone if needed
            };
            
            // Format the time
            const formattedTime = new Intl.DateTimeFormat('en-US', options).format(timeObj);
            

            console.log(formattedTime);
            

            return {
                id: bill.id,
                billNo: bill.billNo,
                date: dateObj,
                time: formattedTime,
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

        return NextResponse.json({ bills: formattedBills, totalCount });

    } catch (error: unknown) {
        const customError = error as CustomError;
        console.error('Search error:', customError.message);
        return NextResponse.json(
            { error: 'Failed to search bills' },
            { status: 500 }
        );
    }
}