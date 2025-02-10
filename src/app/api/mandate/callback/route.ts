// app/api/mandate/callback/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { IciciCrypto } from '@/lib/iciciCrypto';
import { executeMandate } from '@/lib/mandate-utils';

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
  merchantTranId: string; // e.g. "MANDATE_1738155932830" or "EXEC_..."
  RespCodeDescription: string;
  PayeeVPA: string;
}

function isExecuteCallback(mTranId: string) {
  return mTranId.startsWith('EXEC_');
}

/** 
 * Helper to parse ICICI date strings in YYYYMMDDhhmmss into a JS Date.
 * For example: "20250126154336" => "2025-01-26T15:43:36"
 */
function parseIciciDate(dateString: string) {
  if (!dateString) return null;
  const isoString = dateString.replace(
    /(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/,
    '$1-$2-$3T$4:$5:$6'
  );
  return new Date(isoString);
}

export async function POST(request: Request) {
  try {
    // Read the raw body text instead of calling request.json() directly.
    const rawBody = await request.text();
    console.log('Raw callback payload:', rawBody);

    let encryptedCallback: any;
    let callbackData: MandateCallback;

    // Check if the raw body appears to be JSON (starts with "{")
    if (rawBody.trim().startsWith('{')) {
      try {
        encryptedCallback = JSON.parse(rawBody);
      } catch (e) {
        throw new Error(`Failed to parse JSON. Raw body: ${rawBody}`);
      }
      // If the JSON has an "encryptedData" field, then decrypt it.
      if (encryptedCallback?.encryptedData) {
        if (!encryptedCallback.encryptedKey) {
          throw new Error('Missing encrypted key in JSON payload');
        }
        callbackData = IciciCrypto.decrypt(
          encryptedCallback.encryptedData,
          encryptedCallback.encryptedKey,
          encryptedCallback.iv || ''
        );
      } else {
        // Otherwise assume the parsed object is already the callback data.
        callbackData = encryptedCallback;
      }
    } else {
      // If the raw body does not start with '{', assume it is an encrypted string.
      // (In this scenario, you need to obtain the key and iv from headers or another source.)
      const encryptedKey = request.headers.get('x-encrypted-key');
      const iv = request.headers.get('x-iv') || '';
      if (!encryptedKey) {
        throw new Error('Missing encrypted key in headers');
      }
      callbackData = IciciCrypto.decrypt(rawBody, encryptedKey, iv);
    }

    console.log('Decrypted callback:', callbackData);

    // ----- Execute Mandate Callback Handling -----
    if (isExecuteCallback(callbackData.merchantTranId)) {
      console.log('Execute callback received:', callbackData);

      // For execute mandate, success only if:
      //   TxnStatus === 'SUCCESS'
      // AND RespCodeDescription === 'APPROVED OR COMPLETED SUCCESSFULLY'
      const isSuccess =
        callbackData.TxnStatus === 'SUCCESS' &&
        callbackData.RespCodeDescription === 'APPROVED OR COMPLETED SUCCESSFULLY';
      const finalStatus = "ACTIVATED";

      // Parse organisation ID from merchantTranId (format: EXEC_<timestamp>_<orgId>)
      const orgIdStr = callbackData.merchantTranId.split('_')[2];
      const organisationId = parseInt(orgIdStr, 10);

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
              mandateSeqNo: 1, // For new mandates
              retryCount: 0,
            },
            update: {
              status: finalStatus,
              UMN: callbackData.UMN,
              payerName: callbackData.PayerName,
              payerMobile: callbackData.PayerMobile,
              amount: parseFloat(callbackData.PayerAmount),
              retryCount: 0,
            },
          }),

          // 3) Update the organisation's subscriptionType to 'pro'
          prisma.organisation.update({
            where: { id: organisationId },
            data: { subscriptionType: 'pro' },
          }),
        ]);

        console.log('Execute callback processed & activeMandate upserted (SUCCESS):', callbackData);
        return NextResponse.json({
          success: true,
          message: 'Execute callback processed successfully',
        });
      } else {
        // FAILED execute callback: Increase retry count for execute mandate.
        const activeMandate = await prisma.activeMandate.findUnique({
          where: { organisationId },
        });

        if (activeMandate) {
          if (activeMandate.retryCount >= 9) {
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
    // ----- End Execute Mandate Callback Handling -----

    // ----- Mandate Creation Callback Handling -----
    if (callbackData.TxnStatus === 'CREATE-FAIL') {
      return NextResponse.json({ error: 'Mandate creation failed' }, { status: 400 });
    }

    // 4. Find the existing "INITIATED" Mandate by merchantTranId
    const mandate = await prisma.mandate.findUnique({
      where: { merchantTranId: callbackData.merchantTranId },
      include: { organisation: true }
    });

    if (!mandate) {
      return NextResponse.json({ error: "Mandate not found" }, { status: 404 });
    }

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
        status: 'APPROVED',
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

    // 7. If this is the first callback for the new mandate, attempt immediate execution
    if (activeMandate.mandateSeqNo === 1) {
      const success = await executeMandate(mandate, callbackData.UMN);
      console.log('Initial execution:', success ? 'successful' : 'scheduled for retry');
    }

    return NextResponse.json({
      success: true,
      status: 'INITIATED',
      data: mandate
    });

  } catch (error: any) {
    console.error("Callback Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
