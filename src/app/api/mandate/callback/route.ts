// app/api/mandate/callback/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { IciciCrypto } from '@/lib/iciciCrypto';
import { executeMandate } from '@/lib/mandate-utils';
import { createNotification } from '@/lib/utils/createNotification';
import { revalidatePath } from 'next/cache';  // <-- import from next/cache

interface MandateCallback {
  subMerchantId: string;
  ResponseCode: string;
  PayerMobile: string;
  TxnCompletionDate: string;
  terminalId: string;
  PayerName: string;
  PayerAmount: string;
  PayerVA: string;
  BankRRN: string;
  merchantId: string;
  UMN: string;
  TxnInitDate: string;
  TxnStatus: string;
  merchantTranId: string;     // e.g. "MANDATE_1738155932830" or "EXEC_..." or "ICI..."
  RespCodeDescription: string;
  PayeeVPA: string;
}

function isExecuteCallback(mTranId: string) {
  return mTranId.startsWith('EXEC_') || mTranId.startsWith('ICI');
}

/** 
 * Helper to parse ICICI date strings in YYYYMMDDhhmmss into a JS Date.
 * For example: "20250126154336" => "2025-01-26T15:43:36"
 */
function parseIciciDate(dateString: string) {
  if (!dateString) return null;
  // dateString e.g. "20250126154336" => "2025-01-26T15:43:36"
  const isoString = dateString.replace(
    /(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/,
    '$1-$2-$3T$4:$5:$6'
  );
  return new Date(isoString);
}

export async function POST(request: Request) {
  try {
    const encryptedCallback = await request.json();

    console.log('Encrypted callback from callback:', encryptedCallback);

    let callbackData: MandateCallback;

    // 1. Decrypt if needed
    if (encryptedCallback?.encryptedData) {
      if (!encryptedCallback.encryptedKey) {
        throw new Error('Missing encrypted key');
      }
      callbackData = IciciCrypto.decrypt(
        encryptedCallback.encryptedData,
        encryptedCallback.encryptedKey,
        encryptedCallback.iv || ''
      );
    } else {
      callbackData = encryptedCallback;
    }

    console.log('Decrypted callback:', callbackData);



    if (callbackData.TxnStatus === 'REVOKE-SUCCESS') {
      // Find an associated mandate to get the organisationId (using UMN)
      const revokedMandate = await prisma.activeMandate.findFirst({
        where: { UMN: callbackData.UMN }
      });
    
      if (!revokedMandate) {
        return NextResponse.json(
          { error: 'Mandate not found for revoke-success.' },
          { status: 404 }
        );
      }
    
      const organisationId = revokedMandate.organisationId;
    
      // Send a notification about the revocation
      await createNotification(
        organisationId,
        'MANDATE_REVOKED',
        'Your mandate has been successfully revoked. Subscription reverted to trial.'
      );
    
      console.log('Revoke-Success for Org:', organisationId);
    
      // Calculate next month's date for the trial endDate
      const nextMonthDate = new Date();
      nextMonthDate.setMonth(nextMonthDate.getMonth() + 1); // +1 month
    
      // Run a transaction to delete all mandate records for this organisation,
      // delete the active mandate, and update the organisation.
      await prisma.$transaction([
        // Delete all mandate records associated with the organisation
        prisma.mandate.deleteMany({
          where: { organisationId }
        }),
        // Delete the active mandate record (organisationId is unique here)
        prisma.activeMandate.delete({
          where: { organisationId }
        }),
        // Update the organisation's subscription and endDate
        prisma.organisation.update({
          where: { id: organisationId },
          data: {
            subscriptionType: 'trial',
            endDate: nextMonthDate // The schema stores it in UTC
          }
        })
      ]);

    
      return NextResponse.json({
        success: true,
        message: 'Mandate revoked successfully; all mandate records deleted and subscription reverted to trial.',
      });
    }
    

    // ----- Execute Mandate Callback Handling -----
    if (isExecuteCallback(callbackData.merchantTranId)) {

      console.log('Execute callback received:', callbackData);

      // For execute mandate, consider it success only when:
      //    TxnStatus === 'SUCCESS'
      // AND RespCodeDescription === 'APPROVED OR COMPLETED SUCCESSFULLY'
      const isSuccess =
        callbackData.TxnStatus === 'SUCCESS' &&
        callbackData.RespCodeDescription === 'APPROVED OR COMPLETED SUCCESSFULLY';
      const finalStatus = "ACTIVATED";
      revalidatePath('/settings');

      // Determine organisationId either by extracting it (for EXEC_ payloads)
      // or by looking up via the UMN field (for ICI payloads).
      let organisationId: number;

      if (callbackData.merchantTranId.startsWith('EXEC_')) {
        // Expected format: EXEC_<timestamp>_<orgId>
        const parts = callbackData.merchantTranId.split('_');
        if (parts.length < 3) {
          throw new Error('Invalid merchantTranId format for EXEC callback');
        }
        organisationId = parseInt(parts[2], 10);
      } else if (callbackData.merchantTranId.startsWith('ICI')) {
        // For ICI callbacks, look up the mandate by the UMN field
        const mandate = await prisma.activeMandate.findFirst({
          where: { UMN: '' }
        });
        if (!mandate) {
          throw new Error(`Mandate not found for UMN: ${callbackData.UMN}`);
        }
        organisationId = mandate.organisationId;
      }
      else {
        throw new Error('Unknown merchantTranId prefix');
      }

      console.log('Organisation ID:', organisationId);
      await createNotification(
        organisationId,
        'MANDATE_EXECUTION',
        'Monthly mandate payment of ₹499 was successfully executed.'
      );

      if (isSuccess) {
        // Successful execute callback: upsert mandate, update activeMandate & organisation.
        await prisma.$transaction([
          // 1) Upsert in the mandates table
          prisma.mandate.upsert({
            where: { merchantTranId: callbackData.merchantTranId },
            create: {
              organisationId,
              merchantTranId: callbackData.merchantTranId,
              bankRRN: callbackData.BankRRN,
              UMN: callbackData.UMN,
              amount: parseFloat(callbackData.PayerAmount),
              status: finalStatus,
              payerVA: callbackData.PayerVA,
              payerName: callbackData.PayerName,
              payerMobile: callbackData.PayerMobile,
              responseCode: callbackData.ResponseCode,
              respCodeDescription: callbackData.RespCodeDescription,
              txnInitDate: parseIciciDate(callbackData.TxnInitDate),
              txnCompletionDate: parseIciciDate(callbackData.TxnCompletionDate),
            },
            update: {
              bankRRN: callbackData.BankRRN,
              UMN: callbackData.UMN,
              amount: parseFloat(callbackData.PayerAmount),
              status: finalStatus,
              payerVA: callbackData.PayerVA,
              payerName: callbackData.PayerName,
              payerMobile: callbackData.PayerMobile,
              responseCode: callbackData.ResponseCode,
              respCodeDescription: callbackData.RespCodeDescription,
              txnInitDate: parseIciciDate(callbackData.TxnInitDate),
              txnCompletionDate: parseIciciDate(callbackData.TxnCompletionDate),
            },
          }),

          // 2) Upsert in the activeMandate table
          prisma.activeMandate.upsert({
            where: { organisationId },
            create: {
              organisationId,
              UMN: callbackData.UMN,
              amount: parseFloat(callbackData.PayerAmount),
              status: finalStatus,
              payerVA: callbackData.PayerVA,
              payerName: callbackData.PayerName,
              payerMobile: callbackData.PayerMobile,
              mandateSeqNo: 1, 
              retryCount: 0,
            },
            update: {
              status: finalStatus,
              UMN: callbackData.UMN,
              payerName: callbackData.PayerName,
              payerMobile: callbackData.PayerMobile,
              amount: parseFloat(callbackData.PayerAmount),
              mandateSeqNo: {
                increment: 1
              },
              // Optionally reset retryCount on success
              retryCount: 0,
            },
          }),

          

          // 3) Update the organisation's subscriptionType to 'pro'
          prisma.organisation.update({
            where: { id: organisationId },
            data: {
              subscriptionType: 'pro',
            },
          }),
        ]);

        console.log('Execute callback processed & activeMandate upserted (SUCCESS):', callbackData);
        return NextResponse.json({
          success: true,
          message: 'Execute callback processed successfully',
        });
      } else {
        // FAILED execute callback: Increase retry count for execute mandate.
        // First, fetch the active mandate record.
        const activeMandate = await prisma.activeMandate.findUnique({
          where: { organisationId },
        });

        if (activeMandate) {
          // Use threshold of 9 retries as in the execute mandate API.
          if (activeMandate.retryCount >= 9) {
            // If threshold reached, increment mandateSeqNo and reset retry count.
            await prisma.activeMandate.update({
              where: { organisationId },
              data: {
                mandateSeqNo: { increment: 1 },
                retryCount: 0,
                lastAttemptAt: new Date(),
                status: 'PENDING',
              },
            });
          } else {
            // Otherwise, simply increment the retry count.
            await prisma.activeMandate.update({
              where: { organisationId },
              data: {
                retryCount: { increment: 1 },
                lastAttemptAt: new Date(),
              },
            });
          }
        }

        console.log('Execute callback processed as failure (retry count increased):', callbackData);
        return NextResponse.json({
          success: true,
          message: 'Execute callback processed with failure; retry count updated',
        });
      }
    }

    console.log('Decrypted callback:', callbackData);


    // ----- End Execute Mandate Callback Handling -----

    // ----- Mandate Creation Callback Handling -----
    // If the callback indicates mandate creation failure, for example:
    if (callbackData.TxnStatus === 'CREATE-FAIL' || callbackData.TxnStatus === 'CREATE-FAILURE') {
      return NextResponse.json(
        { error: 'Mandate creation failed' },
        { status: 400 }
      );
    }

  


    // 4. Find the existing "INITIATED" Mandate by merchantTranId
    const mandate = await prisma.mandate.findUnique({
      where: { merchantTranId: callbackData.merchantTranId },
      include: { organisation: true }
    });

    if (!mandate) {
      console.log('Mandate not found:', callbackData.merchantTranId);
      return NextResponse.json({ error: "Mandate not found" }, { status: 404 });
    }

    await createNotification(
      mandate.organisationId,
      'MANDATE_APPROVED',
      'Your mandate has been successfully approved!'
    );

    // 5. Update that existing Mandate with callback data (UMN, PayerName, etc.)
    await prisma.mandate.update({
      where: { id: mandate.id },
      data: {
        bankRRN: callbackData.BankRRN,
        UMN: callbackData.UMN,
        payerName: callbackData.PayerName,
        payerMobile: callbackData.PayerMobile,
        responseCode: callbackData.ResponseCode,
        respCodeDescription: callbackData.RespCodeDescription,
        txnInitDate: parseIciciDate(callbackData.TxnInitDate),
        txnCompletionDate: parseIciciDate(callbackData.TxnCompletionDate),
        status: 'APPROVED',  // or "CREATED" if you prefer
      }
    });

    // 6. Upsert ActiveMandate (for create mandate callback)
    const activeMandate = await prisma.activeMandate.upsert({
      where: { organisationId: mandate.organisationId },
      create: {
        organisationId: mandate.organisationId,
        UMN: callbackData.UMN,
        amount: mandate.amount,
        status: 'APPROVED',
        mandateSeqNo: 1,
        payerVA: mandate.payerVA,
        payerName: callbackData.PayerName,
        payerMobile: callbackData.PayerMobile,
        retryCount: 0
      },
      update: {
        UMN: callbackData.UMN,
        status: 'APPROVED'
      }
    });



    if (activeMandate.mandateSeqNo === 1) {
      const success = await executeMandate(mandate, callbackData.UMN);
      console.log(
        'Initial execution:',
        success ? 'successful' : 'scheduled for retry'
      );
    }

    return NextResponse.json({
      success: true,
      status: 'INITIATED',
      data: mandate
    });

  } catch (error: any) {
    console.error("Callback Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


