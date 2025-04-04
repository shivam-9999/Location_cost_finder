import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// This function can be marked `async` if using `await` inside
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Get the token from cookies
  const token = request.cookies.get('access_token');
  
  // Define public paths that don't require authentication
  const isPublicPath = pathname === '/login' || pathname === '/register' || pathname === '/' || pathname === '/dashboard';
  
  // Check if the path is for admin or user dashboard
  const isAdminPath = pathname.startsWith('/admin');
  const isUserPath = pathname.startsWith('/user');
  
  // If user is on a public path and has a token, redirect to appropriate dashboard
  if (isPublicPath && token) {
    // Check if the path is /dashboard and redirect to the appropriate dashboard
    if (pathname === '/dashboard') {
      // We can't access localStorage in middleware, so we'll redirect to a client-side route
      // that will handle the role check and redirect accordingly
      return NextResponse.redirect(new URL('/dashboard-redirect', request.url));
    }
    
    // For other public paths, redirect to user dashboard by default
    return NextResponse.redirect(new URL('/user/dashboard', request.url));
  }
  
  // If user is not on a public path and doesn't have a token, redirect to login
  if (!isPublicPath && !token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  // If user is trying to access admin path, we'll let the admin dashboard page handle the role check
  // If user is trying to access user path, we'll let the user dashboard page handle the role check
  
  return NextResponse.next();
}

// Configure which routes should trigger the middleware
export const config = {
  matcher: [
    '/dashboard',
    '/user/:path*',
    '/admin/:path*',
    '/login',
    '/register',
    '/',
  ],
}; 