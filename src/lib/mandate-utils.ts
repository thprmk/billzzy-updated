// app/api/mandate-utils.ts

import { prisma } from '@/lib/prisma';
import { IciciCrypto } from '@/lib/iciciCrypto';
import cron from 'node-cron';

interface DecryptedResponse {
    success: string;
    BankRRN?: string;
    ResponseCode?: string;
    RespCodeDescription?: string;
    message?: string;
}

const retryJobs = new Map<number, cron.ScheduledTask>();

/** Adds 1 month to the given date, clamping to the last valid day of the next month. */
function addOneMonthClamped(date: Date): Date {
    const newDate = new Date(date.getTime());
    const currentDay = newDate.getDate();
    newDate.setMonth(newDate.getMonth() + 1);
    // If we overflowed (e.g. Jan 31 -> Mar 3), clamp to last day of next month
    if (newDate.getDate() < currentDay) {
        newDate.setDate(0);
    }
    return newDate;
}

export async function executeMandate(mandate: any, UMN: string, retryCount: number = 0) {
    try {
        // 1. Fetch fresh activeMandate data
        const currentMandate = await prisma.activeMandate.findUnique({
            where: { organisationId: mandate.organisationId },
            include: {
                organisation: {
                    select: {
                        id: true,
                        name: true,
                        endDate: true
                    }
                }
            }
        });

        if (!currentMandate) {
            console.error('[Execute] Active mandate not found for org:', mandate.organisationId);
            return false;
        }

        console.log('[Execute] Starting mandate execution:', {
            id: currentMandate.id,
            currentRetry: currentMandate.retryCount,
            seqNo: currentMandate.mandateSeqNo
        });

        // 2. Build the request payload
        const executePayload = {
            merchantId: "611392",
            subMerchantId: "611392",
            terminalId: "5411",
            merchantName: 'Tech Vaseegrah',
            subMerchantName: currentMandate.organisation.name,
            amount: currentMandate.amount.toString(),
            merchantTranId: `EXEC_${Date.now()}_${currentMandate.organisationId}`, // unique ID
            billNumber: `BILL_${Date.now()}`,
            remark: "Mandate execution request",
            retryCount: currentMandate.retryCount.toString(),
            mandateSeqNo: currentMandate.mandateSeqNo.toString(),
            UMN,
            purpose: "RECURRING"
        };

        console.log('[Execute] Request payload:', executePayload);

        // 3. Encrypt the payload
        const { encryptedKey, iv, encryptedData } = IciciCrypto.encrypt(executePayload);

        // 4. Make the API call
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

        // 5. Decrypt response
        const responseData = await response.json();
        let decryptedResponse: DecryptedResponse | null = null;
        if (responseData?.encryptedData) {
            try {
                decryptedResponse = IciciCrypto.decrypt(
                    responseData.encryptedData,
                    responseData.encryptedKey,
                    responseData.iv
                );
                console.log('[Execute] Decrypted response:', decryptedResponse);
            } catch (decryptError) {
                console.error('[Execute] Decryption failed:', decryptError);
            }
        }

        const success = (response.ok && decryptedResponse?.success === "true");
        console.log('[Execute] success?', success);

        // ======= SUCCESS CASE =======
        if (success) {
            if (retryJobs.has(currentMandate.id)) {
                retryJobs.get(currentMandate.id)?.stop();
                retryJobs.delete(currentMandate.id);
            }

            const nextMonth = addOneMonthClamped(new Date());

            try {
                await prisma.$transaction([
                    // (A) Update activeMandate 
                    prisma.activeMandate.update({
                        where: { organisationId: currentMandate.organisationId },
                        data: {
                            status: 'PENDING',
                            retryCount: 0,
                            mandateSeqNo: { increment: 1 },
                            lastAttemptAt: new Date()
                        }
                    }),
                    // (B) Upsert in mandates 
                    prisma.mandate.upsert({
                        where: { merchantTranId: executePayload.merchantTranId },
                        create: {
                            organisationId: currentMandate.organisationId,
                            merchantTranId: executePayload.merchantTranId,
                            bankRRN: decryptedResponse?.BankRRN || null,
                            UMN,
                            amount: currentMandate.amount,
                            status: 'PENDING',
                            payerVA: currentMandate.payerVA,
                            payerName: currentMandate.payerName,
                            payerMobile: currentMandate.payerMobile,
                            txnInitDate: new Date(),
                            txnCompletionDate: new Date(),
                            responseCode: decryptedResponse?.ResponseCode || null,
                            respCodeDescription: decryptedResponse?.RespCodeDescription || 'Execution successful'
                        },
                        update: {
                            // If a row already existed with the same merchantTranId, update it
                            bankRRN: decryptedResponse?.BankRRN || null,
                            UMN,
                            amount: currentMandate.amount,
                            status: 'PENDING',
                            payerVA: currentMandate.payerVA,
                            payerName: currentMandate.payerName,
                            payerMobile: currentMandate.payerMobile,
                            txnInitDate: new Date(),
                            txnCompletionDate: new Date(),
                            responseCode: decryptedResponse?.ResponseCode || null,
                            respCodeDescription: decryptedResponse?.RespCodeDescription || 'Execution successful'
                        }
                    }),
                    // (C) Update organisation endDate
                    prisma.organisation.update({
                        where: { id: currentMandate.organisationId },
                        data: { endDate: nextMonth }
                    })
                ]);

                console.log('[Execute] Success - Updated records');
                return true;
            } catch (dbError) {
                console.error('[Execute] Database update failed:', dbError);
                return false;
            }

            // ======= FAILURE CASE =======
        } else {
            console.log('[Execute] Failure case');
            const newRetryCount = currentMandate.retryCount + 1;

            if (newRetryCount >= 9) {
                console.log('[Execute] Max retries reached, incrementing sequence');

                await prisma.$transaction([
                    prisma.activeMandate.update({
                        where: { organisationId: currentMandate.organisationId },
                        data: {
                            mandateSeqNo: { increment: 1 },
                            retryCount: 0,
                            status: 'INITIATED',
                            lastAttemptAt: new Date()
                        }
                    }),
                    prisma.mandate.upsert({
                        where: { merchantTranId: executePayload.merchantTranId },
                        create: {
                            organisationId: currentMandate.organisationId,
                            merchantTranId: executePayload.merchantTranId,
                            bankRRN: decryptedResponse?.BankRRN || null,
                            UMN,
                            amount: currentMandate.amount,
                            status: 'FAILED',
                            payerVA: currentMandate.payerVA,
                            payerName: currentMandate.payerName,
                            payerMobile: currentMandate.payerMobile,
                            txnInitDate: new Date(),
                            txnCompletionDate: new Date(),
                            responseCode: decryptedResponse?.ResponseCode || null,
                            respCodeDescription: 'Max retry attempts reached'
                        },
                        update: {
                            bankRRN: decryptedResponse?.BankRRN || null,
                            UMN,
                            amount: currentMandate.amount,
                            status: 'FAILED',
                            payerVA: currentMandate.payerVA,
                            payerName: currentMandate.payerName,
                            payerMobile: currentMandate.payerMobile,
                            txnInitDate: new Date(),
                            txnCompletionDate: new Date(),
                            responseCode: decryptedResponse?.ResponseCode || null,
                            respCodeDescription: 'Max retry attempts reached'
                        }
                    })
                ]);

                // if (retryJobs.has(currentMandate.id)) {
                //     retryJobs.get(currentMandate.id)?.stop();
                //     retryJobs.delete(currentMandate.id);
                // }

            } else {
                console.log('[Execute] Scheduling retry:', newRetryCount);

                await prisma.$transaction([
                    prisma.activeMandate.update({
                        where: { organisationId: currentMandate.organisationId },
                        data: {
                            retryCount: newRetryCount,
                            lastAttemptAt: new Date()
                        }
                    }),
                    prisma.mandate.upsert({
                        where: { merchantTranId: executePayload.merchantTranId },
                        create: {
                            organisationId: currentMandate.organisationId,
                            merchantTranId: executePayload.merchantTranId,
                            bankRRN: decryptedResponse?.BankRRN || null,
                            UMN,
                            amount: currentMandate.amount,
                            status: 'FAILED',
                            payerVA: currentMandate.payerVA,
                            payerName: currentMandate.payerName,
                            payerMobile: currentMandate.payerMobile,
                            txnInitDate: new Date(),
                            txnCompletionDate: new Date(),
                            responseCode: decryptedResponse?.ResponseCode || null,
                            respCodeDescription: `Execution failed, attempt ${newRetryCount} of 9`
                        },
                        update: {
                            bankRRN: decryptedResponse?.BankRRN || null,
                            UMN,
                            amount: currentMandate.amount,
                            status: 'FAILED',
                            payerVA: currentMandate.payerVA,
                            payerName: currentMandate.payerName,
                            payerMobile: currentMandate.payerMobile,
                            txnInitDate: new Date(),
                            txnCompletionDate: new Date(),
                            responseCode: decryptedResponse?.ResponseCode || null,
                            respCodeDescription: `Execution failed, attempt ${newRetryCount} of 9`
                        }
                    })
                ]);

                // Schedule a retry job if not already scheduled
                if (!retryJobs.has(currentMandate.id)) {
                    const job = cron.schedule('*/1 * * * *', async () => {
                        const updatedMandate = await prisma.activeMandate.findUnique({
                            where: { organisationId: currentMandate.organisationId },
                            include: { organisation: true }
                        });
                        if (updatedMandate) {
                            await executeMandate(updatedMandate, UMN);
                        }
                    });
                    retryJobs.set(currentMandate.id, job);
                }
            }
            return false;
        }

    } catch (error) {
        console.error('[Execute] Critical error:', error);
        return false;
    }
}
