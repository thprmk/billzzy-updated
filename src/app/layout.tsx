import { Inter } from 'next/font/google';
import { SessionProvider } from '@/providers/SessionProvider';
import './globals.css';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';


const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Billz',
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

          {children}

        </SessionProvider>
      </body>
    </html>
  );
}