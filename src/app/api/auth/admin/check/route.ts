import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token');
  const userRole = cookieStore.get('user_role');
  
  // Check if user is authenticated and has admin role
  if (!token || userRole?.value !== 'admin') {
    return NextResponse.json(
      { success: false, message: 'Not authenticated as admin' },
      { status: 401 }
    );
  }
  
  return NextResponse.json(
    { success: true, message: 'Authenticated as admin' },
    { status: 200 }
  );
} 