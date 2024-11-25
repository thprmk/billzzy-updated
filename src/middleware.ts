import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;


    

    // Check subscription status
    if (token?.endDate) {
      const endDate = new Date(token.endDate);
      
      if (endDate < new Date() && path !== '/lock') {
        return NextResponse.redirect(new URL('/lock', req.url));
      }
    }

    // Admin routes protection
    if (path.startsWith('/admin') && token?.role !== 'admin') {
      return NextResponse.redirect(new URL('/', req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token
    }
  }
);

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/products/:path*',
    '/customers/:path*',
    '/billing/:path*',
    '/settings/:path*',
    '/admin/:path*'
  ]
};