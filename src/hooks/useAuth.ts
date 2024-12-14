import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export function useAuth() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const logout = async () => {
    await signOut({ redirect: false });
    router.push('/login');
  };

  const checkSubscription = () => {
    if (session?.user?.endDate) {
      const endDate = new Date(session.user.endDate);
      if (endDate < new Date()) {
        router.push('/lock');
        return false;
      }
    }
    return true;
  };

  return {
    session,
    status,
    logout,
    checkSubscription,
    isAuthenticated: !!session,
    isLoading: status === 'loading',
    user: session?.user
  };
}