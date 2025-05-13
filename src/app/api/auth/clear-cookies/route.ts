import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST() {
  // We'll skip trying to delete from the request cookies
  // since we can't modify request cookies directly
  
  // Instead, we'll just focus on setting expired cookies in the response
  const response = NextResponse.json(
    { success: true, message: 'Cookies cleared' },
    { status: 200 }
  );
  
  // Set cookies with expired dates to clear them
  response.cookies.set({
    name: 'access_token',
    value: '',
    expires: new Date(0),
    path: '/',
    httpOnly: true,
    sameSite: 'lax'
  });
  
  response.cookies.set({
    name: 'refresh_token',
    value: '',
    expires: new Date(0),
    path: '/',
    httpOnly: true,
    sameSite: 'lax'
  });
  
  response.cookies.set({
    name: 'csrftoken',
    value: '',
    expires: new Date(0),
    path: '/',
    sameSite: 'lax'
  });
  
  return response;
} 