import { getCookie } from './cookies';

export async function getCsrfToken() {
  try {
    // Wrap the fetch in a try-catch to handle any external interference
    const response = await fetch("http://localhost:8000/api/auth/csrf/", {
      method: "GET",
      credentials: "include"
    }).catch(error => {
      console.warn("Fetch error (might be from extension):", error);
      throw error;
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    // Safely parse the response
    let data;
    try {
      data = await response.json();
    } catch (parseError) {
      console.warn("JSON parse error:", parseError);
      throw new Error("Failed to parse response");
    }
    
    console.log("✅ Success:", data);
    return data;
  } catch (error) {
    // Log the error but don't let it crash the app
    console.error("❌ Error:", error);
    throw error;
  }
}

export async function login(username: string, password: string) {
  try {
    const csrfToken = getCookie("csrftoken");
    console.log("Using CSRF token:", csrfToken);

    const res = await fetch("http://localhost:8000/api/auth/login/", {
      method: "POST",
      credentials: "include", // very important
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": csrfToken || "", // Django looks for this
      },
      body: JSON.stringify({ username, password }),
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error?.error || "Login failed");
    }

    const data = await res.json();
    console.log("✅ Login successful:", data);
    return data; // returns user data (not tokens)
  } catch (error) {
    console.error("❌ Login error:", error);
    throw error;
  }
} 