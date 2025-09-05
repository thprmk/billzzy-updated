// src/app/api/whatsapp/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const QR_TRIGGER_WORD = "Magic Bill";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log("--- INCOMING WHATSAPP MESSAGE ---");
    console.log(JSON.stringify(body, null, 2));

    const message = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

    if (message?.type !== 'text') {
      return NextResponse.json({ status: 'Ignoring non-text message' });
    }

    const messageBody = message.text.body.trim();
    const value = body.entry[0].changes[0].value;
    const businessPhoneNumberId = value.metadata.phone_number_id;
    const contact = value.contacts[0];
    const customerPhone = contact.wa_id;
    const customerName = contact.profile.name;

    const gowhatsConfig = await prisma.gowhats.findFirst({
      where: { phoneNumberId: businessPhoneNumberId },
    });

    if (!gowhatsConfig) {
      console.error(`No organisation found for Phone Number ID: ${businessPhoneNumberId}`);
      return NextResponse.json({ status: 'ok' });
    }

    const { organisationId } = gowhatsConfig;

    if (messageBody === QR_TRIGGER_WORD) {
      console.log(`Trigger Word Matched! Processing customer...`);
      
      // Save customer
      const customer = await prisma.customer.upsert({
        where: { phone_organisationId: { phone: customerPhone, organisationId: organisationId } },
        update: { name: customerName },
        create: { phone: customerPhone, name: customerName, organisationId: organisationId },
      });

      // Save pending scan for polling
      await prisma.pendingCustomerScan.create({
        data: {
          organisationId: organisationId,
          customerName: customerName,
          customerPhone: customerPhone,
        },
      });

      // Find the latest transaction and send WhatsApp message
      const latestTransaction = await prisma.transactionRecord.findFirst({
        where: { 
          organisationId: organisationId,
          status: { in: ['completed', 'partial'] }
        },
        orderBy: { id: 'desc' },
        include: {
          items: {
            include: {
              product: true,
              productVariant: true
            }
          }
        }
      });

      if (latestTransaction) {
        console.log(`Found latest transaction #${latestTransaction.companyBillNo}, sending WhatsApp receipt...`);
        await sendCustomWhatsAppReceiptMessage(
          customerPhone,
          customerName,
          latestTransaction,
          organisationId
        );
      } else {
        console.log('No recent transaction found to send receipt for');
      }

      console.log(`Customer ${customerName} saved and pending scan created.`);
    }

    return NextResponse.json({ status: 'success' });

  } catch (error: any) {
    console.error("CRITICAL ERROR in webhook:", error);
    return NextResponse.json({ status: 'error', error: error.message }, { status: 500 });
  }
}

async function sendCustomWhatsAppReceiptMessage(
  customerPhone: string,
  customerName: string,
  transaction: any,
  organisationId: number
) {
  try {
    console.log('Preparing to send custom WhatsApp receipt...');
    
    const gowhatsConfig = await prisma.gowhats.findFirst({
      where: { organisationId: organisationId },
      include: {
        organisation: true // Include organisation details to get the shop name
      },
    });

    if (!gowhatsConfig?.phoneNumberId || !gowhatsConfig?.accessToken) {
      console.error("WhatsApp config not found for organisation:", organisationId);
      return;
    }
    
    const shopName = gowhatsConfig.organisation.name || 'Our Store';

    let formattedPhone = customerPhone.replace(/\D/g, '');
    if (!formattedPhone.startsWith('91') && formattedPhone.length === 10) {
      formattedPhone = '91' + formattedPhone;
    }

    let productList = 'No items found';
    if (transaction.items && transaction.items.length > 0) {
      productList = transaction.items.map((item: any, index: number) => {
        const productName = item.product?.name || item.productVariant?.name || 'Product';
        return `${index + 1}. ${productName} - Qty: ${item.quantity} - Rs ${item.totalPrice}`;
      }).join('\n');
    }
    
    const header = `*${shopName}*`;
    
    const bodyLines = [
        `Hello ${customerName}!`,
        ``,
        `Bill #${transaction.companyBillNo}`,
        `Date: ${new Date(transaction.date).toLocaleDateString('en-IN')}`,
        `Time: ${new Date(transaction.time).toLocaleTimeString('en-IN')}`,
        ``,
        `*ITEMS PURCHASED:*`,
        productList,
        ``,
        `*TOTAL AMOUNT: Rs ${transaction.totalPrice}*`,
        `PAYMENT: ${transaction.paymentMethod.toUpperCase()}`,
        `PAID: Rs ${transaction.amountPaid}`,
    ];

    if (transaction.balance > 0) {
        bodyLines.push(`BALANCE: Rs ${transaction.balance}`);
    }

    bodyLines.push(
        ``,
        `Thank you for shopping with us!`,
        `For any queries, reply to this message.`
    );
    
    const body = bodyLines.join('\n');

    const footer = "Powered by GoWhats!";

    // Combine the parts with proper spacing for consistent alignment
    const customMessage = `${header}\n\n${body}\n\n${footer}`;

    console.log('Sending custom receipt to:', formattedPhone);

    const payload = {
      messaging_product: "whatsapp",
      to: formattedPhone,
      type: "text",
      text: {
        body: customMessage
      }
    };

    const response = await fetch(
      `https://graph.facebook.com/v18.0/${gowhatsConfig.phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${gowhatsConfig.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }
    );

    const result = await response.json();
    
    if (!response.ok) {
      console.error('Failed to send WhatsApp receipt:', JSON.stringify(result, null, 2));
    } else {
      console.log('Custom WhatsApp receipt sent successfully to:', formattedPhone);
    }
    
  } catch (error) {
    console.error('Exception while sending WhatsApp receipt:', error);
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    console.log("Webhook verified successfully!");
    return new NextResponse(challenge, { status: 200 });
  } else {
    console.error("Webhook verification failed.");
    return new NextResponse(null, { status: 403 });
  }
}