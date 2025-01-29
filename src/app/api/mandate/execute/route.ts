// app/api/mandate/execute/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { IciciCrypto } from '@/lib/iciciCrypto';

export async function POST() {
  try {
    const now = new Date();
    console.log("Executing mandates at", now);

    const pendingExecutions = await prisma.activeMandate.findMany({
      where: {
        organisation: { endDate: { gte: now } },
        status: 'ACTIVATED',
        notified: true,
        OR: [
          { retryCount: 0 },
          {
            retryCount: { lte: 9 }, // Include 9th retry
            lastAttemptAt: {
              lt: new Date(now.getTime() - 12 * 60 * 60 * 1000)
            }
          }
        ]
      },
      include: { organisation: true }
    });

    const results = await Promise.all(
      pendingExecutions.map(async (mandate) => {
        try {
          const executePayload = {
            merchantId: "611392",
            subMerchantId: "611392",
            terminalId: "5411",
            merchantName: 'Tech Vaseegrah',
            subMerchantName: mandate.organisation.name,
            amount: mandate.amount.toString(),
            merchantTranId: `EXEC_${Date.now()}_${mandate.id}`,
            billNumber: `BILL_${Date.now()}`,
            remark: "Mandate execution request",
            retryCount: mandate.retryCount.toString(),
            mandateSeqNo: mandate.mandateSeqNo.toString(),
            UMN: mandate.UMN,
            purpose: "RECURRING",
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
          const decryptedResponse = responseData?.encryptedData ?
            IciciCrypto.decrypt(responseData.encryptedData, responseData.encryptedKey, responseData.iv) :
            null;

          if (!response.ok || (!decryptedResponse?.success)) {
            // Handle failure based on retry count
            if (mandate.retryCount >= 9) {
              // If it was the 9th retry and failed, increment seqNo and reset retryCount
              await prisma.activeMandate.update({
                where: { id: mandate.id },
                data: {
                  mandateSeqNo: { increment: 1 },
                  retryCount: 0,
                  lastAttemptAt: now
                }
              });
              return {
                id: mandate.id,
                status: 'failed',
                error: decryptedResponse?.message || 'Execution failed',
                resetRetry: true,
                newSeqNo: mandate.mandateSeqNo + 1
              };
            } else {
              // Normal failure, increment retry count
              await prisma.activeMandate.update({
                where: { id: mandate.id },
                data: {
                  retryCount: { increment: 1 },
                  lastAttemptAt: now
                }
              });
              return {
                id: mandate.id,
                status: 'failed',
                error: decryptedResponse?.message || 'Execution failed',
                retryCount: mandate.retryCount + 1
              };
            }
          }

          // Handle success
          console.log('Execution successful:', decryptedResponse);
          const nextExecutionDate = new Date(mandate.organisation.endDate);
          nextExecutionDate.setMonth(nextExecutionDate.getMonth() + 1);


          await prisma.$transaction([
            prisma.activeMandate.update({
              where: { id: mandate.id },
              data: {
                mandateSeqNo: { increment: 1 },
                notified: false,
                retryCount: 0,
                lastAttemptAt: now,
                // If you want to store updated UMN or payer data from the response:
                UMN: decryptedResponse?.UMN || mandate.UMN,
                payerName: decryptedResponse?.PayerName || mandate.payerName,
                payerMobile: decryptedResponse?.PayerMobile || mandate.payerMobile
              }
            }),
            prisma.organisation.update({
              where: { id: mandate.organisationId },
              data: { endDate: nextExecutionDate }
            }),
            prisma.mandate.create({
              data: {
                organisationId: mandate.organisationId,
                merchantTranId: executePayload.merchantTranId,
                UMN: decryptedResponse?.UMN || mandate.UMN,
                bankRRN: decryptedResponse?.BankRRN,
                amount: mandate.amount,
                status: 'SUCCESS',
                payerVA: mandate.payerVA,
                payerName: decryptedResponse?.PayerName || mandate.payerName,
                payerMobile: decryptedResponse?.PayerMobile || mandate.payerMobile,
                txnInitDate: new Date(decryptedResponse.TxnInitDate.replace(/(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1-$2-$3T$4:$5:$6')),
                txnCompletionDate: new Date(decryptedResponse.TxnCompletionDate.replace(/(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1-$2-$3T$4:$5:$6')),

                responseCode: decryptedResponse?.ResponseCode,
                respCodeDescription: decryptedResponse?.RespCodeDescription
              }
            })
          ]);


          return {
            id: mandate.id,
            status: 'success',
            newSeqNo: mandate.mandateSeqNo + 1,
            retryCount: 0
          };

        } catch (error) {
          console.error('Execution error:', error);
          // Handle unexpected errors same as API failures
          if (mandate.retryCount >= 9) {
            await prisma.activeMandate.update({
              where: { id: mandate.id },
              data: {
                mandateSeqNo: { increment: 1 },
                retryCount: 0,
                lastAttemptAt: now
              }
            });
          } else {
            await prisma.activeMandate.update({
              where: { id: mandate.id },
              data: {
                retryCount: { increment: 1 },
                lastAttemptAt: now
              }
            });
          }
          return {
            id: mandate.id,
            status: 'error',
            error: error.message,
            retryCount: mandate.retryCount >= 9 ? 0 : mandate.retryCount + 1
          };
        }
      })
    );

    console.log('Execution results:', {
      total: results.length,
      successful: results.filter(r => r.status === 'success').length,
      failed: results.filter(r => r.status === 'failed').length,
      retryResets: results.filter(r => r.retryCount === 0).length
    });

    return NextResponse.json({
      success: true,
      processed: results.length,
      successful: results.filter(r => r.status === 'success').length,
      failed: results.filter(r => r.status !== 'success').length,
      results
    });

  } catch (error) {
    console.error('Critical error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}