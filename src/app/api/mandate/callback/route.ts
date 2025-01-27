import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { IciciCrypto } from '@/lib/iciciCrypto';

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
  merchantTranId: string;
  RespCodeDescription: string;
  PayeeVPA: string;
}

// app/api/mandate/callback/route.ts


export async function POST(request: Request) {
  try {
    const encryptedCallback = await request.json();
    let callbackData: MandateCallback;
 
    if (encryptedCallback?.encryptedData) {
      if (!encryptedCallback.encryptedKey || !encryptedCallback.iv) {
        throw new Error('Missing encryption parameters');
      }
 
      try {
        callbackData = IciciCrypto.decrypt(
          encryptedCallback.encryptedData,
          encryptedCallback.encryptedKey,
          encryptedCallback.iv
        );
      } catch (error) {
        console.error('Callback decryption failed:', error);
        return NextResponse.json({ error: 'Decryption failed' }, { status: 400 });
      }
    } else {
      callbackData = encryptedCallback;
    }
 
    if (!callbackData?.merchantTranId || !callbackData?.TxnStatus) {
      return NextResponse.json({ error: 'Invalid callback data' }, { status: 400 });
    }
 
    const mandate = await prisma.mandate.findUnique({
      where: { merchantTranId: callbackData.merchantTranId },
      include: { organisation: true }
    });
 
    if (!mandate) return NextResponse.json({ error: "Mandate not found" }, { status: 404 });
 
    const existingActiveMandate = await prisma.activeMandate.findUnique({
      where: { organisationId: mandate.organisationId }
    });
 
    const newSeqNo = existingActiveMandate ? existingActiveMandate.mandateSeqNo + 1 : 1;
    const status = existingActiveMandate ? 'ACTIVATED' : 'INITIATED';

    await prisma.activeMandate.upsert({
      where: { organisationId: mandate.organisationId },
      create: {
        organisationId: mandate.organisationId,
        UMN: callbackData.UMN,
        amount: mandate.amount,
        status: status,
        mandateSeqNo: newSeqNo,
        payerVA: mandate.payerVA,
        payerName: callbackData.PayerName,
        payerMobile: callbackData.PayerMobile
      },
      update: {
        UMN: callbackData.UMN,
        mandateSeqNo: newSeqNo
      }
    });
 
    if (newSeqNo === 1) {
      const executePayload = {
        merchantId: "611392",
        subMerchantId: "611392",
        terminalId: "5411",
        merchantName: mandate.organisation.name,
        amount: mandate.amount.toString(),
        merchantTranId: `EXEC_${Date.now()}_${mandate.id}`,
        mandateSeqNo: "1",
        UMN: callbackData.UMN,
        purpose: "RECURRING"
      };
 
      const { encryptedKey, iv, encryptedData } = IciciCrypto.encrypt(executePayload);
 
      const executeResponse = await fetch(
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
 
      const responseData = await executeResponse.json();
      let decryptedResponse;
 
      if (responseData?.encryptedData) {
        try {
          decryptedResponse = IciciCrypto.decrypt(
            responseData.encryptedData,
            responseData.encryptedKey,
            responseData.iv
          );
        } catch (error) {
          console.error('Execute response decryption failed:', error);
          return NextResponse.json({ error: 'Execute response decryption failed' }, { status: 500 });
        }
      }
 
      if (executeResponse.ok && decryptedResponse?.success === "true") {
        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + 1);
 
        await prisma.$transaction([
          prisma.activeMandate.update({
            where: { organisationId: mandate.organisationId },
            data: { status: 'ACTIVATED' }
          }),
          prisma.mandate.update({
            where: { id: mandate.id },
            data: { status: 'ACTIVATED' }
          }),
          prisma.organisation.update({
            where: { id: mandate.organisationId },
            data: { endDate: nextMonth }
          })
        ]);
      }
    }
    console.log('Callback Success:', mandate);
    
 
    return NextResponse.json({ 
      success: true, 
      data: mandate,
      seqNo: newSeqNo
    });
 
  } catch (error) {
    console.error("Callback Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
 }