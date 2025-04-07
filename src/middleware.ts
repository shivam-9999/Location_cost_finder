import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// This function can be marked `async` if using `await` inside
export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  
  // Get the token from cookies
  const token = request.cookies.get('access_token');
  
  // Check if we're coming from signup (will have a fromSignup parameter)
  const fromSignup = searchParams.get('fromSignup') === 'true';
  
  // Define public paths that don't require authentication
  const isPublicPath = pathname === '/login' || 
                      pathname === '/user/signup' || 
                      pathname === '/admin/signup' || 
                      pathname === '/' || 
                      pathname === '/dashboard';
  
  // Check if the path is for superadmin, admin, or user dashboard
  const isSuperAdminPath = pathname.startsWith('/superadmin');
  const isAdminPath = pathname.startsWith('/admin') && !pathname.includes('/signup');
  const isUserPath = pathname.startsWith('/user') && !pathname.includes('/signup');
  
  // If user is on a public path and has a token, redirect to appropriate dashboard
  // BUT skip the redirection if we're coming from signup
  if (isPublicPath && token && !fromSignup) {
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
  
  // Additional check for user paths to ensure valid token
  if (isUserPath) {
    // Verify token is valid - if we can't validate it here, the dashboard component 
    // will do a more thorough check through the API
    if (!token || token.value === 'undefined' || token.value === '') {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }
  
  return NextResponse.next();
}

// Configure which routes should trigger the middleware
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
  ],
}; 