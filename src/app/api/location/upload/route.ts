import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Get the form data from the request
    const formData = await request.formData();
    
    // Get the CSRF token from the request headers
    const csrfToken = request.headers.get('x-csrf-token');
    
    // Get cookies from the request
    const cookies = request.headers.get('cookie');
    
    // Forward the request to the external API
    const response = await fetch('http://127.0.0.1:8000/api/location/upload/', {
      method: 'POST',
      headers: {
        'X-CSRFToken': csrfToken || '',
        'Cookie': cookies || '',
      },
      body: formData,
    });
    
    // Get the response data
    const data = await response.json();
    
    // Return the response
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Error in location upload proxy:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
} 