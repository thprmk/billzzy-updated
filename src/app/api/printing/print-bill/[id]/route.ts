// app/api/print-bills/[id]/route.ts

import { authOptions } from "@/lib/auth-options";
import { sendOrderStatusSMS, splitProducts } from "@/lib/msg91";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

        const companyBillId = parseInt(params.id); // This is now the company-specific bill ID


    const organisationId = parseInt(session.user.id);

    const bill = await prisma.transactionRecord.findFirst({
      where: {
        companyBillNo: companyBillId, 
        organisationId,
      },
      include: {
        customer: true,
        items: {
          include: {
            product: true,        // For standard items
            productVariant: {   // Add this for variant items
              include: {
                product: true,  // Also include the parent for the name
              },
            },
          },
        },
        TransactionShipping: true,
      },
    });


    console.log(bill);
    

    if (!bill) {
      return NextResponse.json({ error: 'Bill not found' }, { status: 404 });
    }

    await prisma.transactionRecord.update({
      where: {
        id: bill.id
      },
      data: {
        status: 'printed'
      }
    });

    const organisation = await prisma.organisation.findUnique({
      where: { id: organisationId },
    });

    const tax = await prisma.tax.findFirst({
      where: {
        organisationId,
        autoApply: true
      }
    });
    

    const shippingCost = bill.TransactionShipping[0]?.totalCost || 0;
    const taxAmount = bill.taxAmount || 0;
    const subtotal = bill.totalPrice - taxAmount - shippingCost

    const printData = {
      bill_id: bill.id,
      bill_details: {
        bill_no: bill.companyBillNo, // <-- CHANGE THIS
        date: bill.date.toISOString().split('T')[0],
        time: new Date(bill.time).toLocaleTimeString(),
      },
      customer_details: {
        id: bill.customer?.id,
        name: bill.customer?.name,
        phone: bill.customer?.phone,
        flat_no: bill.customer?.flatNo,
        street: bill.customer?.street,
        district: bill.customer?.district,
        state: bill.customer?.state,
        pincode: bill.customer?.pincode,
      },
      organisation_details: organisation,

      product_details: bill.items.map((item: any) => {
        // If it's a variant, use variant details
        if (item.productVariant) {
          return {
            productName: `${item.productVariant.product.name} (${item.productVariant.size || item.productVariant.color || ''})`.trim(),
            quantity: item.quantity,
            unitPrice: item.productVariant.sellingPrice,
            amount: item.totalPrice,
          };
        }
        // If it's a standard product, use product details
        if (item.product) {
          return {
            productName: item.product.name,
            quantity: item.quantity,
            unitPrice: item.product.sellingPrice,
            amount: item.totalPrice,
          };
        }
        // Fallback in case of bad data
        return {
            productName: 'Product Not Found',
            quantity: item.quantity,
            unitPrice: 0,
            amount: item.totalPrice,
        };
      }),

      shipping_details: bill.TransactionShipping.length!=0 ? {
        method_name: bill.TransactionShipping[0].methodName,
        method_type: bill.TransactionShipping[0].methodType,
        base_rate: bill.TransactionShipping[0].baseRate,
        weight_charge: bill.TransactionShipping[0].weightCharge,
        total_weight: bill.TransactionShipping[0].totalWeight,
        total_cost: bill.TransactionShipping[0].totalCost,
      } : null,

      // If custom shipping exists, include it here as well
      custom_shipping_details: bill.customShippingDetails || null, // Assuming `customShippingDetails` exists in the bill object
    
  // ✅ Add these fields:
      subtotal: subtotal,
      shipping: shippingCost,
      taxAmount: taxAmount,
      taxName: tax?.name || "Tax",
      total: bill.totalPrice
};

    console.log(printData);
    

    const products = bill.items.map((item: any) => {
      if (item.productVariant) {
        return `${item.productVariant.product.name} (${item.productVariant.size || item.productVariant.color || ''})`.trim();
      }
      if (item.product) {
        return item.product.name;
      }
      return 'Unknown Product';
    });
    const productList = products.join(', ');
    const [productsPart1, productsPart2] = splitProducts(productList);



    const smsVariables = {
      var1: organisation?.shopName || '',
      var2: productsPart1,
      var3: productsPart2,
      var4: organisation?.shopName || '',
    };

    if (bill.customer?.phone) {
      await sendOrderStatusSMS({
        phone: bill.customer.phone,
        organisationId: organisationId,
        status: 'packed',
        smsVariables
      });
    }

    revalidatePath('/transactions/online');
    revalidatePath('/dashboard');

    return NextResponse.json(printData);
  } catch (error: any) {
    console.error('Print error:', error.message);
    return NextResponse.json({ error: 'Failed to fetch bill details' }, { status: 500 });
  }
}
