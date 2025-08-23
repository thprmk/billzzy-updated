/*
 * FILE: src/app/api/billing/tracking/route.ts
 * 
 * ENHANCED WITH WHATSAPP INTEGRATION
 * - UPDATED: Sends only WhatsApp notifications for shipped orders.
 * - Uses tenant-specific WhatsApp configuration.
 * - Proper error handling for WhatsApp failures.
 * - FIXED: WhatsApp variables reduced to 7 parameters to match template.
 */
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth-options';
import { splitProducts } from '@/lib/msg91'; // splitProducts is still needed for formatting
import { sendWhatsAppMessageByOrganisation } from '@/lib/whatsapp'; // Import WhatsApp function

// Helper functions remain the same
function determineShippingPartner(trackingNumber: string): string {
  if (trackingNumber.startsWith("CT")) return "INDIA POST";
  if (trackingNumber.startsWith("C1")) return "DTDC";
  if (trackingNumber.startsWith("58")) return "ST COURIER";
  if (trackingNumber.startsWith("500")) return "TRACKON";
  if (trackingNumber.startsWith("10000")) return "TRACKON";
  if (/^10(?!000)/.test(trackingNumber)) return "TRACKON";
  if (trackingNumber.startsWith("SM")) return "SINGPOST";
  if (trackingNumber.startsWith("33")) return "ECOM";
  if (trackingNumber.startsWith("SR") || trackingNumber.startsWith("EP")) return "EKART";
  if (trackingNumber.startsWith("14")) return "XPRESSBEES";
  if (trackingNumber.startsWith("S")) return "SHIP ROCKET";
  if (trackingNumber.startsWith("1")) return "SHIP ROCKET";
  if (trackingNumber.startsWith("7")) return "DELHIVERY";
  if (trackingNumber.startsWith("JT")) return "J&T";
  if (trackingNumber.startsWith("TRZ")) return "PROFESSIONAL COURIER";

  return "Unknown";
}

function getTrackingUrl(shippingPartner: string, trackingNumber: string): string {
  switch (shippingPartner) {
    case "INDIA POST":
      return `https://www.indiapost.gov.in/_layouts/15/dop.portal.tracking/trackconsignment.aspx`;
    case "ST COURIER":
      return `https://stcourier.com/track/shipment`;
    case "DTDC":
      return `https://www.dtdc.in/track`;
    case "TRACKON":
      return `https://trackon.in`;
    case "SHIP ROCKET":
      return `https://www.shiprocket.in/shipment-tracking`;
    case "DELHIVERY":
      return `https://www.delhivery.com/track/package`;
    case "ECOM":
      return `https://ecomexpress.in/tracking`;
    case "EKART":
      return `https://ekartlogistics.com/track`;
    case "XPRESSBEES":
      return `https://www.xpressbees.com/track`;
    case "PROFESSIONAL COURIER":
      return `https://www.tpcindia.com/`;
    default:
      return `https://vaseegrahveda.com/tracking`;
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { billId, trackingNumber, weight } = body;

    if (!billId || !trackingNumber) {
      return NextResponse.json(
        { error: 'Bill ID and tracking number are required' },
        { status: 400 }
      );
    }

    // Find bill using companyBillNo
    const existingBill = await prisma.transactionRecord.findFirst({
      where: {
        companyBillNo: parseInt(billId),
        organisationId: parseInt(session.user.id)
      },
      include: {
        customer: true,
        items: {
          include: {
            product: true
          }
        },
        organisation: true
      }
    });

    if (!existingBill) {
      return NextResponse.json(
        { error: 'Bill not found' },
        { status: 404 }
      );
    }
    
    if (existingBill.billingMode === 'offline') {
      return NextResponse.json(
        { error: 'Tracking cannot be added to offline bills through this endpoint.' },
        { status: 400 }
      );
    }

    // Update bill with tracking details
    const updatedBill = await prisma.transactionRecord.update({
      where: {
        id: existingBill.id
      },
      data: {
        trackingNumber,
        weight: weight ? parseFloat(weight) : null,
        status: 'shipped'
      },
      include: {
        customer: true,
        items: {
          include: {
            product: true
          }
        },
        organisation: true
      }
    });

    // Prepare and send WhatsApp notification
    if (updatedBill.customer?.phone) {
      const organisationName = updatedBill.organisation.shopName;
      const products = updatedBill.items
        .filter((item) => item.product !== null)
        .map((item) => item.product!.name);
      const productList = products.join(', ');
      const [productsPart1, productsPart2] = splitProducts(productList);

      const shippingPartner = determineShippingPartner(trackingNumber || '');
      const trackingUrl = getTrackingUrl(shippingPartner, trackingNumber || '');
      
      const whatsappVariables = [
        organisationName,           // {{1}} - organisationName
        productsPart1,             // {{2}} - productsPart1
        productsPart2,             // {{3}} - productsPart2
        shippingPartner,           // {{4}} - shippingPartner
        trackingNumber,            // {{5}} - trackingNumber (Tracking ID)
        `${weight} Kg`,            // {{6}} - weight with unit
        trackingUrl                // {{7}} - trackingUrl
      ];
      
      const notificationResult = {
        whatsapp: { success: false, error: null as string | null }
      };

      try {
        await sendWhatsAppMessageByOrganisation({
          organisationId: parseInt(session.user.id),
          phone: updatedBill.customer.phone,
          templateName: 'order_shipped_notification',
          variables: whatsappVariables,
          skipValidation: false
        });
        notificationResult.whatsapp.success = true;
        console.log(`✅ WhatsApp notification sent successfully for bill ${billId}`);
      } catch (whatsappError: any) {
        notificationResult.whatsapp.error = whatsappError.message;
        console.error(`❌ WhatsApp notification failed for bill ${billId}:`, whatsappError.message);
        
        if (whatsappError.message.includes('No WhatsApp configuration found')) {
          console.warn(`⚠️  Organisation ${session.user.id} needs WhatsApp configuration setup`);
        }
      }

      return NextResponse.json({
        success: true,
        data: updatedBill,
        notifications: notificationResult
      });
    }

    return NextResponse.json({
      success: true,
      data: updatedBill,
      notifications: {
        whatsapp: { success: false, error: 'No customer phone number' }
      }
    });

  } catch (error: any) {
    console.error('Error details:', error.message);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update tracking details',
        message: error.message
      },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const billId = searchParams.get('billId');

    if (!billId) {
      return NextResponse.json(
        { error: 'Bill ID is required' },
        { status: 400 }
      );
    }

    const bill = await prisma.transactionRecord.findFirst({
      where: {
        companyBillNo: parseInt(billId),
        organisationId: parseInt(session.user.id)
      },
      include: {
        customer: {
          select: {
            name: true,
            phone: true,
            flatNo: true,
            street: true,
            district: true,
            state: true,
            pincode: true
          }
        },
        items: {
          include: {
            product: true
          }
        }
      }
    });

    if (!bill) {
      return NextResponse.json(
        { error: 'Bill not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: bill
    });
  } catch (error: any) {
    console.error('Error fetching bill:', error.message);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch bill details',
        message: error.message
      },
      { status: 500 }
    );
  }
}