import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// This function can be marked `async` if using `await` inside
export function middleware(request: NextRequest) {
  // Get the pathname of the request
  const path = request.nextUrl.pathname;
  
  // Define public paths that don't require authentication
  const isPublicPath = path === '/login' || path === '/register' || path === '/';
  
  // Get the token from the cookies
  const token = request.cookies.get('access_token')?.value || '';
  
  // Redirect logic
  if (isPublicPath && token) {
    // If user is on a public path but has a token, redirect to dashboard
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
  
  if (!isPublicPath && !token) {
    // If user is on a protected path but has no token, redirect to login
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  // Allow the request to continue
  return NextResponse.next();
}

// Configure which routes to run middleware on
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/login',
    '/register',
    '/'
  ]
}; 