// app/api/billing/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-options';
import { DatabaseService } from '@/lib/database-service';


// lib/utils.ts
import moment from 'moment-timezone';

export function getCurrentIndianDateTime() {
    const indianDateTime = moment().tz('Asia/Kolkata');
    return {
        date: indianDateTime.format('YYYY-MM-DD'),
        time: indianDateTime.format('HH:mm:ss')
    };
}

export interface BillItem {
  productId: number;
  quantity: number;
  total: number;
}

export interface CustomerDetails {
  name: string;
  phone: string;
}

export interface PaymentDetails {
  method: string;
  amountPaid: number;
}

export interface BillRequest {
  items: BillItem[];
  customerDetails: CustomerDetails;
  paymentDetails: PaymentDetails;
  total: number;
}

export async function POST(request: Request) {
    const dbService = DatabaseService.getInstance();
    const prisma = dbService.getPrisma();

    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const data: BillRequest = await request.json();
        const organisationId = parseInt(session.user.id, 10);
        const { date, time } = getCurrentIndianDateTime();

        const result = await dbService.executeTransaction(async () => {
            // Find or create customer
            let customer = await prisma.customer.findFirst({
                where: {
                    phone: data.customerDetails.phone,
                    organisationId,
                }
            });

            if (!customer) {
                customer = await prisma.customer.create({
                    data: {
                        name: data.customerDetails.name,
                        phone: data.customerDetails.phone,
                        organisationId,
                    }
                });
            }

            // Generate bill number
            const lastBill = await prisma.transactionRecord.findFirst({
                orderBy: { billNo: 'desc' },
            });
            const billNo = (lastBill?.billNo ?? 0) + 1;

            // Create transaction record
            const transaction = await prisma.transactionRecord.create({
                data: {
                    billNo,
                    totalPrice: data.total,
                    billingMode: 'offline',
                    paymentMethod: data.paymentDetails.method,
                    amountPaid: data.paymentDetails.amountPaid,
                    balance: data.paymentDetails.amountPaid - data.total,
                    organisationId,
                    customerId: customer.id,
                    date: new Date(date),
                    time: new Date(`1970-01-01T${time}.000Z`),
                    status: 'confirmed',
                }
            });

            // Process items and update inventory
            for (const item of data.items) {
                const product = await prisma.product.findUnique({
                    where: { id: item.productId }
                });

                if (!product) {
                    throw new Error(`Product not found: ${item.productId}`);
                }

                if (product.quantity < item.quantity) {
                    throw new Error(`Insufficient stock for ${product.name}`);
                }

                await prisma.product.update({
                    where: { 
                        id: item.productId,
                        quantity: { gte: item.quantity }
                    },
                    data: { 
                        quantity: { decrement: item.quantity }
                    }
                });

                await prisma.transactionItem.create({
                    data: {
                        transactionId: transaction.id,
                        productId: item.productId,
                        quantity: item.quantity,
                        totalPrice: item.total
                    }
                });
            }

            return transaction;
        });

        // Fetch complete bill details
        const bill = await prisma.transactionRecord.findUnique({
            where: { id: result.id },
            include: {
                organisation: true,
                customer: true,
                items: {
                    include: {
                        product: true,
                    },
                },
            },
        });

        return NextResponse.json({
            success: true,
            data: bill
        });

    } catch (error: any) {
        console.error('Transaction Error:', error);
        
        return NextResponse.json({
            success: false,
            error: 'Transaction processing failed',
            details: error.message
        }, { status: 500 });
    }
}