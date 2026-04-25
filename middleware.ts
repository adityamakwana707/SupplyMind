import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const protectedRoutes = [
  '/dashboard',
  '/products',
  '/receipts',
  '/deliveries',
  '/requisitions',
  '/transfers',
  '/ledger',
  '/settings',
  '/adjustments',
  '/admin',
  '/vendor',
  '/transport'
];

export async function middleware(request: NextRequest) {
  const sessionCookie = request.cookies.get('session')?.value;
  
  const isProtectedRoute = protectedRoutes.some((route) => 
    request.nextUrl.pathname.startsWith(route)
  );

  // If there's no session and the user is trying to access a protected route
  if (!sessionCookie && isProtectedRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/auth/signin';
    url.searchParams.set('callbackUrl', request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  // If there's a session and user tries to access auth pages (login/register)
  if (sessionCookie && request.nextUrl.pathname.startsWith('/auth/')) {
    if (request.nextUrl.searchParams.get('clear') === '1') {
      return NextResponse.next();
    }
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/products/:path*',
    '/receipts/:path*',
    '/deliveries/:path*',
    '/requisitions/:path*',
    '/transfers/:path*',
    '/ledger/:path*',
    '/settings/:path*',
    '/adjustments/:path*',
    '/admin/:path*',
    '/vendor/:path*',
    '/transport/:path*',
    '/auth/:path*'
  ]
};
