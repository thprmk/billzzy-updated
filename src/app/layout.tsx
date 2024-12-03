import { Inter } from 'next/font/google';
import { SessionProvider } from '@/providers/SessionProvider';
import './globals.css';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import React from 'react';  // Add this import
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Analytics } from "@vercel/analytics/react"

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Billzzy',
  description: 'Billing and Inventory Management System',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>

        <SessionProvider>
        <ToastContainer position="top-right" autoClose={5000} hideProgressBar />
        <SpeedInsights />
        <Analytics/>

          {children}

        </SessionProvider>
      </body>
    </html>
  );
}