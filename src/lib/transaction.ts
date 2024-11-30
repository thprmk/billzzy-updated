// lib/processTransaction.ts

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

async function generateBillNumber(): Promise<number> {
  const lastBill = await prisma.transactionRecord.findFirst({
    orderBy: { billNo: 'desc' },
  });
  return (lastBill?.billNo ?? 0) + 1;
}

export async function processTransaction(data: BillRequest, organisationId: number) {
  // 1. Find or Create Customer (outside transaction)
  let customer = await prisma.customer.findFirst({
    where: {
      phone: data.customerDetails.phone,
      organisationId,
    },
  });

  if (!customer) {
    customer = await prisma.customer.create({
      data: {
        name: data.customerDetails.name,
        phone: data.customerDetails.phone,
        organisationId,
      },
    });
  }

  // 2. Generate Bill Number (outside transaction)
  const billNo = await generateBillNumber();

  // 3. Batch Fetch Products (outside transaction)
  const productIds = data.items.map((item) => item.productId);
  const products = await prisma.product.findMany({
    where: {
      id: { in: productIds },
    },
  });

  const productMap = new Map<number, any>();
  products.forEach((product) => {
    productMap.set(product.id, product);
  });

  // 4. Validate Products and Stock (outside transaction)
  for (const item of data.items) {
    const product = productMap.get(item.productId);
    if (!product) {
      throw new Error(`Product not found: ${item.productId}`);
    }
    if (product.quantity < item.quantity) {
      throw new Error(`Insufficient stock for ${product.name}`);
    }
  }

  // 5. Begin Transaction
  return await prisma.$transaction(
    async (tx) => {
      // 6. Create Transaction Record
      const transaction = await tx.transactionRecord.create({
        data: {
          billNo,
          totalPrice: data.total,
          billingMode: 'offline',
          paymentMethod: data.paymentDetails.method,
          amountPaid: data.paymentDetails.amountPaid,
          balance: data.paymentDetails.amountPaid - data.total,
          organisationId,
          customerId: customer!.id,
          date: new Date(data.date),
          time: new Date(`1970-01-01T${data.time}.000Z`),
          status: 'confirmed',
        },
      });

      // 7. Update Product Quantities Sequentially
      for (const item of data.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { quantity: { decrement: item.quantity } },
        });
      }

      // 8. Create Transaction Items in Bulk
      await tx.transactionItem.createMany({
        data: data.items.map((item) => ({
          transactionId: transaction.id,
          productId: item.productId,
          quantity: item.quantity,
          totalPrice: item.total,
        })),
      });

      return transaction.id;
    },
    {
      maxWait: 5000, // Adjust if necessary
      timeout: 10000, // Adjust if necessary
      // Remove or adjust the isolationLevel
      // isolationLevel: 'Serializable',
    }
  );
}
