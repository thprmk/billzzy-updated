// src/components/invoices/InvoicePDF.tsx
'use client';

import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { Invoice } from '@/types/invoice';

// Using a very simple, safe stylesheet
const styles = StyleSheet.create({
  page: { padding: 30 },
  section: { margin: 10, padding: 10, flexGrow: 1 },
  heading: { fontSize: 24, marginBottom: 10 },
  text: { fontSize: 12, marginBottom: 5 },
});

export const InvoicePDF = ({ invoice }: { invoice: Invoice }) => {
  // Safe handling of notes
  const customerInfo = invoice.notes?.split('\n\n')[0] || 'N/A';

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.section}>
          <Text style={styles.heading}>Invoice: {invoice.invoiceNumber}</Text>
          <Text style={styles.text}>Status: {invoice.status}</Text>
          <Text style={styles.text}>Bill To: {customerInfo}</Text>
          <Text style={styles.text}>Total: ${invoice.totalAmount.toFixed(2)}</Text>
        </View>

        <View style={styles.section}>
          <Text>Items:</Text>
          {invoice.items.map((item) => (
            // Use item.id for the key
            <View key={item.id}>
              <Text style={styles.text}>
                - {item.description} (Qty: {item.quantity}, Price: ${item.unitPrice.toFixed(2)})
              </Text>
            </View>
          ))}
        </View>
      </Page>
    </Document>
  );
};