// app/api/mandate-utils.ts
import { prisma } from '@/lib/prisma';
import { IciciCrypto } from '@/lib/iciciCrypto';
import cron from 'node-cron';

const retryJobs = new Map<number, cron.ScheduledTask>();

/**
 * Increments a date by one month, clamping to the last valid day
 * if the month is shorter. 
 * e.g. Jan 31 -> Feb 28/29, Mar 31 -> Apr 30, etc.
 */
function addOneMonthClamped(date: Date): Date {
  const newDate = new Date(date.getTime());
  const currentDay = newDate.getDate();
  newDate.setMonth(newDate.getMonth() + 1);

  if (newDate.getDate() < currentDay) {
    // If overflowed into the next month, clamp to the last valid day of the new month
    newDate.setDate(0);
  }
  return newDate;
}

export async function executeMandate(mandate: any, UMN: string, retryCount: number = 0) {
  try {
    console.log(`Executing mandate ${mandate.id}, retry ${retryCount}`);

    const executePayload = {
      merchantId: "611392",
      subMerchantId: "611392",
      terminalId: "5411",
      merchantName: 'Tech Vaseegrah',
      subMerchantName: mandate.organisation.name,
      amount: mandate.amount.toString(),
      merchantTranId: `EXEC_${Date.now()}_${mandate.organisationId}`,
      billNumber: `BILL_${Date.now()}`,
      remark: "Mandate execution request",
      retryCount: retryCount.toString(),
      mandateSeqNo: "1",
      UMN,
      purpose: "RECURRING"
    };

    const { encryptedKey, iv, encryptedData } = IciciCrypto.encrypt(executePayload);

    const response = await fetch(
      'https://apibankingonesandbox.icicibank.com/api/MerchantAPI/UPI2/v1/ExecuteMandate',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.ICICI_API_KEY || "",
        },
        body: JSON.stringify({
          requestId: executePayload.merchantTranId,
          service: "ExecuteMandate",
          encryptedKey,
          iv,
          encryptedData
        })
      }
    );

    const responseData = await response.json();
    const decryptedResponse = responseData?.encryptedData 
      ? IciciCrypto.decrypt(responseData.encryptedData, responseData.encryptedKey, responseData.iv) 
      : null;

    console.log('Execute Response:', decryptedResponse);

    // ============== SUCCESS CASE ==============
    if (response.ok && decryptedResponse?.success === "true") {
      // If a scheduled retry job exists, stop it
      if (retryJobs.has(mandate.id)) {
        retryJobs.get(mandate.id)?.stop();
        retryJobs.delete(mandate.id);
      }

      // Use the clamped approach:
      // If today is Jan 31, this becomes Feb 28/29 (leap year).
      // If today is Mar 31, this becomes Apr 30, etc.
      const nextMonth = addOneMonthClamped(new Date());

      await prisma.$transaction([
        prisma.activeMandate.update({
          where: { organisationId: mandate.organisationId },
          data: {
            status: 'PENDING',
            retryCount: 0,
            lastAttemptAt: new Date(),
            payerName: mandate.payerName,
            payerMobile: mandate.payerMobile,
            UMN
          }
        }),
        prisma.mandate.create({
          data: {
            organisationId: mandate.organisationId,
            merchantTranId: executePayload.merchantTranId,
            bankRRN: decryptedResponse.BankRRN,
            UMN,
            amount: mandate.amount,
            status: 'PENDING',
            payerVA: mandate.payerVA,
            payerName: mandate.payerName,
            payerMobile: mandate.payerMobile,
            txnInitDate: new Date(),       // or parse from decryptedResponse if available
            txnCompletionDate: new Date(), // or parse from decryptedResponse if available
            responseCode: decryptedResponse.ResponseCode,
            respCodeDescription: decryptedResponse.RespCodeDescription
          }
        }),
        prisma.organisation.update({
          where: { id: mandate.organisationId },
          data: { endDate: nextMonth }
        })
      ]);

      return true;
    }

    // ============== FAILURE CASE ==============
    else {
      // Some error or success === false from the bank side
      if (retryCount >= 9) {
        // After 9 attempts, increment seqNo and reset
        await prisma.$transaction([
          prisma.activeMandate.update({
            where: { organisationId: mandate.organisationId },
            data: {
              mandateSeqNo: { increment: 1 },
              retryCount: 0,
              status: 'INITIATED',
              lastAttemptAt: new Date()
            }
          }),
          prisma.mandate.create({
            data: {
              organisationId: mandate.organisationId,
              merchantTranId: executePayload.merchantTranId,
              bankRRN: decryptedResponse?.BankRRN || null,
              UMN,
              amount: mandate.amount,
              status: 'FAILED',
              payerVA: mandate.payerVA,
              payerName: mandate.payerName,
              payerMobile: mandate.payerMobile,
              txnInitDate: new Date(),
              txnCompletionDate: new Date(),
              responseCode: decryptedResponse?.ResponseCode || null,
              respCodeDescription: decryptedResponse?.RespCodeDescription || 'Max retry attempts reached'
            }
          })
        ]);
        
        // Stop any retry job
        retryJobs.get(mandate.id)?.stop();
        retryJobs.delete(mandate.id);
      } else {
        // Normal failure, increment retryCount and schedule a retry
        await prisma.$transaction([
          prisma.activeMandate.update({
            where: { organisationId: mandate.organisationId },
            data: {
              retryCount: retryCount + 1,
              lastAttemptAt: new Date()
            }
          }),
          prisma.mandate.create({
            data: {
              organisationId: mandate.organisationId,
              merchantTranId: executePayload.merchantTranId,
              bankRRN: decryptedResponse?.BankRRN || null,
              UMN,
              amount: mandate.amount,
              status: 'FAILED',
              payerVA: mandate.payerVA,
              payerName: mandate.payerName,
              payerMobile: mandate.payerMobile,
              txnInitDate: new Date(),
              txnCompletionDate: new Date(),
              responseCode: decryptedResponse?.ResponseCode || null,
              respCodeDescription: decryptedResponse?.RespCodeDescription || 'Execution failed, retry scheduled'
            }
          })
        ]);

        // If we haven't scheduled a retry job yet, schedule one
        if (!retryJobs.has(mandate.id)) {
          const job = cron.schedule('*/1 * * * *', () => {
            executeMandate(mandate, UMN, retryCount + 1);
          });
          retryJobs.set(mandate.id, job);
        }
      }
      return false;
    }
  } catch (error) {
    console.error('Execute error:', error);
    return false;
  }
}
