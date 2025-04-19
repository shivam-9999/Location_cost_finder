import { NextRequest, NextResponse } from 'next/server';
import { BACKEND_URL } from "@/constants";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const csrfToken = request.headers.get('x-csrf-token');
    const cookies = request.headers.get('cookie');

    const res = await fetch(`${BACKEND_URL}/api/location/upload/`, {
      method: 'POST',
      headers: {
        'X-CSRFToken': csrfToken || '',
        'Cookie': cookies || '',
      },
      body: formData,
    });

    const data = await res.json();

    if (!res.ok) {
      let errorMessage = 'Upload failed';

      // ✅ Handle image-level validation errors
      if (data?.image && Array.isArray(data.image)) {
        errorMessage = data.image.join(', ');
      }

      // ✅ Handle detail-level messages
      else if (data?.detail) {
        errorMessage = data.detail;
      }

      // ✅ Handle raw string responses
      else if (typeof data === 'string') {
        errorMessage = data;
      }

      // ✅ Catch any other first key message
      else if (typeof data === 'object') {
        const firstKey = Object.keys(data)[0];
        if (data[firstKey]) {
          errorMessage = Array.isArray(data[firstKey])
            ? data[firstKey][0]
            : data[firstKey];
        }
      }

      return NextResponse.json({ error: errorMessage }, { status: res.status });
    }

    return NextResponse.json(data, { status: res.status });

  } catch (error) {
    console.error('Proxy upload error:', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}
