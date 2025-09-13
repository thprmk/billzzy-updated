// src/components/invoices/InvoicePDF.tsx
'use client';

import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import { Invoice } from '@/types/invoice';

const styles = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 10, padding: 40, color: '#333' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  headerLeft: { maxWidth: '60%' },
  logo: { width: 120, height: 'auto', marginBottom: 10 },
  companyName: { fontSize: 18, fontWeight: 'bold', color: '#000' },
  companyDetails: { fontSize: 9, color: '#666', lineHeight: 1.4 },
  headerRight: { textAlign: 'right' },
  invoiceTitle: { fontSize: 28, fontWeight: 'bold' },
  invoiceInfo: { fontSize: 9, color: '#666', marginTop: 2 },
  metaSection: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30, marginTop: 20 },
  billTo: { color: '#000', fontSize: 9, fontWeight: 'bold', marginBottom: 4 },
  customerDetails: { fontSize: 10, lineHeight: 1.5 },
  table: { width: '100%', borderStyle: 'solid', borderColor: '#eee', borderWidth: 1, borderRadius: 3 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#f8f9fa', borderBottomWidth: 1, borderColor: '#eee' },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#eee', alignItems: 'center' },
  th: { padding: 8, fontWeight: 'bold', fontSize: 9, textTransform: 'uppercase' },
  td: { padding: 8 },
  colDescription: { width: '55%' },
  colQty: { width: '15%', textAlign: 'right' },
  colPrice: { width: '15%', textAlign: 'right' },
  colTotal: { width: '15%', textAlign: 'right' },
  summarySection: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 20 },
  totalsContainer: { width: '40%' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  totalLabel: { color: '#666' },
  grandTotal: { borderTopWidth: 1, borderTopColor: '#333', marginTop: 5, paddingTop: 5, fontSize: 14, fontWeight: 'bold' },
  notesSection: { marginTop: 'auto', paddingTop: 20, borderTopWidth: 1, borderTopColor: '#eee', fontSize: 9, color: '#666' },
});

export const InvoicePDF = ({ invoice }: { invoice: Invoice }) => {
  // Defensive data handling
  const org = invoice.organisation || {};
  const cust = invoice.customer;

  // Ensure all values passed to <Text> are strings with fallbacks
  const orgName = String(org.shopName || 'Your Company');
  const orgAddr = `${String(org.street || '')}, ${String(org.flatNo || '')}\n${String(org.city || 'City')}, ${String(org.state || '')} ${String(org.pincode || '')}`;
  const orgEmail = String(org.email || '');

  const custName = String(cust?.name || 'Walk-in Customer');
  const custAddr = cust ? `${String(cust.street || '')}, ${String(cust.flatNo || '')}\n${String(cust.district || '')}, ${String(cust.state || '')} ${String(cust.pincode || '')}` : '';
  const custEmail = String(cust?.email || '');
  
  const issueDateStr = new Date(invoice.issueDate).toLocaleDateString();
  const dueDateStr = new Date(invoice.dueDate).toLocaleDateString();

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {invoice.logoUrl && (
              <Image src={{ uri: invoice.logoUrl, method: 'GET', headers: {}, body: '' }} style={styles.logo} />
            )}
            <Text style={styles.companyName}>{orgName}</Text>
            <Text style={styles.companyDetails}>{orgAddr}</Text>
            <Text style={styles.companyDetails}>{orgEmail}</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.invoiceTitle}>INVOICE</Text>
            <Text style={styles.invoiceInfo}>#: {String(invoice.invoiceNumber)}</Text>
            <Text style={styles.invoiceInfo}>Status: {String(invoice.status)}</Text>
          </View>
        </View>
        
        <View style={styles.metaSection}>
            <View>
                <Text style={styles.billTo}>BILL TO</Text>
                <View style={styles.customerDetails}>
                    <Text>{custName}</Text>
                    <Text>{custAddr}</Text>
                    <Text>{custEmail}</Text>
                </View>
            </View>
            <View style={{ textAlign: 'right' }}>
                <Text>Issue Date: {issueDateStr}</Text>
                <Text>Due Date: {dueDateStr}</Text>
            </View>
        </View>

        <View style={styles.table}>
            <View style={styles.tableHeader}>
                <Text style={[styles.th, styles.colDescription]}>Item</Text>
                <Text style={[styles.th, styles.colQty]}>Qty</Text>
                <Text style={[styles.th, styles.colPrice]}>Price</Text>
                <Text style={[styles.th, styles.colTotal]}>Amount</Text>
            </View>
            {invoice.items.map((item) => (
                // --- THE CRITICAL FIX IS HERE ---
                <View key={String(item.id)} style={styles.tableRow}> 
                    <Text style={[styles.td, styles.colDescription]}>{String(item.description)}</Text>
                    <Text style={[styles.td, styles.colQty]}>{String(item.quantity)}</Text>
                    <Text style={[styles.td, styles.colPrice]}>Rs. {item.unitPrice.toFixed(2)}</Text>
                    <Text style={[styles.td, styles.colTotal]}>Rs. {item.total.toFixed(2)}</Text>
                </View>
            ))}
        </View>
        
        <View style={styles.summarySection}>
            <View style={styles.totalsContainer}>
                <View style={styles.totalRow}><Text style={styles.totalLabel}>Subtotal</Text><Text>Rs. {invoice.subTotal.toFixed(2)}</Text></View>
                <View style={styles.totalRow}><Text style={styles.totalLabel}>Tax</Text><Text>Rs. {invoice.totalTax.toFixed(2)}</Text></View>
                <View style={[styles.totalRow, styles.grandTotal]}><Text>Total</Text><Text>Rs. {invoice.totalAmount.toFixed(2)}</Text></View>
            </View>
        </View>

        {invoice.notes && (
            <View style={styles.notesSection}><Text style={{fontWeight: 'bold'}}>Notes:</Text><Text>{String(invoice.notes)}</Text></View>
        )}
      </Page>
    </Document>
  );
};