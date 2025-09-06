import { Inter } from 'next/font/google';
import { SessionProvider } from '@/providers/SessionProvider';
import './globals.css';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import React from 'react'; 
import { Metadata } from 'next';

import { Notifications } from '@/components/Notifications';
import LoadingBar from '@/components/ui/LoadingBar';

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter', // This is the new configuration
});


export const metadata: Metadata = { 
  title: 'Billzzy',
  description: 'Billing and Inventory Management System',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any', rel: 'icon' },
      { url: '/favicon-16x16.png', type: 'image/png', sizes: '16x16' },
      { url: '/favicon-32x32.png', type: 'image/png', sizes: '32x32' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', rel: 'apple-touch-icon' },
    ],
  },
};


export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans flex flex-col min-h-screen`} suppressHydrationWarning>
                <LoadingBar />

        <SessionProvider>
          <ToastContainer position="top-right" autoClose={5000} hideProgressBar />
          <Notifications />

          <main className="flex-grow">
            {children}
            {/* <Footer /> */}
          </main>
        </SessionProvider>
      </body>
    </html>
  );
}