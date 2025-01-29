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
  merchantTranId: string;     // e.g. "MANDATE_1738155932830"
  RespCodeDescription: string;
  PayeeVPA: string;
}

// Example: "EXEC_..." vs. "MANDATE_..."
function isExecuteCallback(mTranId: string) {
  return mTranId.startsWith('EXEC_');
}

export async function POST(request: Request) {
  try {
    const encryptedCallback = await request.json();
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

    // 2. Handle EXECUTE callbacks
    if (isExecuteCallback(callbackData.merchantTranId)) {
      console.log('Execute callback received:', callbackData);
    
      // 1) Determine the final status based on TxnStatus
      //    If "EXECUTE-SUCCESS" => "ACTIVATED", else "PENDING"
      const finalStatus = callbackData.TxnStatus === 'EXECUTE-SUCCESS'
        ? 'ACTIVATED'
        : 'PENDING';
    
      // 2) Parse out the orgId from merchantTranId
      const orgIdStr = callbackData.merchantTranId.split('_')[2]; // e.g. EXEC_<timestamp>_<orgId>
      const organisationId = parseInt(orgIdStr, 10);
    
      // 3) Perform both operations (mandate.create & activeMandate.upsert) in a transaction
      await prisma.$transaction([
        prisma.mandate.create({
          data: {
            organisationId,
            merchantTranId: callbackData.merchantTranId,
            bankRRN: callbackData.BankRRN,
            UMN: callbackData.UMN,
            amount: parseFloat(callbackData.PayerAmount),
            status: finalStatus,                     // <-- set status based on TxnStatus
            payerVA: callbackData.PayerVA,
            payerName: callbackData.PayerName,
            payerMobile: callbackData.PayerMobile,
            responseCode: callbackData.ResponseCode,
            respCodeDescription: callbackData.RespCodeDescription,
            txnInitDate: parseIciciDate(callbackData.TxnInitDate),
            txnCompletionDate: parseIciciDate(callbackData.TxnCompletionDate),
          }
        }),
        prisma.activeMandate.upsert({
          where: { organisationId },
          create: {
            organisationId,
            UMN: callbackData.UMN,
            amount: parseFloat(callbackData.PayerAmount),
            status: finalStatus,                      // <-- set status
            payerVA: callbackData.PayerVA,
            payerName: callbackData.PayerName,
            payerMobile: callbackData.PayerMobile,
            mandateSeqNo: 1,    // or whatever makes sense
          },
          update: {
            status: finalStatus,                      // <-- set status
            UMN: callbackData.UMN,
            payerName: callbackData.PayerName,
            payerMobile: callbackData.PayerMobile,
          }
        }),
      ]);
    
      console.log('Execute callback processed & activeMandate upserted:', callbackData);
      return NextResponse.json({
        success: true,
        message: 'Execute callback processed'
      });
    }
    
    

    // 3. Handle Mandate Creation Fail
    if (callbackData.TxnStatus === 'CREATE-FAIL') {
      return NextResponse.json(
        { error: 'Mandate creation failed' },
        { status: 400 }
      );
    }

    // 4. Find the existing "INITIATED" Mandate by merchantTranId
    //    (Remove the hard-coded string)
    const mandate = await prisma.mandate.findUnique({
      where: { merchantTranId: callbackData.merchantTranId },
      // where: { merchantTranId: 'MANDATE_1738160757397'},
      include: { organisation: true }
    });

    if (!mandate) {
      return NextResponse.json({ error: "Mandate not found" }, { status: 404 });
    }

    // 5. Update that existing Mandate with callback data (UMN, PayerName, etc.)
    //    If your schema requires these fields to be unique or optional, adjust accordingly.
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

    // 6. Upsert ActiveMandate
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
    console.error("Callback Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
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
