import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST() {
  const cookieStore = await cookies();
  
  // Create response with success message
  const response = NextResponse.json(
    { success: true, message: 'Logged out successfully' },
    { status: 200 }
  );
  
  // Clear cookies by setting them to expire in the past
  response.cookies.set('access_token', '', { 
    expires: new Date(0),
    httpOnly: true,
    sameSite: 'lax',
    path: '/'
  });
  
  response.cookies.set('refresh_token', '', { 
    expires: new Date(0),
    httpOnly: true,
    sameSite: 'lax',
    path: '/'
  });
  
  // Clear the csrftoken cookie (case-sensitive)
  response.cookies.set('csrftoken', '', { 
    expires: new Date(0),
    httpOnly: true,
    sameSite: 'lax',
    path: '/'
  });
  
  return response;
} 