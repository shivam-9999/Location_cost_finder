import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    // Get the request body
    const body = await request.json();
    
    // Get the CSRF token from the request headers
    const csrfToken = request.headers.get("X-CSRFToken");
    
    if (!csrfToken) {
      return NextResponse.json(
        { message: "CSRF token is required" },
        { status: 400 }
      );
    }
    
    // Get all cookies from the request
    const cookies = request.headers.get("cookie");
    
    // Forward the request to the Django backend
    const response = await fetch("http://127.0.0.1:8000/api/auth/signup/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": csrfToken,
        "Cookie": cookies || "",
      },
      body: JSON.stringify(body),
    });
    
    // Get the response data
    const data = await response.json();
    
    // If the response is not ok, return the error with more details
    if (!response.ok) {
      // Check for specific error cases
      if (response.status === 400) {
        return NextResponse.json(
          { message: data.detail || "Invalid input data" },
          { status: 400 }
        );
      }
      if (response.status === 403) {
        return NextResponse.json(
          { message: "Authentication failed. Please try again." },
          { status: 403 }
        );
      }
      if (response.status === 409) {
        return NextResponse.json(
          { message: "Username already exists" },
          { status: 409 }
        );
      }
      // Forward any other error from the backend
      return NextResponse.json(
        { message: data.detail || "Signup failed" },
        { status: response.status }
      );
    }
    
    // Return the success response
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
} 