// middleware.ts
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname; // Use the full pathname for clarity
    const isAdminPath = pathname.startsWith('/admin');
    
    if (token?.role === 'admin' && !isAdminPath) {
      return NextResponse.redirect(new URL('/admin', req.url));
    }
    

    if (isAdminPath && token?.role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    // If neither of the above rules apply, the user is in the correct place.
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/products/:path*',
    '/customers/:path*',
    '/billing/:path*',
    '/transactions/:path*',
    '/settings/:path*',
    '/admin/:path*'
  ]
};