// lib/transaction.ts
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

interface BillItem {
  productId: number;
  quantity: number;
  total: number;
}

interface CustomerDetails {
  name: string;
  phone: string;
}

interface PaymentDetails {
  method: string;
  amountPaid: number;
}

interface BillRequest {
  items: BillItem[];
  customerDetails: CustomerDetails;
  paymentDetails: PaymentDetails;
  total: number;
  date: string;
  time: string;
}

const BATCH_SIZE = 50;

async function generateBillNumber(tx: Prisma.TransactionClient): Promise<number> {
  const lastBill = await tx.transactionRecord.findFirst({
    orderBy: { billNo: 'desc' },
  });
  return (lastBill?.billNo ?? 0) + 1;
}

async function validateProducts(tx: Prisma.TransactionClient, items: BillItem[]) {
  const productIds = [...new Set(items.map(item => item.productId))];
  const products = await tx.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, name: true, quantity: true }
  });

  const productMap = new Map(products.map(p => [p.id, p]));
  const quantityMap = new Map<number, number>();

  items.forEach(item => {
    const currentTotal = quantityMap.get(item.productId) || 0;
    quantityMap.set(item.productId, currentTotal + item.quantity);
  });

  for (const [productId, totalQuantity] of quantityMap) {
    const product = productMap.get(productId);
    if (!product) {
      throw new Error(`Product not found: ${productId}`);
    }
    if (product.quantity < totalQuantity) {
      throw new Error(`Insufficient stock for ${product.name}`);
    }
  }

  return { productMap, quantityMap };
}

async function processBatch(
  tx: Prisma.TransactionClient,
  items: BillItem[],
  transactionId: number
) {
  const updatePromises = items.map(item =>
    tx.product.update({
      where: {
        id: item.productId,
        quantity: { gte: item.quantity }
      },
      data: {
        quantity: { decrement: item.quantity }
      }
    })
  );

  const transactionItemPromises = items.map(item =>
    tx.transactionItem.create({
      data: {
        transactionId,
        productId: item.productId,
        quantity: item.quantity,
        totalPrice: item.total
      }
    })
  );

  await Promise.all([...updatePromises, ...transactionItemPromises]);
}

export async function processTransaction(data: BillRequest, organisationId: number) {
  return await prisma.$transaction(async (tx) => {
    let customer = await tx.customer.findFirst({
      where: {
        phone: data.customerDetails.phone,
        organisationId,
      },
    });

    if (!customer) {
      customer = await tx.customer.create({
        data: {
          name: data.customerDetails.name,
          phone: data.customerDetails.phone,
          organisationId,
        },
      });
    }

    await validateProducts(tx, data.items);
    const billNo = await generateBillNumber(tx);

    const transaction = await tx.transactionRecord.create({
      data: {
        billNo,
        totalPrice: data.total,
        billingMode: 'offline',
        paymentMethod: data.paymentDetails.method,
        amountPaid: data.paymentDetails.amountPaid,
        balance: data.paymentDetails.amountPaid - data.total,
        organisationId,
        customerId: customer.id,
        date: new Date(data.date),
        time: new Date(`1970-01-01T${data.time}.000Z`),
        status: 'processing',
      },
    });

    for (let i = 0; i < data.items.length; i += BATCH_SIZE) {
      const batch = data.items.slice(i, i + BATCH_SIZE);
      await processBatch(tx, batch, transaction.id);
    }

    await tx.transactionRecord.update({
      where: { id: transaction.id },
      data: { status: 'confirmed' }
    });

    return transaction.id;
  }, {
    maxWait: 15000,
    timeout: 60000,
    isolationLevel: 'Serializable',
  });
}