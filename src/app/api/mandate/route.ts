import { NextResponse } from 'next/server';
import { format, addYears, addMinutes, addMonths } from 'date-fns';
import { IciciCrypto } from '@/lib/iciciCrypto';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

interface MandateRequestBody {
 payerVa: string;
}

interface MandateRequest {
 merchantId: string;
 subMerchantId: string;
 terminalId: string;
 merchantName: string; 
 subMerchantName: string;
 payerVa: string;
 amount: string;
 note: string;
 collectByDate: string;
 merchantTranId: string;
 billNumber: string;
 requestType: string;
 validityStartDate: string;
 validityEndDate: string;
 amountLimit: string;
 frequency: string;
 remark: string;
 autoExecute: string;
 debitDay: string;
 debitRule: string;
 revokable: string;
 blockfund: string;
 purpose: string;
 validatePayerAccFlag?: string;
}

export async function POST(request: Request) {
 try {
   const session = await getServerSession(authOptions);
   if (!session) {
     return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
   }

   const merchantName = session?.user?.name;
   if (!merchantName) {
     return NextResponse.json(
       { error: 'Merchant name not found in session' },
       { status: 400 }
     );
   }

   const body = (await request.json()) as MandateRequestBody;
   const { payerVa } = body;
   if (!payerVa) {
     return NextResponse.json(
       { error: 'Payer Virtual Address is required' },
       { status: 400 }
     );
   }

   const organisationId = session?.user?.id;
   if (!organisationId) {
     return NextResponse.json(
       { error: 'Organisation ID not found in session' },
       { status: 400 }
     );
   }

   const today = new Date();
   const collectByDate = addMinutes(today, 180);
   const validityEndDate = addYears(today, 12);
   const debitDay = today.getDate().toString();
   const nextMandateDate = addMonths(today, 1);
   console.log('Next Mandate Date:', nextMandateDate);
   
   const merchantTranId = `MANDATE_${Date.now()}`;
   const billNumber = `BILL_${Date.now()}`;

   

   const mandateRequest: MandateRequest = {
     merchantId: '8893896',
     subMerchantId: "8893896", 
     terminalId: "5411",
     merchantName:'Tech Vaseegrah',
     subMerchantName:merchantName,
     payerVa,
     amount: "100.00",
     note: "mandaterequest",
     collectByDate: format(collectByDate, 'dd/MM/yyyy hh:mm a'),
     merchantTranId,
     billNumber,
     validityStartDate: format(today, 'dd/MM/yyyy'),
     validityEndDate: format(validityEndDate, 'dd/MM/yyyy'),
     amountLimit: "M",
     remark: "Mandate Request",
     autoExecute: "N",
     requestType: "C",
     frequency: "AS",
    //  debitDay,
     debitRule: "ON",
     revokable: "Y",
     blockfund: "N",
     purpose: "RECURRING",
     validatePayerAccFlag: "N"
   };

   console.log("request payload for create mandate", mandateRequest);


   const { encryptedKey, iv, encryptedData } = IciciCrypto.encrypt(mandateRequest);

   const encryptedPayload = {
     requestId: merchantTranId,
     service: "AccountCreation", 
     encryptedKey,
     oaepHashingAlgorithm: "NONE",
     iv,
     encryptedData,
     clientInfo: "",
     optionalParam: ""
   };

   const response = await fetch(
    `${process.env.ICICI_API_BASE_URL}/CreateMandate`,
     {
       method: "POST",
       headers: {
         "Content-Type": "application/json",
         apikey: process.env.ICICI_API_KEY || "",
         Accept: "application/json"
       },
       body: JSON.stringify(encryptedPayload)
     }
   );

   if (!response.ok) {
     return NextResponse.json(
       { 
         success: false,
         error: "Failed to create mandate",
         details: await response.text()
       }, 
       { status: response.status }
     );
   }

   const apiResponse = await response.json();

   let decryptedResponse;
   if (apiResponse?.encryptedData && apiResponse?.encryptedKey) {
     try {
       decryptedResponse = IciciCrypto.decrypt(
         apiResponse.encryptedData,
         apiResponse.encryptedKey,
         apiResponse.iv
       );

       console.log("response from create mandate",decryptedResponse);
       

       if (!decryptedResponse.success) {

         // Send error response based on ICICI error codes
         const errorCode = decryptedResponse.response;
    

         return NextResponse.json({
           success: false,
           error: decryptedResponse.message,
           code: errorCode,
           details: decryptedResponse.RespCodeDescription || decryptedResponse.respCodeDescription
         }, { status: 400 });
       }

       const mandateRecord = await prisma.mandate.create({
         data: {
           organisationId: parseInt(organisationId.toString(), 10),
           merchantTranId: decryptedResponse.merchantTranId || merchantTranId,
           bankRRN: decryptedResponse.BankRRN || null,
           UMN: null,
           amount: parseFloat(mandateRequest.amount),
           status: 'INITIATED',
           payerVA: mandateRequest.payerVa,
           payerName: null,
           payerMobile: null,
           txnInitDate: null,
           txnCompletionDate: null,
           responseCode: decryptedResponse.response || null,
           respCodeDescription: decryptedResponse.message || null,
         }
       });

       await prisma.organisation.update({
         where: { id: parseInt(organisationId.toString(), 10) },
         data: { endDate: nextMandateDate }
       });

       return NextResponse.json({
         success: true,
         message: "Mandate creation initiated",
         data: {
           merchantTranId: decryptedResponse.merchantTranId || merchantTranId,
           BankRRN: decryptedResponse.BankRRN,
           status: "INITIATED"
         }
       });

     } catch (error) {
       return NextResponse.json(
         { 
           success: false,
           error: "Failed to decrypt mandate response",
           details: error instanceof Error ? error.message : "Unknown error"
         },
         { status: 500 }
       );
     }
   }

   return NextResponse.json({
     success: false,
     error: "Invalid response from bank",
     details: "Missing encrypted data in response"
   }, { status: 500 });

 } catch (error) {
  console.log("error",error);

   return NextResponse.json(
    
     {
       success: false,
       error: "Internal server error while creating mandate",
       details: error instanceof Error ? error.message : "Unknown error"
     },
     { status: 500 }
   );
 }
}