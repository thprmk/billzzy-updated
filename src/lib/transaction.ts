// lib/processTransaction.ts

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

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
  try {
    const lastBill = await prisma.transactionRecord.findFirst({
      orderBy: { billNo: 'desc' },
    });
    
    const newBillNumber = (lastBill?.billNo ?? 0) + 1;
    
    logger.info('Generated new bill number', {
      newBillNumber,
      previousBillNumber: lastBill?.billNo
    });
    
    return newBillNumber;
  } catch (error) {
    logger.error('Failed to generate bill number', error, {
      operation: 'generateBillNumber'
    });
    throw error;
  }
}

export async function processTransaction(data: BillRequest, organisationId: number) {
  const transactionId = crypto.randomUUID();
  const traceId = crypto.randomUUID();

  try {
    logger.info('Starting transaction processing', {
      traceId,
      transactionId,
      organisationId,
      customerPhone: data.customerDetails.phone
    });

    let customer = await prisma.customer.findFirst({
      where: {
        phone: data.customerDetails.phone,
        organisationId,
      },
    });

    if (!customer) {
      logger.info('Creating new customer', {
        traceId,
        transactionId,
        phone: data.customerDetails.phone
      });

      customer = await prisma.customer.create({
        data: {
          name: data.customerDetails.name,
          phone: data.customerDetails.phone,
          organisationId,
        },
      });
    }

    const billNo = await generateBillNumber();
    const productIds = data.items.map((item) => item.productId);
    
    logger.info('Fetching products', {
      traceId,
      transactionId,
      productIds,
      billNo
    });

    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
      },
    });

    const productMap = new Map(products.map(product => [product.id, product]));

    // Validate products and stock
    for (const item of data.items) {
      const product = productMap.get(item.productId);
      
      if (!product) {
        logger.error('Product not found', null, {
          traceId,
          transactionId,
          productId: item.productId
        });
        throw new Error(`Product not found: ${item.productId}`);
      }

      if (product.quantity < item.quantity) {
        logger.error('Insufficient stock', null, {
          traceId,
          transactionId,
          productId: item.productId,
          requestedQuantity: item.quantity,
          availableQuantity: product.quantity,
          productName: product.name
        });
        throw new Error(`Insufficient stock for ${product.name}`);
      }
    }

    logger.info('Starting database transaction', {
      traceId,
      transactionId,
      billNo,
      totalItems: data.items.length,
      totalAmount: data.total
    });

    const result = await prisma.$transaction(
      async (tx) => {
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

        // Update product quantities
        for (const item of data.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { quantity: { decrement: item.quantity } },
          });
        }

        // Create transaction items
        await tx.transactionItem.createMany({
          data: data.items.map((item) => ({
            transactionId: transaction.id,
            productId: item.productId,
            quantity: item.quantity,
            totalPrice: item.total,
          })),
        });

        logger.info('Transaction completed successfully', {
          traceId,
          transactionId,
          billNo,
          transactionRecordId: transaction.id
        });

        return transaction.id;
      },
      {
        maxWait: 5000,
        timeout: 10000,
      }
    );

    return result;

  } catch (error) {
    logger.error('Transaction processing failed', error, {
      traceId,
      transactionId,
      organisationId,
      customerPhone: data.customerDetails.phone,
      totalAmount: data.total
    });
    throw error;
  }
}