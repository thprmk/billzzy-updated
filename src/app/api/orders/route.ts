// billz/src/app/api/orders/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth-options';
import { sendWhatsAppMessageByOrganisation } from '@/lib/whatsapp';

// --- TYPE DEFINITIONS ---
type OrderStatus = 'pending' | 'printing' | 'packing' | 'tracking' | 'completed';
type DbStatus = 'PENDING' | 'PROCESSING' | 'CONFIRMED' | 'PACKING' | 'SHIPPED' | 'DELIVERED' | 'COMPLETED' | 'CANCELLED';
type WhatsAppTemplateType = 'orderConfirmation' | 'packing' | 'tracking';

interface WhatsAppSentStatus {
  sent: boolean;
  sentAt: string | null;
  status?: string;
}

interface TransformedOrder {
  id: string;
  orderNumber: string;
  customerPhone: string;
  customerName: string;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  amount: number;
  orderDetails: string;
  address: string;
  whatsappSent: {
    orderConfirmation: WhatsAppSentStatus;
    packing: WhatsAppSentStatus;
    tracking: WhatsAppSentStatus;
  };
  serialNumber: number;
}

interface UpdateOrderRequest {
  orderId: string;
  status?: OrderStatus;
  whatsappTemplate?: {
    templateType: WhatsAppTemplateType;
  };
}

// --- HELPER FUNCTIONS ---
function mapDatabaseStatusToOrderStatus(dbStatus: string | null): OrderStatus {
  const statusMap: Record<string, OrderStatus> = {
    'PENDING': 'pending',
    'PROCESSING': 'printing',
    'CONFIRMED': 'printing',
    'PACKING': 'packing',
    'SHIPPED': 'tracking',
    'DELIVERED': 'completed',
    'COMPLETED': 'completed',
    'CANCELLED': 'pending'
  };
  return statusMap[dbStatus?.toUpperCase() as string] || 'pending';
}

function mapOrderStatusToDatabaseStatus(orderStatus: string): DbStatus {
  const statusMap: Record<OrderStatus, DbStatus> = {
    'pending': 'PENDING',
    'printing': 'PROCESSING',
    'packing': 'PACKING',
    'tracking': 'SHIPPED',
    'completed': 'COMPLETED'
  };
  return statusMap[orderStatus as OrderStatus] || 'PENDING';
}

// ✅ FIXED: Exact template type matching
function mapTemplateTypeToKey(templateType: string): keyof TransformedOrder['whatsappSent'] | undefined {
  const normalizedType = templateType.toLowerCase().trim();
  
  // Exact matching for your template types
  switch (normalizedType) {
    case 'orderconfirmation':
    case 'order_confirmation':
    case 'confirmation':
      return 'orderConfirmation';
    case 'packing':
    case 'order_packing':
      return 'packing';
    case 'tracking':
    case 'order_tracking':
    case 'shipped':
      return 'tracking';
    default:
      console.warn(`⚠️ Unknown template type: ${templateType}`);
      return undefined;
  }
}

async function transformAndFetchOrder(orderId: number, organisationId: number): Promise<TransformedOrder> {
  const order = await prisma.transactionRecord.findFirstOrThrow({
    where: { id: orderId, organisationId },
    include: { customer: { select: { name: true, phone: true } } },
  });

  // ✅ FIXED: Get WhatsApp tracking records
  const whatsappTracking = await prisma.whatsapptracker.findMany({
    where: { transactionId: orderId },
  });

  console.log(`🔍 Found ${whatsappTracking.length} WhatsApp records for order ${orderId}`);

  // ✅ FIXED: Initialize all templates as NOT SENT
  const whatsappSent: TransformedOrder['whatsappSent'] = {
    orderConfirmation: { sent: false, sentAt: null },
    packing: { sent: false, sentAt: null },
    tracking: { sent: false, sentAt: null },
  };

  // ✅ FIXED: Only mark as sent if there's a database record
  whatsappTracking.forEach(track => {
    console.log(`🔍 Processing WhatsApp record:`, { 
      templateType: track.templateType, 
      sentAt: track.sentAt 
    });
    
    const key = mapTemplateTypeToKey(track.templateType);
    
    if (key) {
      console.log(`✅ Marking ${track.templateType} as SENT for order ${orderId}`);
      whatsappSent[key] = {
        sent: true,
        sentAt: track.sentAt.toISOString(),
      };
    } else {
      console.warn(`❌ Failed to map template type: ${track.templateType}`);
    }
  });
  
  console.log(`🔍 Final WhatsApp status for order ${orderId}:`, whatsappSent);

  return {
    id: order.id.toString(),
    orderNumber: (order.companyBillNo || order.billNo).toString(),
    customerPhone: order.customer?.phone || '',
    customerName: order.customer?.name || 'Unknown Customer',
    status: mapDatabaseStatusToOrderStatus(order.status),
    createdAt: order.date.toISOString(),
    updatedAt: new Date().toISOString(),
    amount: parseFloat(order.totalPrice.toString()),
    orderDetails: order.notes || 'No details provided',
    address: '',
    whatsappSent,
    serialNumber: 0,
  };
}

