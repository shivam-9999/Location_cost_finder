import { NextRequest, NextResponse } from 'next/server';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const cookies = request.headers.get('cookie');
    const formData = await request.formData();
    
    const response = await fetch(`http://127.0.0.1:8000/images/${params.id}/edit/`, {
      method: 'PUT',
      headers: {
        'Cookie': cookies || '',
      },
      body: formData,
    });
    
    // Get the response data
    const data = await response.json().catch(() => null);
    
    // If response is not ok, forward the error status and message
    if (!response.ok) {
      // Handle specific error cases
      if (response.status === 401) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }
      
      if (response.status === 403) {
        return NextResponse.json(
          { error: 'You do not have permission to perform this action' },
          { status: 403 }
        );
      }
      
      if (response.status === 404) {
        return NextResponse.json(
          { error: 'Location not found' },
          { status: 404 }
        );
      }
      
      // Forward any other error from the backend
      return NextResponse.json(
        { error: data?.detail || 'Failed to edit location' },
        { status: response.status }
      );
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in image edit proxy:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 