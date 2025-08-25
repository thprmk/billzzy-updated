// src/components/invoices/InvoicePDF.tsx
'use client';

import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';
import { Invoice } from '@/types/invoice'; // We reuse our shared Invoice type

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 11,
    padding: 40,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
    borderBottom: 1,
    borderBottomColor: '#cccccc',
    paddingBottom: 10,
  },
  companyDetails: {
    textAlign: 'right',
  },
  invoiceTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  invoiceInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  billTo: {
    marginTop: 20,
  },
  table: {
    width: '100%',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderBottom: 1,
    borderBottomColor: '#cccccc',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: 1,
    borderBottomColor: '#eeeeee',
  },
  th: {
    padding: 8,
    fontWeight: 'bold',
  },
  td: {
    padding: 8,
  },
  colDescription: { width: '50%' },
  colQty: { width: '15%', textAlign: 'center' },
  colPrice: { width: '15%', textAlign: 'right' },
  colTotal: { width: '20%', textAlign: 'right' },
  totals: {
    marginTop: 30,
    textAlign: 'right',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 5,
  },
  totalLabel: {
    width: '100px',
  },
  totalValue: {
    width: '100px',
    fontWeight: 'bold',
  },
  grandTotal: {
    marginTop: 10,
    paddingTop: 10,
    borderTop: 1,
    borderTopColor: '#cccccc',
    fontSize: 14,
  },
  notes: {
      marginTop: 40,
      fontSize: 10,
      color: '#555555',
  }
});

// --- THE PDF COMPONENT ---
export const InvoicePDF = ({ invoice }: { invoice: Invoice }) => {
  const customerInfo = invoice.notes?.split('\n\n')[0] || '';
  const additionalNotes = invoice.notes?.split('\n\n')[1] || '';
  
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header Section */}
        <View style={styles.header}>
          <View>
            <Text style={styles.invoiceTitle}>INVOICE</Text>
            <Text>{invoice.invoiceNumber}</Text>
          </View>
          <View style={styles.companyDetails}>
            <Text>Your Company Name</Text>
            <Text>123 Your Street</Text>
            <Text>Your City, State, ZIP</Text>
          </View>
        </View>

        {/* Billing Info Section */}
        <View style={styles.invoiceInfo}>
          <View style={styles.billTo}>
            <Text style={{ fontWeight: 'bold' }}>BILL TO</Text>
            <Text>{customerInfo.replace(/[\r\n]+/g, "\n")}</Text>
          </View>
          <View style={{ textAlign: 'right' }}>
            <Text><Text style={{ fontWeight: 'bold' }}>Issue Date:</Text> {new Date(invoice.issueDate).toLocaleDateString()}</Text>
            <Text><Text style={{ fontWeight: 'bold' }}>Due Date:</Text> {new Date(invoice.dueDate).toLocaleDateString()}</Text>
            <Text><Text style={{ fontWeight: 'bold' }}>Status:</Text> {invoice.status}</Text>
          </View>
        </View>

        {/* Items Table Section */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.th, styles.colDescription]}>Description</Text>
            <Text style={[styles.th, styles.colQty]}>Quantity</Text>
            <Text style={[styles.th, styles.colPrice]}>Unit Price</Text>
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

        {/* Totals Section */}
        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>${invoice.subTotal.toFixed(2)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Tax</Text>
            <Text style={styles.totalValue}>${invoice.totalTax.toFixed(2)}</Text>
          </View>
          <View style={[styles.totalRow, styles.grandTotal]}>
            <Text style={styles.totalLabel}>GRAND TOTAL</Text>
            <Text style={styles.totalValue}>${invoice.totalAmount.toFixed(2)}</Text>
          </View>
        </View>
        
        {/* Notes Section */}
        {additionalNotes && (
            <View style={styles.notes}>
                <Text style={{fontWeight: 'bold'}}>Notes</Text>
                <Text>{additionalNotes}</Text>
            </View>
        )}
      </Page>
    </Document>
  );
};