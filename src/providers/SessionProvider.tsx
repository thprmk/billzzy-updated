// providers/SessionProvider.tsx
'use client';

import { Session } from 'next-auth';
import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import React from 'react';  // Add this import

interface SessionProviderProps {
  children: React.ReactNode;
  session?: Session | null;
}

export function SessionProvider({ children, session }: SessionProviderProps) {
  return (
    <NextAuthSessionProvider session={session}>
      <SubscriptionCheck>{children}</SubscriptionCheck>
    </NextAuthSessionProvider>
  );
}

// Subscription check component
function SubscriptionCheck({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.endDate) {
      const endDate = new Date(session.user.endDate);
      const currentDate = new Date();

      if (endDate < currentDate) {
        router.push('/lock');
      }
    }
  }, [session, status, router]);

  return <>{children}</>;
}