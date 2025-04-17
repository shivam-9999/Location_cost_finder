import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const host = request.headers.get("host");

  // 1. ✅ Enforce custom domain for frontend
  if (host && host.includes("azurewebsites.net")) {
    return NextResponse.redirect(
      new URL(request.nextUrl.pathname, 'https://app.locationcostfinder.space')
    );
  }

  const { pathname, searchParams } = request.nextUrl;
  const token = request.cookies.get('access_token');
  const fromSignup = searchParams.get('fromSignup') === 'true';

  const isPublicPath =
    pathname === '/login' ||
    pathname === '/user/signup' ||
    pathname === '/admin/signup' ||
    pathname === '/' ||
    pathname === '/dashboard';

  const isSuperAdminPath = pathname.startsWith('/superadmin');
  const isAdminPath = pathname.startsWith('/admin') && !pathname.includes('/signup');
  const isUserPath = pathname.startsWith('/user') && !pathname.includes('/signup');

  if (isPublicPath && token && !fromSignup) {
    if (pathname === '/dashboard') {
      return NextResponse.redirect(new URL('/dashboard-redirect', request.url));
    }
    return NextResponse.redirect(new URL('/user/dashboard', request.url));
  }

  if (!isPublicPath && !token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (isUserPath) {
    if (!token || token.value === 'undefined' || token.value === '') {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard',
    '/superadmin/:path*',
    '/admin/:path*',
    '/user/:path*',
    '/login',
    '/user/signup',
    '/admin/signup',
    '/',
    '/api/auth/logout',
  ],
};
