import { NextResponse } from 'next/server';
import { IciciCrypto } from '@/lib/iciciCrypto';
import { format, addYears } from 'date-fns';

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
}

// API base URL based on environment
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://localhost:3001'
  : 'https://apibankingonesandbox.icicibank.com';

  console.log(API_BASE_URL);
  

export async function POST(request: Request) {
  try {
    const body = await request.json() as MandateRequestBody;
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

    const mandateRequest: MandateRequest = {
      merchantId: "611392",
      subMerchantId: "611392",
      terminalId: "5499",
      merchantName: "TechVaseegrahUAT",
      subMerchantName: "Test",
      payerVa,
      amount: "100.00",
      note: "Mandate Request",
      collectByDate: format(addYears(today, 1), 'dd/MM/yyyy HH:mm a'),
      merchantTranId,
      billNumber: `BILL_${Date.now()}`,
      requestType: "C",
      validityStartDate: format(today, 'dd/MM/yyyy'),
      validityEndDate: format(validityEndDate, 'dd/MM/yyyy'),
      amountLimit: "F",
      frequency: "MT",
      remark: "Monthly Subscription",
      autoExecute: "N",
      debitDay: "10",
      debitRule: "ON",
      revokable: "Y",
      blockfund: "N",
      purpose: "RECURRING"
    };

    const { encryptedKey, encryptedData, iv } = IciciCrypto.encrypt(mandateRequest);

    const encryptedPayload = {
      requestId: merchantTranId,
      service: "NLI",
      encryptedKey,
      oaepHashingAlgorithm: "NONE",
      iv,
      encryptedData,
      clientInfo: "",
      optionalParam: ""
    };

    const response = await fetch(
      `${API_BASE_URL}/api/MerchantAPI/UPI2/v1/CreateMandate`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.ICICI_API_KEY || 'rVA9uIidGc7k1PQRaYZYMWLzvn5ddlM6',
          'Accept': 'application/json'
        },
        body: JSON.stringify(encryptedPayload),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ICICI API Error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });

      return NextResponse.json(
        {
          error: 'Failed to create mandate',
          details: errorText
        },
        { status: response.status }
      );
    }

    const apiResponse = await response.json();

    if (apiResponse.success === 'true' && apiResponse.response === '92') {
      console.log('Mandate creation successful:', {
        merchantTranId: apiResponse.merchantTranId,
        bankRRN: apiResponse.BankRRN
      });

      return NextResponse.json({
        success: true,
        message: 'Mandate creation initiated',
        data: {
          merchantTranId: apiResponse.merchantTranId,
          bankRRN: apiResponse.BankRRN,
          status: apiResponse.status
        }
      });
    }

    return NextResponse.json({
      success: false,
      message: apiResponse.message || 'Unexpected response from bank',
      data: apiResponse
    });

  } catch (error) {
    console.error('Mandate Creation Error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error while creating mandate',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}