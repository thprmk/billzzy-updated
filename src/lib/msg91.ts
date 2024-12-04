import { prisma } from "./prisma";
import { splitAddressIntoThreeParts} from "@/lib/utils"

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
  

  
  export async function sendBillingSMS({
    phone,
    companyName,
    products,
    amount,
    address,
    organisationId
  }: BillingSMSParams) {
    try {

      
      const url = 'https://control.msg91.com/api/v5/flow/';
      // const url = 'https://control.msg91.';

      
      // Split address into three parts
      const [addressPart1, addressPart2, addressPart3] = splitAddressIntoThreeParts(address);
  
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
          'authkey': process.env.MSG91_AUTH_KEY as string
        },
        body: JSON.stringify({
          template_id: '67361008d6fc0574687426d4',
          short_url: "0",
          recipients: [{
            mobiles: `91${phone}`,
            var1: companyName,
            var2: products,
            var3: amount.toFixed(2),
            var4: addressPart1,
            var5: addressPart2,
            var6: addressPart3
          }]
        })
      });
  
      if (!response.ok) {
        throw new Error(`SMS sending failed: ${response.statusText}`);
      }
  
      // Update SMS count for the organization
      await prisma.organisation.update({
        where: { id: organisationId },
        data: {
          smsCount: {
            increment: 1
          }
        }
      });
      
  
      return await response.json();
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

      
      const url = 'https://control.msg91.com/api/v5/flow/';
      // const url = 'https://control.msg91.';

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
  
