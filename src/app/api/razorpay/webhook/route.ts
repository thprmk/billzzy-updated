// app/api/razorpay/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';


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

async function sendMsg91SMS(phone: string, variables: Record<string, string>) {

  return
console.log(phone,variables,"variables phone for status");


  try {
    const response = await fetch('https://api.msg91.com/api/v5/flow/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'authkey': process.env.MSG91_AUTH_KEY!
      },
      body: JSON.stringify({
        template_id: process.env.MSG91_TEMPLATE_ID,
        short_url: "1",
        recipients: [{
          mobiles: phone.startsWith('91') ? phone : `91${phone}`,
          ...variables
        }]
      })
    });

    const data = await response.json();
    console.log('MSG91 Response:', data);
    return data;
  } catch (error) {
    console.error('SMS sending failed:', error);
    throw error;
  }
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

        const transaction = await prisma.transactionRecord.update({
          where: { billNo },
          data: {
            amountPaid: amount,
            balance: 0,
            paymentMethod: 'razorpay_link',
            paymentId: payload.payment_link.entity.payment_id,
            paymentStatus: 'PAID'
          },
          include: {
            customer: true,
            organisation: true
          }
        });

        await sendMsg91SMS(
          transaction.customer.phone,
          {
            var1: "Payment Successful",
            var2: `BILL-${billNo}`,
            var3: amount.toFixed(2),
            var4: transaction.organisation.mobileNumber
          }
        );

        revalidatePath('/transactions/online');
        revalidatePath('/dashboard');
        break;
      }

      case 'payment.failed': {
        const referenceId = payload.payment?.entity.notes.reference_id;
        if (!referenceId) {
          throw new Error('Missing reference_id in payment_link payload');
        }

        const billNo = parseInt(referenceId.replace('BILL-', ''));

        const transaction = await prisma.transactionRecord.update({
          where: { billNo },
          data: {
            paymentMethod: 'razorpay_link',
            paymentStatus: 'FAILED'
          },
          include: {
            customer: true,
            organisation: true
          }
        });

        await sendMsg91SMS(
          transaction.customer.phone,
          {
            var1: "Payment Failed",
            var2: `BILL-${billNo}`,
            var3: transaction.totalPrice.toFixed(2),
            var4: transaction.organisation.mobileNumber
          }
        );

        revalidatePath('/transactions/online');
        revalidatePath('/dashboard');
        break;
      }

      case 'payment_link.expired': {
        const referenceId = payload.payment_link?.entity.reference_id;
        if (!referenceId) {
          throw new Error('Missing reference_id in payment_link payload');
        }

        const billNo = parseInt(referenceId.replace('BILL-', ''));

        const transaction = await prisma.transactionRecord.update({
          where: { billNo },
          data: {
            paymentStatus: 'EXPIRED'
          },
          include: {
            customer: true,
            organisation: true
          }
        });

        await sendMsg91SMS(
          transaction.customer.phone,
          {
            var1: "Payment Link Expired",
            var2: `BILL-${billNo}`,
            var3: transaction.amount.toFixed(2),
            var4: transaction.organisation.mobileNumber
          }
        );

        revalidatePath('/transactions/online');
        revalidatePath('/dashboard');
        break;
      }
    }

    return NextResponse.json({ status: 'success' });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed', message: error.message }, { status: 500 });
  }
}