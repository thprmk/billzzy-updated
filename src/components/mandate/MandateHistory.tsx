'use client';

import React from 'react';

type Mandate = {
  id: number;
  merchantTranId: string;
  UMN: string | null;
  amount: number;
  status: string;
  payerVA: string;
  payerName: string | null;
  txnInitDate: string | null;
  txnCompletionDate: string | null;
};

type ActiveMandate = {
  id: number;
  organisationId: number;
  UMN: string | null;
  amount: number;
  status: string;
  payerVA: string;
  payerName: string | null;
  payerMobile: string | null;
  mandateSeqNo: number;
  // etc...
};

interface MandateHistoryProps {
  mandates: Mandate[];
  activeMandate: ActiveMandate | null;
  organisationEndDate?: string | null;

}

export function MandateHistory({ mandates, activeMandate,  endDate
}: MandateHistoryProps) {
    console.log(endDate);
    
  return (

    <div className="max-w-5xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Billing & Mandate History</h1>

      {/* Active Mandate */}
     {/* Active Mandate */}
     <div className="mb-6 p-4 border rounded-md shadow-sm">
        <h2 className="text-xl font-semibold mb-2">Current Active Mandate</h2>
        {activeMandate ? (
          <div>
            <p><strong>Amount:</strong> ₹{activeMandate.amount}</p>
            <p><strong>Status:</strong> {activeMandate.status}</p>
            <p><strong>Payer VPA:</strong> {activeMandate.payerVA}</p>
            {activeMandate.payerName && (
              <p><strong>Payer Name:</strong> {activeMandate.payerName}</p>
            )}

            {/* Display the next execution date (organisation.endDate) */}
            {endDate && (
              <p>
                <strong>Next Execution Date:</strong>{' '}
                {new Date(endDate).toLocaleString()}
              </p>
            )}
          </div>
        ) : (
          <p className="text-gray-500">No active mandate found.</p>
        )}
      </div>

      {/* Mandate History */}
      <div className="p-4 border rounded-md shadow-sm">
        <h2 className="text-xl font-semibold mb-2">Mandate History</h2>
        {mandates && mandates.length > 0 ? (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b">
                <th className="py-2">Amount</th>
                <th className="py-2">Status</th>
                <th className="py-2">Payer VPA</th>
                <th className="py-2">Init Date</th>
                <th className="py-2">Completion Date</th>
              </tr>
            </thead>
            <tbody>
              {mandates.map((mandate) => (
                <tr key={mandate.id} className="border-b hover:bg-gray-50">
            
                  <td className="py-2">₹{mandate.amount}</td>
                  <td className="py-2">{mandate.status}</td>
                  <td className="py-2">{mandate.payerVA}</td>
                  <td className="py-2">
                    {mandate.txnInitDate
                      ? new Date(mandate.txnInitDate).toLocaleString()
                      : 'N/A'}
                  </td>
                  <td className="py-2">
                    {mandate.txnCompletionDate
                      ? new Date(mandate.txnCompletionDate).toLocaleString()
                      : 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-gray-500">No mandates history found.</p>
        )}
      </div>
    </div>
  );
}
