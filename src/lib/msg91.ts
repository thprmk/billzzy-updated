import { prisma } from "./prisma";
import { splitAddressIntoThreeParts } from "@/lib/utils"
import { createRazorpayPaymentLink, getValidAccessToken } from "./razorpayToken";

interface BillingSMSParams {
  phone: string;
  companyName: string;
  products: string;
  amount: number;
  address: string;
  organisationId: number;
}

interface SMSConfig {
  authkey: string;

}

const MSG91_CONFIG: SMSConfig = {
  authkey: process.env.MSG91_AUTH_KEY || ''

};

const url = 'https://control.msg91.com/api/v5/flow/';
// const url = 'https://control.msg91.com//v5//'



export function splitProducts(products: string) {
  const maxLength = 30; // Adjust based on your needs
  const middleIndex = Math.ceil(products.length / 2);
  return [
    products.slice(0, middleIndex),
    products.slice(middleIndex)
  ];
}

export async function sendBillingSMS({ 
  phone, 
  companyName, 
  products, 
  amount, 
  address, 
  organisationId, 
  billNo 
}: BillingSMSParams & { billNo: number }) {
  try {
    // Check if organization has Razorpay integration
    const organisation = await prisma.organisation.findUnique({
      where: { id: organisationId },
      select: { razorpayAccountId: true, razorpayAccessToken: true }
    });

    let paymentLink = '';
    
    // If organization has Razorpay integration, create payment link
    if (organisation?.razorpayAccessToken) {
      try {
        const accessToken = await getValidAccessToken(organisationId);
        const paymentLinkResponse = await createRazorpayPaymentLink(accessToken, {
          amount,
          customerPhone: phone,
          description: `Bill #${billNo} - ${products} from ${companyName}`,
          billNo
        });
        paymentLink = paymentLinkResponse.short_url;
        console.log(paymentLink,"payment link");
        
      } catch (error) {
        console.error('Razorpay payment link creation failed:', error);
      }
    }

    const [productsPart1, productsPart2] = splitProducts(products);
    const [addressPart1, addressPart2, addressPart3] = splitAddressIntoThreeParts(address);

    // Choose template and variables based on payment link existence
    let template_id, variables;
    
    if (paymentLink) {
      // Template with payment link - keep original variable structure
      template_id = '67517b94d6fc0556e76f4e12';
      variables = {
        var1: companyName,
        var2: productsPart1,
        var3: productsPart2 || '',
        var4: amount.toFixed(2),
        var5: paymentLink,
        var6: addressPart1,
        var7: addressPart2,
        var8: addressPart3
      };
    } else {
      // Template without payment link - use sequential numbering with ## format
      template_id = '6751a899d6fc0508417cdff2';
      variables = {
        var1: companyName,            // Company name
        var2: productsPart1,          // Products part 1
        var3: productsPart2 || '',    // Products part 2
        var4: amount.toFixed(2),      // Amount
        var5: addressPart1,           // Address part 1
        var6: addressPart2,           // Address part 2
        var7: addressPart3            // Address part 3
      };
    }

    if (paymentLink) {
      await prisma.transactionRecord.update({
        where: { billNo },
        data: { paymentMethod: 'razorpay_link' }
      });
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'authkey': process.env.MSG91_AUTH_KEY as string
      },
      body: JSON.stringify({
        template_id,
        short_url: "0",
        recipients: [{
          mobiles: `91${phone}`,
          ...variables
        }]
      })
    });

    console.log(response, 'smsmsg');
    
    if (!response.ok) {
      throw new Error(`SMS sending failed: ${response.statusText}`);
    }

    // Update transaction if payment link exists
    if (paymentLink) {
      await prisma.transactionRecord.update({
        where: { billNo },
        data: { paymentMethod: 'razorpay_link' }
      });
    }

    // Update SMS count
    await prisma.organisation.update({
      where: { id: organisationId },
      data: { smsCount: { increment: 1 } }
    });

    return { success: true };
  } catch (error) {
    console.error('SMS sending error:', error);
    throw error;
  }
}


async function updateSMSCount(organisationId: number) {
  try {
    await prisma.organisation.update({
      where: { id: organisationId },
      data: {
        smsCount: {
          increment: 1
        },
        smsCost: {
          increment: 0.30 // Cost per SMS in rupees
        }
      }
    });
  } catch (error) {
    console.error('Error updating SMS count:', error);
  }
}


export async function sendOrderStatusSMS({
  phone,
  organisationId,
  status,
  smsVariables
}: {
  phone: string;
  organisationId: number;
  status: string;
  smsVariables: { [key: string]: string };
}) {
  const templates = {
    packed: process.env.ORDER_PACKED_TEMPLATE_ID,
    dispatch: process.env.ORDER_DISPATCH_TEMPLATE_ID,
    shipped: process.env.ORDER_SHIPPED_TEMPLATE_ID
  };

  const templateId = templates[status];

  if (!templateId) {
    throw new Error(`Template ID not found for status: ${status}`);
  }

  try {



    const response = await fetch(url, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        authkey: MSG91_CONFIG.authkey
      },
      body: JSON.stringify({
        flow_id: templateId,
        recipients: [
          {
            mobiles: `91${phone}`,
            ...smsVariables
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`Status SMS sending failed: ${response.statusText}`);
    }

    await updateSMSCount(organisationId);
    return await response.json();
  } catch (error) {
    console.error('Status SMS sending error:', error);
    throw error;
  }
}

