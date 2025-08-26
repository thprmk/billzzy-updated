// src/components/invoices/InvoicePDF.tsx
'use client';

import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { Invoice } from '@/types/invoice';

const styles = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 11, padding: 40, flexDirection: 'column' },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30, borderBottomWidth: 1, borderBottomColor: '#cccccc', paddingBottom: 10 },
  companyDetails: { textAlign: 'right' },
  invoiceTitle: { fontSize: 24, fontWeight: 'bold' },
  invoiceInfo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 },
  billToSection: { marginTop: 20 },
  billToText: { fontWeight: 'bold', marginBottom: 5 },
  infoText: { marginBottom: 3 },
  table: { width: '100%' },
  tableHeader: { flexDirection: 'row', backgroundColor: '#f3f4f6', borderBottomWidth: 1, borderBottomColor: '#cccccc' },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#eeeeee' },
  th: { padding: 8, fontWeight: 'bold' },
  td: { padding: 8 },
  colDescription: { width: '50%' },
  colQty: { width: '15%', textAlign: 'center' },
  colPrice: { width: '15%', textAlign: 'right' },
  colTotal: { width: '20%', textAlign: 'right' },
  totalsSection: { alignSelf: 'flex-end', width: '40%', marginTop: 30 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  totalLabel: {},
  totalValue: { fontWeight: 'bold' },
  grandTotalRow: { borderTopWidth: 1, borderTopColor: '#cccccc', marginTop: 5, paddingTop: 5, fontSize: 14 },
  notesSection: { marginTop: 'auto', paddingTop: 20, fontSize: 10, color: '#555555', borderTopWidth: 1, borderTopColor: '#cccccc' },
});

export const InvoicePDF = ({ invoice }: { invoice: Invoice }) => {
  const notesText = invoice.notes || '';
  const customerInfo = notesText.split('\n\n')[0] || 'N/A';
  const additionalNotes = notesText.split('\n\n')[1] || '';

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.invoiceTitle}>INVOICE</Text>
            <Text>{invoice.invoiceNumber}</Text>
          </View>
          <View style={styles.companyDetails}>
            <Text>Your Company Name</Text>
            <Text>123 Your Street, City</Text>
          </View>
        </View>

        <View style={styles.invoiceInfo}>
          <View style={styles.billToSection}>
            <Text style={styles.billToText}>BILL TO:</Text>
            <Text>{customerInfo}</Text>
          </View>
          <View style={{ textAlign: 'right' }}>
            <Text style={styles.infoText}>Date: {new Date(invoice.issueDate).toLocaleDateString()}</Text>
            <Text style={styles.infoText}>Due Date: {new Date(invoice.dueDate).toLocaleDateString()}</Text>
            <Text style={styles.infoText}>Status: {invoice.status}</Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.th, styles.colDescription]}>Description</Text>
            <Text style={[styles.th, styles.colQty]}>Qty</Text>
            <Text style={[styles.th, styles.colPrice]}>Price</Text>
            <Text style={[styles.th, styles.colTotal]}>Total</Text>
          </View>
          {invoice.items.map((item) => (
            <View key={item.id} style={styles.tableRow}>
              <Text style={[styles.td, styles.colDescription]}>{item.description}</Text>
              <Text style={[styles.td, styles.colQty]}>{item.quantity}</Text>
              <Text style={[styles.td, styles.colPrice]}>${item.unitPrice.toFixed(2)}</Text>
              <Text style={[styles.td, styles.colTotal]}>${item.total.toFixed(2)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totalsSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal:</Text>
            <Text style={styles.totalValue}>${invoice.subTotal.toFixed(2)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Tax:</Text>
            <Text style={styles.totalValue}>${invoice.totalTax.toFixed(2)}</Text>
          </View>
          <View style={[styles.totalRow, styles.grandTotalRow]}>
            <Text style={styles.totalLabel}>Total:</Text>
            <Text style={styles.totalValue}>${invoice.totalAmount.toFixed(2)}</Text>
          </View>
        </View>

        {additionalNotes ? (
          <View style={styles.notesSection}>
            <Text style={{ fontWeight: 'bold', marginBottom: 5 }}>Notes</Text>
            <Text>{additionalNotes}</Text>
          </View>
        ) : null}
      </Page>
    </Document>
  );
};