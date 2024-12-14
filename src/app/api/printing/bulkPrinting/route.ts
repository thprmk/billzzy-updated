import { authOptions } from "@/lib/auth-options";
import { sendOrderStatusSMS, splitProducts } from "@/lib/msg91";
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

    const bills = await prisma.transactionRecord.findMany({
      where: {
        organisationId,
        status: 'Processing',
      },
      include: {
        customer: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    await prisma.transactionRecord.updateMany({
      where: {
        id: {
          in: bills.map(bill => bill.id)
        }
      },
      data: {
        status: 'printed'
      }
    });

    const organisation = await prisma.organisation.findUnique({
      where: { id: organisationId },
    });

    const formattedBills = await Promise.all(bills.map(async bill => {
      // Process products for each individual bill
      const products = bill.items.map(item => item.product.name);
      const productList = products.join(', ');
      const [productsPart1, productsPart2] = splitProducts(productList);

      // Prepare SMS variables for this specific bill
      const smsVariables = {
        var1: organisation?.shopName || '',
        var2: productsPart1,
        var3: productsPart2,
        var4: organisation?.shopName || ''
      };

      // Send SMS for this specific bill
      if (bill.customer?.phone) {
        try {
          await sendOrderStatusSMS({
            phone: bill.customer.phone,
            organisationId: organisationId,
            status: 'packed',
            smsVariables
          });
        } catch (error) {
          console.error(`Failed to send SMS for bill ${bill.billNo}:`, error);
        }
      }

      // Return formatted bill data
      return {
        bill_id: bill.id,
        bill_details: {
          bill_no: bill.billNo,
          date: bill.date.toISOString().split('T')[0],
          time: new Date(bill.time).toLocaleTimeString(),
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
        total_amount: bill.totalPrice,
      };
    }));

    revalidatePath('/transactions/online');
    revalidatePath('/dashboard');

    return NextResponse.json({ bills: formattedBills });
  } catch (error: any) {
    console.error('Bulk print error:', error.message);
    return NextResponse.json({ error: 'Failed to fetch bills' }, { status: 500 });
  }
}