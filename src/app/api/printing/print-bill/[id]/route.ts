// app/api/printing/print-bill/[id]/route.ts
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const billId = parseInt(params.id);
    const organisationId = parseInt(session.user.id);

    const bill = await prisma.transactionRecord.findFirst({
      where: {
        billNo: billId,
        organisationId,
        billingMode: 'online',
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

    if (!bill) {
      return NextResponse.json({ error: 'Bill not found' }, { status: 404 });
    }

    const organisation = await prisma.organisation.findUnique({
      where: { id: organisationId },
    });

    const printData = {
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
    };

    return NextResponse.json(printData);
  } catch (error: any) {
    console.error('Print error:', error.message);
    return NextResponse.json({ error: 'Failed to fetch bill details' }, { status: 500 });
  }
}