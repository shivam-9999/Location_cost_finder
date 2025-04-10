import { NextRequest, NextResponse } from 'next/server';
import { BACKEND_URL } from "@/constants";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const cookies = request.headers.get('cookie');
    
    const response = await fetch(`${BACKEND_URL}/images/${params.id}/delete/`, {
      method: 'DELETE',
      headers: {
        'Cookie': cookies || '',
      },
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
          { error: 'You do not have permission to delete this location' },
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
        { error: data?.detail || 'Failed to delete location' },
        { status: response.status }
      );
    }
    
    return NextResponse.json({ message: 'Location deleted successfully' });
  } catch (error) {
    console.error('Error in image delete proxy:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 