import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import React from 'react';  // Add this import

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
console.log(session);

  // Redirect to dashboard if already logged in
  // if (session&&session.user.name!=='Admin User') {    
  //   redirect('/dashboard');
  // }

  return (
    <div className="h-[100vh] flex flex-col justify-center items-center  from-indigo-600 via-purple-600 to-pink-500">
        {children}
    </div>
  );
}