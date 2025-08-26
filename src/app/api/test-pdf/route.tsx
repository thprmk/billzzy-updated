// src/app/api/test-pdf/route.tsx

import { NextResponse } from 'next/server';
import { renderToStream } from '@react-pdf/renderer';
import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

// Force the Node.js runtime, as this is critical for the library
export const runtime = 'nodejs'; 

// Create the simplest possible PDF component right inside this file
const MyTestPDF = () => (
  <Document>
    <Page size="A4">
      <View>
        <Text>Hello World</Text>
      </View>
    </Page>
  </Document>
);

export async function GET(req: Request) {
  try {
    console.log("--- [GET /api/test-pdf] ---");
    console.log("Attempting to render 'Hello World' PDF...");

    const pdfStream = await renderToStream(<MyTestPDF />);

    console.log("PDF stream for 'Hello World' created successfully!");

    return new Response(pdfStream as any, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="hello-world.pdf"',
      },
    });

  } catch (error) {
    console.error("CRASHED during 'Hello World' PDF test:", error);
    return new NextResponse('Internal Server Error during PDF test', { status: 500 });
  }
}