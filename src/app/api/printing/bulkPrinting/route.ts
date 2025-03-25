// app/api/printing/bulkPrinting/route.ts
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const organisationId = parseInt(session.user.id);

    // Only fetch bills in processing status
    const bills = await prisma.transactionRecord.findMany({
      where: {
        organisationId,
        billingMode: 'online',
        status: 'processing'
      },
      include: {
        customer: true,
        items: {
          include: {
            product: true,
          },
        },
        TransactionShipping: true,
      },
    });

    if (bills.length === 0) {
      return NextResponse.json({ bills: [] });
    }

    const organisation = await prisma.organisation.findUnique({
      where: { id: organisationId },
    });

    const formattedBills = bills.map(bill => ({
      bill_id: bill.id,
      bill_details: {
        bill_no: bill.billNo,
        date: bill.date.toISOString().split('T')[0],
        time: new Date(bill.time).toLocaleTimeString(),
        status: bill.status
      },
      customer_details: {
        id: bill.customer?.id,
        name: bill.customer?.name,
        phone: bill.customer?.phone,
        flat_no: bill.customer?.flatNo,
        street: bill.customer?.street,
        district: bill.customer?.district,
        state: bill.customer?.state,
        pincode: bill.customer?.pincode,
      },
      organisation_details: organisation,
      product_details: bill.items.map(item => ({
        productName: item.product.name,
        quantity: item.quantity,
        unitPrice: item.product.sellingPrice,
        amount: item.totalPrice,
      })),
      shipping_details: bill.TransactionShipping?.[0] ? {
        method_name: bill.TransactionShipping[0].methodName,
        method_type: bill.TransactionShipping[0].methodType,
        base_rate: bill.TransactionShipping[0].baseRate,
        weight_charge: bill.TransactionShipping[0].weightCharge,
        total_weight: bill.TransactionShipping[0].totalWeight,
        total_cost: bill.TransactionShipping[0].totalCost,
      } : null,
      total_amount: bill.totalPrice,
    }));

    return NextResponse.json({ bills: formattedBills });
  } catch (error: any) {
    console.error('Bulk print error:', error.message);
    return NextResponse.json({ error: 'Failed to fetch bills' }, { status: 500 });
  }
}