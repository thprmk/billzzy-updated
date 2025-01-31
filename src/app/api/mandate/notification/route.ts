// app/api/mandate/notification/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { IciciCrypto } from '@/lib/iciciCrypto';

export async function POST() {
 try {
   const now = new Date();
   const notificationWindow = new Date(now.getTime() + 48 * 60 * 60 * 1000);

   console.log('[Notification] Window:', { now, notificationWindow });

   const pendingNotifications = await prisma.activeMandate.findMany({
    where: {
      organisation: {
        endDate: {
          gt: now,
          lte: notificationWindow
        }
      },
      status: 'ACTIVATED',
      notified: false, // Only get unnotified mandates
      OR: [
        // Regular notification check
        {
          mandateSeqNo: { gt: 1 },
          OR: [
            { notificationRetries: 0 },
            {
              notificationRetries: { lt: 3 },
              lastNotificationAttempt: {
                lt: new Date(now.getTime() - 3600000)
              }
            }
          ]
        },
        // Reset condition when retries reach 3
        {
          notificationRetries: 3,
          lastNotificationAttempt: {
            lt: new Date(now.getTime() - 3600000)
          }
        }
      ]
    },
    include: { organisation: true }
  });

   console.log('[Notification] Found mandates:', pendingNotifications.length);

   const results = await Promise.all(
     pendingNotifications.map(async (mandate) => {
       try {
         const notificationPayload = {
           merchantId: "611392",
           subMerchantId: "611392",
           terminalId: "5411",
           merchantName: mandate.organisation.name,
           merchantTranId: `NOTIF_${Date.now()}_${mandate.id}`,
           mandateSeqNo: mandate.mandateSeqNo.toString(),
           executionDate: mandate.organisation.endDate.toISOString(),
           amount: mandate.amount.toString(),
           note: "Mandate notification",
           payerVa: mandate.payerVA,
           value: mandate.UMN
         };

         const { encryptedKey, iv, encryptedData } = IciciCrypto.encrypt(notificationPayload);

         const response = await fetch(
           'https://apibankingonesandbox.icicibank.com/api/MerchantAPI/UPI2/v1/MandateNotification',
           {
             method: 'POST',
             headers: {
               'Content-Type': 'application/json',
               'apikey': process.env.ICICI_API_KEY || "",
             },
             body: JSON.stringify({
               requestId: notificationPayload.merchantTranId,
               service: "MandateNotification",
               encryptedKey,
               iv,
               encryptedData
             })
           }
         );

         const responseData = await response.json();
         const decryptedResponse = responseData?.encryptedData ?
           IciciCrypto.decrypt(responseData.encryptedData, responseData.encryptedKey, responseData.iv) :
           null;

         console.log('[Notification] Response:', decryptedResponse);

         if (response.ok && decryptedResponse?.success === "true") {
           // Reset on success
           await prisma.activeMandate.update({
             where: { id: mandate.id },
             data: {
               notified: true,
               notificationRetries: 0,
               lastNotificationAttempt: now
             }
           });
           return { 
             id: mandate.id, 
             status: 'success',
             retryCount: 0
           };
         }

         // Handle failure
         if (mandate.notificationRetries >= 3) {
           // Reset after 3 failures
           await prisma.activeMandate.update({
             where: { id: mandate.id },
             data: {
               notified: false,
               notificationRetries: 0,
               lastNotificationAttempt: now
             }
           });
           return {
             id: mandate.id,
             status: 'failed',
             retryCount: 0,
             message: 'Retries reset after 3 attempts'
           };
         } else {
           // Increment retry count
           const newRetryCount = mandate.notificationRetries + 1;
           await prisma.activeMandate.update({
             where: { id: mandate.id },
             data: {
               notified: false,
               notificationRetries: newRetryCount,
               lastNotificationAttempt: now
             }
           });
           return {
             id: mandate.id,
             status: 'failed',
             retryCount: newRetryCount
           };
         }

       } catch (error) {
         console.error('[Notification] Error:', error);
         
         if (mandate.notificationRetries >= 3) {
           await prisma.activeMandate.update({
             where: { id: mandate.id },
             data: {
               notified: false,
               notificationRetries: 0,
               lastNotificationAttempt: now
             }
           });
           return {
             id: mandate.id,
             status: 'error',
             retryCount: 0,
             message: `${error.message} - Retries reset`
           };
         } else {
           const newRetryCount = mandate.notificationRetries + 1;
           await prisma.activeMandate.update({
             where: { id: mandate.id },
             data: {
               notified: false,
               notificationRetries: newRetryCount,
               lastNotificationAttempt: now
             }
           });
           return {
             id: mandate.id,
             status: 'error',
             retryCount: newRetryCount,
             message: error.message
           };
         }
       }
     })
   );

   const summary = {
     total: results.length,
     success: results.filter(r => r.status === 'success').length,
     failed: results.filter(r => r.status === 'failed').length,
     error: results.filter(r => r.status === 'error').length,
     resetCount: results.filter(r => r.retryCount === 0).length
   };

   console.log('[Notification] Summary:', summary);

   return NextResponse.json({
     success: true,
     processed: results.length,
     summary,
     results
   });

 } catch (error) {
   console.error('[Notification] Critical error:', error);
   return NextResponse.json({ 
     success: false,
     error: error.message 
   }, { status: 500 });
 }
}