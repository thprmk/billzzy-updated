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
        const mandate = await prisma.mandate.findFirst({
          where: { UMN: callbackData.UMN }
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
    if (callbackData.TxnStatus === 'CREATE-FAIL') {
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


// 0|nextjs  | Encrypted callback from callback: {
//   0|nextjs  |   requestId: '',
//   0|nextjs  |   service: 'UPI',
//   0|nextjs  |   encryptedKey: 'q0NGyt6xad70zRlOTXqtpnwtxhGPAAe2fbN1q1v5PV4CeUMGMv342cawsZpd9bFTA3ifZT9919Vm6tzmiquv3IBpxlxUjiTMAWy/IkXar1cxkOdTEvgotLu9s7mtK+xe4a1/hzr+BgAYSnJrX+KEcvk32MHwjJD1AN+wuKvjQ2Kxe/qF+jui+tDdr3jv1jgGhhH1HJorRm21Bpiqxv0ABL6U/bOz1MdlsF/PSmM2qZfE+p3QphI4SdK0pqv2TJ1txOXRgRmUpddHHeqd3RN/GldsDVDqdPl2Wb8qnQI2Ub0LRPey8Tn5bp6PZNZlI6WqnL6IO/wt5f7Hj27/IUthxrtiU2/af/yCeCpdoGtHinCPZaitmd3HOHOPEhPDaQKcI9n8zo8dRqoc0fTgVhXuaz9b9M4UKRvt6K1SMtMJyMBH8Ca4BL6h4qhLae4TRgG/P/HGzrE636K/t3beJbYPNu+T1W4U8PBnNLP15rJE25Q8hTFmwnqbQ8ODQWbkHGQ37G88iG8EZin4Ia32yIb4WMFg9K1whSKYwjzsQS8MVr4DGKg/SPnUWLLL7/QvwKazee2r3TDSRTF+04iHRamB/Prt21CMGbGyljXTXLtTCwjwHhhnI/WL6/Hi1/9d+1GOW0TvaAApEwre9zdWMZ31WC1RcpyeFVW9sXbWLcuSSew=',
//   0|nextjs  |   oaepHashingAlgorithm: 'NONE',
//   0|nextjs  |   iv: '',
//   0|nextjs  |   encryptedData: 'UKNANs/YqPbJ4hl4bLaVT/zuu2gwE2RSyu+S5w8KAubWI9WZspzmw6HOuDoL/IiiVwn1RqAUDEdbAtX5AYwbx060QfeM8yAeJsthdqZTQw3kRLsOiN2/1fJFymzKt58sXDnWPQYu89svs0zQ07zEMvmfDq3V4IIgJeEu0/B57d0D0pwi1i2iicKc+r+SFqK+oGW0MnQgFLxPr/8NE7E7L8o6maVUrrdTdZFXjb2vNwof787heIo+0n4/OTdzJOpJLz0HydWk9BU5yXxPUqemWpanSShvM23ZXsdhdT1jKCNc4KtXFyEiYtIbMNpJgMShCt3HuJoc8hgRX6MXiNWU44MpF7Qse05jP4ccfeosdmV03gpsKlvwG1Yy0KaRHS3MGn8u6BPBxy2Qh1U7Qbi4z5hFdH2auWWKEvEW8xciIafgXgODvR+lDeYNV98KqR58qaFdGvYanIRewLW0EoCUUQN7pywkf1NbngE74ZWDn+OUlDjl2JwetKs67C07swiz2GMNCTY+j2OStCp6dkA4MMkffQGeho7B/0JAt9qV0AQ4QAavQ3L6dPkRzi6qLW37bK1EJhA0Be+NRlySM2H5NdlVC0uyLxNX2uMm19BOTRQGhj4h5lNA1kcM9OFyMWQHBTbAMMCQxbcI+eNpqWOjrLX0NjkkXs1Z00WKO5EKNWEtUYxCZdVwLUh6cjhW43UnzBfv2F0fBjGoT0JjJgA2gWMRqHoSp6phbCbQ8zC2zUI=',
//   0|nextjs  |   clientInfo: '',
//   0|nextjs  |   optionalParam: ''
//   0|nextjs  | }
//   0|nextjs  | Execute callback received: {
//   0|nextjs  |   subMerchantId: '343985',
//   0|nextjs  |   RespCodeDescription: 'APPROVED OR COMPLETED SUCCESSFULLY',
//   0|nextjs  |   PayerMobile: '0000000000',
//   0|nextjs  |   TxnCompletionDate: '20250212165159',
//   0|nextjs  |   terminalId: '4816',
//   0|nextjs  |   PayerName: 'HARI PRASANTH  S',
//   0|nextjs  |   PayeeVPA: 'billzzy@icici',
//   0|nextjs  |   PayerAmount: '1.00',
//   0|nextjs  |   PayerVA: '2def78565b0be2cae063b12fb00aede9@oksbi',
//   0|nextjs  |   BankRRN: '504374651467',
//   0|nextjs  |   merchantId: '8893896',
//   0|nextjs  |   PayerAccountType: 'SAVINGS',
//   0|nextjs  |   UMN: '2def78565b0be2cae063b12fb00aede9@oksbi',
//   0|nextjs  |   TxnInitDate: '20250212165157',
//   0|nextjs  |   TxnStatus: 'SUCCESS',
//   0|nextjs  |   merchantTranId: 'ICI1f84ca666e0f498383b3bee510091d30'
//   0|nextjs  | }