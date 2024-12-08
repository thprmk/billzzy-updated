// app/api/razorpay/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';

interface WebhookPayload {
  entity: string;
  account_id: string;
  event: string;
  contains: string[];
  payload: {
    payment_link?: {
      entity: {
        reference_id: string;
        payment_id?: string;
        status: string;
        amount: number;
      };
    };
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-razorpay-signature');

    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET!)
      .update(body)
      .digest('hex');

    if (signature !== expectedSignature) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const webhookData = JSON.parse(body) as WebhookPayload;
    const { payload, event } = webhookData;

    switch (event) {
      case 'payment_link.paid': {
        const referenceId = payload.payment_link?.entity.reference_id;
        if (!referenceId) {
          throw new Error('Missing reference_id in payment_link payload');
        }

        const billNo = parseInt(referenceId.replace('BILL-', ''));
        const amount = payload.payment_link.entity.amount / 100;

        await prisma.transactionRecord.update({
          where: { billNo },
          data: {
            amountPaid: amount,
            balance: 0,
            paymentMethod: 'razorpay_link',
            paymentId: payload.payment_link.entity.payment_id,
            paymentStatus: 'PAID'
          }
        });
        break;
      }

      case 'payment_link.failed': {
        const referenceId = payload.payment_link?.entity.reference_id;
        if (!referenceId) {
          throw new Error('Missing reference_id in payment_link payload');
        }

        const billNo = parseInt(referenceId.replace('BILL_', ''));
        await prisma.transactionRecord.update({
          where: { billNo },
          data: {
            paymentMethod: 'razorpay_link',

            paymentStatus: 'FAILED'
          }
        });
        break;
      }

      case 'payment_link.expired': {
        const referenceId = payload.payment_link?.entity.reference_id;
        if (!referenceId) {
          throw new Error('Missing reference_id in payment_link payload');
        }

        const billNo = parseInt(referenceId.replace('BILL_', ''));
        await prisma.transactionRecord.update({
          where: { billNo },
          data: {
            paymentStatus: 'EXPIRED'
          }
        });
        break;
      }
    }

    return NextResponse.json({ status: 'success' });
  } catch (error) {
    console.error('Webhook error:', error.message);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}