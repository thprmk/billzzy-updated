import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-options';
import { revalidatePath } from 'next/cache';
import { sendOrderStatusSMS, splitProducts } from '@/lib/msg91';

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

    if (!bill) {
      return NextResponse.json({ error: 'Bill not found' }, { status: 404 });
    }

    // Update the bill status to "printed"
    await prisma.transactionRecord.update({
      where: {
        id: bill.id
      },
      data: {
        status: 'printed'
      }
    });

    const organisation = await prisma.organisation.findUnique({
      where: { id: organisationId },
    });

    const printData = {
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
    const products = bill.items.map((item) => item.product.name);
const productList = products.join(', ');
const [productsPart1, productsPart2] = splitProducts(productList);

const smsVariables = {
  var1: organisation?.shopName || '',
  var2: productsPart1,
  var3: productsPart2,
  var4: organisation?.shopName || ''
};

await sendOrderStatusSMS({
  phone: bill.customer?.phone || '',
  organisationId: parseInt(session.user.id),
  status: 'packed',
  smsVariables
});
    revalidatePath('/transactions/online');
    revalidatePath('/dashboard');

    return NextResponse.json(printData);
  } catch (error: any) {
    console.error('Print error:', error.message);
    return NextResponse.json({ error: 'Failed to fetch bill details' }, { status: 500 });
  }
}