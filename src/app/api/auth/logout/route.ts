import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { BACKEND_URL } from '@/constants';

// Ensure this route is not cached
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST() {
  try {
    const cookieStore = cookies();
    const csrfToken = (await cookieStore).get('csrftoken')?.value;

    const backendResponse = await fetch(`${BACKEND_URL}/api/auth/logout/`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-CSRFToken': csrfToken || '',
      },
    });

    if (!backendResponse.ok) {
      const errorData = await backendResponse.json();
      return NextResponse.json(
        { error: errorData.detail || 'Logout failed' },
        { status: backendResponse.status }
      );
    }

    return NextResponse.json(
      { success: true, message: 'Logged out successfully' },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
