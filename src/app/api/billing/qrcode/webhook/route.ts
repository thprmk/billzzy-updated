// src/app/api/billing/qrcode/webhook/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// --- TYPE DEFINITIONS (FIX FOR THE FIRST ERROR) ---
// These interfaces correctly define the complex structure of the WhatsApp webhook payload.

interface BSPWebhookPayload {
  object: string;
  entry: Entry[];
}

interface Entry {
  id: string;
  changes: Change[];
}

interface Change {
  value: Value;
  field: string;
}

interface Value {
  messaging_product: string;
  metadata: Metadata;
  contacts: Contact[];
  messages: Message[];
}

interface Metadata {
  display_phone_number: string;
  phone_number_id: string;
}

interface Contact {
  profile: Profile;
  wa_id: string;
}

interface Profile {
  name: string;
}

interface Message {
  from: string;
  id: string;
  timestamp: string;
  text: Text;
  type: string;
}

interface Text {
  body: string;
}

// --- CONSTANT ---
const QR_TRIGGER_WORD = "Magic Bill";


// --- API ROUTE HANDLER ---
export async function POST(request: Request) {
  try {
    const payload: BSPWebhookPayload = await request.json();

    // Safely access nested properties
    const message = payload?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    const metadata = payload?.entry?.[0]?.changes?.[0]?.value?.metadata;

    // 1. Validate that we have a text message with the exact trigger word
    if (!message || message.type !== 'text' || message.text.body.trim() !== QR_TRIGGER_WORD) {
      return NextResponse.json({ success: true, message: 'Not a relevant message.' });
    }

    // 2. Extract tenant and customer details
    const tenantPhoneNumber = metadata?.display_phone_number;
    const customerPhone = message.from;
    const customerName = payload?.entry?.[0]?.changes?.[0]?.value?.contacts?.[0]?.profile?.name || 'Customer';

    if (!tenantPhoneNumber) {
        console.error(`Webhook Error: Could not find tenant phone number in payload.`);
        return NextResponse.json({ success: false, error: 'Invalid payload structure.' });
    }

    // 3. Find which of your tenants this message belongs to
    const gowhatsConfig = await prisma.gowhats.findFirst({
      where: {
        whatsappNumber: tenantPhoneNumber
      }
    });

    if (!gowhatsConfig) {
      console.error(`Webhook Error: Received message for an un-registered number: ${tenantPhoneNumber}`);
      return NextResponse.json({ success: false, error: 'Organisation not found for this number.' });
    }

    // 4. Create the pending scan record (This will now work after the schema change)
    await prisma.pendingCustomerScan.create({
      data: {
        organisationId: gowhatsConfig.organisationId,
        customerName: customerName,
        customerPhone: customerPhone,
      },
    });

    console.log(`Successfully logged pending scan for org ID ${gowhatsConfig.organisationId} from ${customerName}`);
    
    return NextResponse.json({ success: true, status: 'received' }, { status: 200 });

  } catch (error: any) {
    const reqBody = await request.text();
    console.error('Webhook Processing Failed:', error.message, 'Request Body:', reqBody);
    return NextResponse.json({ success: false, error: 'Failed to process webhook' }, { status: 500 });
  }
}

// Your existing GET function for webhook verification remains unchanged.
export async function GET(request: Request) {
    // ...
}