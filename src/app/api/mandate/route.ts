// app/api/create-mandate/route.ts

import { NextResponse } from 'next/server';
import { format, addYears, addDays } from 'date-fns';
import { IciciCrypto } from '@/lib/iciciCrypto';

// Define the request body interface
interface MandateRequestBody {
  payerVa: string;
}

// Define the full mandate request interface
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
}

// Example: If you must switch between sandbox & production
const API_BASE_URL =
  process.env.NODE_ENV === 'production'
    ? 'https://yourproductionhost.icicibank.com'
    : 'https://apibankingonesandbox.icicibank.com';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as MandateRequestBody;
    const { payerVa } = body;

    if (!payerVa) {
      return NextResponse.json(
        { error: 'Payer Virtual Address is required' },
        { status: 400 }
      );
    }

    const today = new Date();
    const validityEndDate = addYears(today, 1);
    const merchantTranId = `MANDATE_${Date.now()}`;

    // 1. Construct your plain JSON request
    const mandateRequest: MandateRequest = {
      merchantId: '611392',
      subMerchantId: '611392',
      terminalId: '5999',
      merchantName: 'TechVaseegrahUAT',
      subMerchantName: 'Test',
      payerVa,
      amount: '100.00',
      note: 'Mandate Request',
      collectByDate: format(validityEndDate, 'dd/MM/yyyy HH:mm a'),
      merchantTranId,
      billNumber: `BILL_${Date.now()}`,
      requestType: 'C',
      validityStartDate: format(addDays(new Date(), 1), 'dd/MM/yyyy'),
      validityEndDate: format(validityEndDate, 'dd/MM/yyyy'),
      amountLimit: 'M',
      frequency: 'AS',
      remark: 'Monthly Subscription',
      autoExecute: 'N',
      revokable: 'Y',
      blockfund: 'N',
      purpose: 'RECURRING',
    };

    console.log('ICICI Mandate Request:', mandateRequest);
    

    // 2. Encrypt the request using IciciCrypto
    const { encryptedKey, iv, encryptedData } = IciciCrypto.encrypt(mandateRequest);

    // 3. Create final encrypted request body
    const encryptedPayload = {
      requestId: merchantTranId,
      service: 'NLI',
      encryptedKey,
      oaepHashingAlgorithm: 'NONE',
      iv, // recommended approach
      encryptedData,
      clientInfo: '',
      optionalParam: '',
    };

    console.log('Encrypted ICICI payload:', encryptedPayload);

    // 4. Send the request to ICICI
    const response = await fetch(`https://apibankingonesandbox.icicibank.com/api/MerchantAPI/UPI2/v1/CreateMandate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: process.env.ICICI_API_KEY || '',
        Accept: 'application/json',
      },
      body: JSON.stringify(encryptedPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ICICI API Error =>', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });
      return NextResponse.json(
        { error: 'Failed to create mandate', details: errorText },
        { status: response.status }
      );
    }

    // 5. Parse the API’s JSON response
    const apiResponse = await response.json();
    console.log('Mandate Creation Response:', apiResponse);

    // 6. Decrypt the response (if needed)
    // If the response is also Hybrid-encrypted, we can do:
    if (apiResponse?.encryptedData && apiResponse?.encryptedKey) {
      let decrypted: Record<string, any>;

      try {
        // Determine if IV is provided or embedded
        if (!apiResponse.iv || apiResponse.iv.trim() === '') {
          // IV is embedded in the encryptedData
          decrypted = IciciCrypto.decrypt(
            apiResponse.encryptedData,
            apiResponse.encryptedKey
            // IV is not provided, so it's extracted within the decrypt method
          );
        } else {
          // IV is provided separately
          decrypted = IciciCrypto.decrypt(
            apiResponse.encryptedData,
            apiResponse.encryptedKey,
            apiResponse.iv
          );
        }

        console.log('Decrypted ICICI response =>', decrypted);
      } catch (decryptError) {
        console.error('Decryption of ICICI response failed:', decryptError);
        return NextResponse.json(
          { error: 'Failed to decrypt ICICI response', details: decryptError.message },
          { status: 500 }
        );
      }
    }

    // 7. Return a relevant portion of the response in your final JSON
    return NextResponse.json({
      success: true,
      message: 'Mandate creation initiated',
      // If the response has these fields, pass them along
      data: {
        merchantTranId: apiResponse?.merchantTranId,
        BankRRN: apiResponse?.BankRRN,
        status: apiResponse?.status,
      },
    });
  } catch (error: any) {
    console.error('Mandate Creation Error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error while creating mandate',
        details: error?.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
