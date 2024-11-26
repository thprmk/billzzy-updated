import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const isAuth = req.nextauth.token;
    const isAdminPath = req.nextUrl.pathname.startsWith('/admin');
    
    // Check for admin routes
    if (isAdminPath && req.nextauth.token?.role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token
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