// app/api/mandate/execute/route.ts

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { IciciCrypto } from '@/lib/iciciCrypto';

/**
 * Safely parse an ICICI date string like "20250130123545" into a JS Date.
 * Returns null if dateString is missing or invalid.
 */
function parseIciciDate(dateString?: string): Date | null {
  if (!dateString) return null;
  // e.g. "20250130123545" => "2025-01-30T12:35:45"
  const isoString = dateString.replace(
    /(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/,
    '$1-$2-$3T$4:$5:$6'
  );
  return new Date(isoString);
}

/**
 * Adds 1 month to the given date, clamping to the last valid day
 * if the new month is shorter. E.g. Jan 31 → Feb 28/29, etc.
 */
function addOneMonthClamped(date: Date): Date {
  const newDate = new Date(date.getTime());
  const currentDay = newDate.getDate();

  newDate.setMonth(newDate.getMonth() + 1);

  // If we overflowed (e.g. Jan 31 -> Mar 3 for a 28-day February),
  // clamp to the last valid day of that new month (Feb 28 or 29).
  if (newDate.getDate() < currentDay) {
    newDate.setDate(0);
  }
  return newDate;
}

export async function POST() {
  try {
    const now = new Date();
    console.log("Executing mandates at", now);

    // 1. Find mandates that need execution
    const pendingExecutions = await prisma.activeMandate.findMany({
      where: {
        organisation: { endDate: { gte: now } },
        status: 'ACTIVATED',
        notified: true,
        OR: [
          { retryCount: 0 },
          {
            retryCount: { lte: 9 }, // up to 9 retries
            lastAttemptAt: { lt: new Date(now.getTime() - 12 * 60 * 60 * 1000) }
          }
        ]
      },
      include: { organisation: true }
    });

    // 2. Execute each mandate in parallel
    const results = await Promise.all(
      pendingExecutions.map(async (mandate) => {
        try {
          // Build payload
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
            retryCount: mandate.retryCount.toString(),
            mandateSeqNo: mandate.mandateSeqNo.toString(),
            UMN: mandate.UMN,
            purpose: "RECURRING"
          };

          // Encrypt
          const { encryptedKey, iv, encryptedData } = IciciCrypto.encrypt(executePayload);

          // Hit ICICI ExecuteMandate
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
          // Decrypt if present
          const decryptedResponse = responseData?.encryptedData
            ? IciciCrypto.decrypt(
                responseData.encryptedData,
                responseData.encryptedKey,
                responseData.iv
              )
            : null;

          // Check success/failure
          if (!response.ok || !decryptedResponse?.success || decryptedResponse?.success !== "true") {
            console.log('[Execute] Failure or non-success:', decryptedResponse);
            // If 9th retry => reset, else increment
            if (mandate.retryCount >= 1) {
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

          // === SUCCESS ===
          console.log('[Execute] Success:', decryptedResponse);

          // 3. Move organisation endDate by 1 month, clamped to last valid day
          const nextExecutionDate = addOneMonthClamped(new Date(mandate.organisation.endDate));

          // Safely parse any date fields if present (some might be missing)
          const txnInitDate = parseIciciDate(decryptedResponse?.TxnInitDate);
          const txnCompletionDate = parseIciciDate(decryptedResponse?.TxnCompletionDate);

          // DB updates
          await prisma.$transaction([
            // 1) Update activeMandate
            prisma.activeMandate.update({
              where: { id: mandate.id },
              data: {
                mandateSeqNo: { increment: 1 },
                notified: false,
                retryCount: 0,
                lastAttemptAt: now,
                UMN: decryptedResponse?.UMN || mandate.UMN,
                payerName: decryptedResponse?.PayerName || mandate.payerName,
                payerMobile: decryptedResponse?.PayerMobile || mandate.payerMobile
              }
            }),
            // 2) Bump org endDate (with clamp)
            prisma.organisation.update({
              where: { id: mandate.organisationId },
              data: { endDate: nextExecutionDate }
            }),
            // 3) Upsert in mandate table
            prisma.mandate.upsert({
              where: { merchantTranId: executePayload.merchantTranId },
              create: {
                organisationId: mandate.organisationId,
                merchantTranId: executePayload.merchantTranId,
                UMN: decryptedResponse?.UMN || mandate.UMN,
                bankRRN: decryptedResponse?.BankRRN || null,
                amount: mandate.amount,
                status: 'PENDING',
                payerVA: mandate.payerVA,
                payerName: decryptedResponse?.PayerName || mandate.payerName,
                payerMobile: decryptedResponse?.PayerMobile || mandate.payerMobile,
                txnInitDate,
                txnCompletionDate,
                responseCode: decryptedResponse?.ResponseCode || null,
                respCodeDescription: decryptedResponse?.RespCodeDescription || null
              },
              update: {
                UMN: decryptedResponse?.UMN || mandate.UMN,
                bankRRN: decryptedResponse?.BankRRN || null,
                status: 'PENDING',
                payerVA: mandate.payerVA,
                payerName: decryptedResponse?.PayerName || mandate.payerName,
                payerMobile: decryptedResponse?.PayerMobile || mandate.payerMobile,
                txnInitDate,
                txnCompletionDate,
                responseCode: decryptedResponse?.ResponseCode || null,
                respCodeDescription: decryptedResponse?.RespCodeDescription || null
              }
            })
          ]);

          return {
            id: mandate.id,
            status: 'success',
            newSeqNo: mandate.mandateSeqNo + 1,
            retryCount: 0
          };
        } catch (error: any) {
          console.error('Execution error:', error);

          // unexpected error => same approach
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

    // 4. Log results
    console.log('Execution results:', {
      total: results.length,
      successful: results.filter(r => r.status === 'success').length,
      failed: results.filter(r => r.status === 'failed').length,
      retryResets: results.filter(r => r.retryCount === 0).length
    });

    // 5. Return final JSON
    return NextResponse.json({
      success: true,
      processed: results.length,
      successful: results.filter(r => r.status === 'success').length,
      failed: results.filter(r => r.status !== 'success').length,
      results
    });

  } catch (error: any) {
    console.error('Critical error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
