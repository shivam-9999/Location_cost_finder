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
  
  // In a real application, you would verify the token with your backend
  // For now, we'll check for a user_role cookie that might be set by your backend
  
  const userRole = cookieStore.get('user_role');
  
  // If no role is set, default to 'user'
  const role = userRole?.value || 'user';
  
  return NextResponse.json(
    { success: true, role },
    { status: 200 }
  );
} 