// --- API ENDPOINT: GET ---
export async function GET() {
  console.log('GET /api/orders - Request received');
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      console.log('❌ GET /api/orders - Unauthorized: No session found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const organisationId = parseInt(session.user.id, 10);
    if (isNaN(organisationId)) {
      return NextResponse.json({ error: 'Invalid organization ID' }, { status: 400 });
    }

    // ✅ FIXED: Fetch orders and related data efficiently
    const [orders, customers] = await Promise.all([
      prisma.transactionRecord.findMany({
        where: { organisationId },
        select: { 
          id: true, 
          billNo: true, 
          companyBillNo: true, 
          date: true, 
          totalPrice: true, 
          status: true, 
          customerId: true, 
          notes: true 
        },
        orderBy: { date: 'desc' },
      }),
      prisma.customer.findMany({
        where: { organisationId },
        select: { id: true, name: true, phone: true },
      })
    ]);

    if (orders.length === 0) {
      console.log('✅ GET /api/orders - No orders found for this organization.');
      return NextResponse.json([], { status: 200 });
    }
    
    const orderIds = orders.map(o => o.id);
    
    // ✅ FIXED: Get WhatsApp tracking records
    const whatsappTracking = await prisma.whatsapptracker.findMany({
      where: {
        transactionId: {
          in: orderIds
        }
      },
    });

    console.log(`🔍 Found ${whatsappTracking.length} total WhatsApp records`);

    // ✅ FIXED: Create maps for efficient lookup
    const customerMap = new Map(customers.map(c => [c.id, c]));
    const whatsappMap = new Map<number, TransformedOrder['whatsappSent']>();

    // ✅ FIXED: Process WhatsApp tracking records properly
    whatsappTracking.forEach(track => {
      if (!track.transactionId) return;
      
      if (!whatsappMap.has(track.transactionId)) {
        whatsappMap.set(track.transactionId, {
          orderConfirmation: { sent: false, sentAt: null },
          packing: { sent: false, sentAt: null },
          tracking: { sent: false, sentAt: null },
        });
      }
      
      const whatsappStatus = whatsappMap.get(track.transactionId)!;
      const key = mapTemplateTypeToKey(track.templateType);
      
      if (key) {
        console.log(`✅ Setting ${track.templateType} as SENT for order ${track.transactionId}`);
        whatsappStatus[key] = {
          sent: true,
          sentAt: track.sentAt.toISOString(),
        };
      }
    });

    // ✅ FIXED: Transform orders with correct WhatsApp status
    const transformed: TransformedOrder[] = orders.map((order, i) => {
      const customer = customerMap.get(order.customerId || 0);
      const whatsappStatus = whatsappMap.get(order.id) || {
        orderConfirmation: { sent: false, sentAt: null },
        packing: { sent: false, sentAt: null },
        tracking: { sent: false, sentAt: null },
      };

      console.log(`🔍 Order ${order.id} WhatsApp status:`, whatsappStatus);

      return {
        id: order.id.toString(),
        orderNumber: (order.companyBillNo || order.billNo).toString(),
        customerPhone: customer?.phone || '',
        customerName: customer?.name || 'Unknown Customer',
        status: mapDatabaseStatusToOrderStatus(order.status),
        createdAt: order.date.toISOString(),
        updatedAt: order.date.toISOString(),
        amount: parseFloat(order.totalPrice.toString()),
        orderDetails: order.notes || 'No details provided',
        address: '',
        whatsappSent: whatsappStatus,
        serialNumber: i + 1
      };
    });

    console.log(`✅ GET /api/orders - Returning ${transformed.length} orders`);
    console.log('🔍 Sample order WhatsApp status:', transformed[0]?.whatsappSent);
    
    return NextResponse.json(transformed);
  } catch (error: any) {
    console.error('❌ GET /api/orders - Critical Error:', error);
    return NextResponse.json({ error: 'Failed to fetch orders', details: error.message }, { status: 500 });
  }
}

