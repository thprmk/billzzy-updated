import PrintingModule from '@/components/printing/PrintingModule';
import React from 'react';  // Add this import

export default function PrintingPage() {
  return (
    <div className="max-w-7xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Printing Management</h1>
      <PrintingModule />
    </div>
  );
}