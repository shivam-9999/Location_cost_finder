import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token');
  
  if (!token) {
    return NextResponse.json(
      { success: false, message: 'Not authenticated' },
      { status: 401 }
    );
  }
  
  // Here you could also verify the token with your backend if needed
  // For now, we'll just check if it exists
  
  return NextResponse.json(
    { success: true, message: 'Authenticated' },
    { status: 200 }
  );
} 