// --- API ENDPOINT: PUT ---
export async function PUT(request: Request) {
  console.log('PUT /api/orders - Request received');
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: UpdateOrderRequest = await request.json();
    const { orderId, status, whatsappTemplate } = body;
    
    const organisationId = parseInt(session.user.id, 10);
    const numericOrderId = parseInt(orderId, 10);
    
    if (!numericOrderId) {
      return NextResponse.json({ error: 'Valid Order ID is required' }, { status: 400 });
    }

    // Handle status update
    if (status) {
      const dbStatus = mapOrderStatusToDatabaseStatus(status);
      await prisma.transactionRecord.update({
        where: { id: numericOrderId, organisationId },
        data: { status: dbStatus }
      });
    }

    // Handle WhatsApp template sending
    if (whatsappTemplate) {
      const { templateType } = whatsappTemplate;
      console.log(`🚀 Processing WhatsApp template: ${templateType} for order ${numericOrderId}`);
      
      // ✅ FIXED: Check for existing record BEFORE sending
      const existingRecord = await prisma.whatsapptracker.findFirst({
        where: {
          transactionId: numericOrderId,
          templateType: templateType
        }
      });

      if (existingRecord) {
        console.log(`⚠️ ${templateType} template already sent for order ${numericOrderId} at ${existingRecord.sentAt}`);
        return NextResponse.json({ 
          error: `${templateType} template has already been sent for this order`,
          alreadySent: true,
          sentAt: existingRecord.sentAt.toISOString()
        }, { status: 400 });
      }

      // Get order details
      const order = await prisma.transactionRecord.findUnique({
        where: { id: numericOrderId, organisationId },
        include: { customer: { select: { phone: true, name: true } } },
      });

      if (!order || !order.customer?.phone) {
        return NextResponse.json({ error: 'Order or customer phone not found' }, { status: 404 });
      }

      // ✅ FIXED: Template configuration
      let templateName = '';
      let variables: string[] = [];
      const customerName = order.customer.name || 'Customer';
      const orderNumber = (order.companyBillNo || order.billNo).toString();
      const orderAmount = order.totalPrice.toString();

      switch (templateType) {
        case 'orderConfirmation':
          templateName = 'order_confirmation_billzzy';
          variables = [customerName, orderNumber, orderAmount];
          break;
        case 'packing':
          templateName = 'order_packing_notification';
          variables = [customerName, orderNumber];
          break;
        case 'tracking':
          templateName = 'order_packed_notification';
          variables = [customerName, orderNumber, 'TRACK123'];
          break;
        default:
          return NextResponse.json({ error: 'Invalid template type' }, { status: 400 });
      }

      console.log(`📱 Sending ${templateType} template:`, { 
        templateName, 
        variables, 
        phone: order.customer.phone 
      });

      try {
        // Send WhatsApp message
        const whatsappResult = await sendWhatsAppMessageByOrganisation({
          organisationId,
          phone: order.customer.phone,
          templateName,
          variables,
        });
        
        console.log(`✅ WhatsApp sent successfully for ${templateType}:`, whatsappResult);
        
        // ✅ FIXED: Store tracking record with exact template type
        const trackerRecord = await prisma.whatsapptracker.create({
          data: {
            transactionId: numericOrderId,
            templateType: templateType, // Store exactly as received
            phoneNumber: order.customer.phone,
            sentAt: new Date(),
          }
        });
        
        console.log(`✅ WhatsApp tracker record created:`, trackerRecord);
        
      } catch (whatsappError: any) {
        console.error(`❌ WhatsApp send failed for ${templateType}:`, whatsappError);
        return NextResponse.json({ 
          error: `Failed to send ${templateType} template`, 
          details: whatsappError.message 
        }, { status: 500 });
      }
    }

    // ✅ FIXED: Return updated order with fresh WhatsApp status
    const updatedTransformedOrder = await transformAndFetchOrder(numericOrderId, organisationId);
    
    console.log(`✅ PUT response - Updated order ${numericOrderId} WhatsApp status:`, 
      updatedTransformedOrder.whatsappSent);
    
    return NextResponse.json(updatedTransformedOrder);
    
  } catch (error: any) {
    console.error('❌ PUT /api/orders - Error:', error);
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Order not found for this organization.' }, { status: 404 });
    }
    return NextResponse.json({ 
      error: 'Failed to update order', 
      details: error.message 
    }, { status: 500 });
  }
}