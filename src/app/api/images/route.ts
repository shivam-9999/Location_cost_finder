import { NextRequest, NextResponse } from 'next/server';
import { BACKEND_URL } from "@/constants";

export async function GET(request: NextRequest) {
  try {
    // Get cookies and CSRF token from the request
    const cookies = request.headers.get('cookie');
    
    // Forward the request to the external API
    const response = await fetch(`${BACKEND_URL}/api/images/`, {
      method: 'GET',
      headers: {
        'Cookie': cookies || '',
      },
      credentials: 'include',
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch images: ${response.status}`);
    }
    
    // Get the response data
    const data = await response.json();
    
    // Return the response
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in images proxy:', error);
    return NextResponse.json(
      { error: 'Failed to fetch images' },
      { status: 500 }
    );
  }
} 