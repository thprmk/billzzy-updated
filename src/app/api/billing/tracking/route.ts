import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth-options';
import { sendOrderStatusSMS } from '@/lib/msg91';

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
  return "Unknown";
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { billId, trackingNumber, weight } = body;
    console.log("data", body);

    if (!billId || !trackingNumber) {
      return NextResponse.json(
        { error: 'Bill ID and tracking number are required' },
        { status: 400 }
      );
    }

    const existingBill = await prisma.transactionRecord.findFirst({
      where: {
        billNo: parseInt(billId),
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
        { error: 'Incorrect Id' },
        { status: 404 }
      );
    }

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

    // Send SMS notification with updated template structure
    if (updatedBill.customer?.phone) {
      const organisationName = updatedBill.organisation.shopName;
      const products = updatedBill.items.map((item) => item.product.name);
      const productList = products.join(', ');
      const shippingPartner = determineShippingPartner(trackingNumber || '');

      const smsVariables = {
        var1: organisationName,          // Organisation Name
        var2: productList,               // Products list
        var3: shippingPartner,          // Courier Name
        var4: trackingNumber,           // Tracking Number (instead of URL)
        var5: organisationName          // Organisation Name again
      };

      await sendOrderStatusSMS({
        phone: updatedBill.customer.phone,
        organisationId: parseInt(session.user.id),
        status: 'shipped',
        smsVariables
      });
    }

    return NextResponse.json({
      success: true,
      data: updatedBill
    });
  } catch (error) {
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
        billNo: parseInt(billId), // Using billNo instead of id
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
  } catch (error) {
    console.error('Error fetching bill:', error);
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