import { getCookie } from './cookies';
import { BACKEND_URL } from '../constants';

export async function getCsrfToken() {
  try {
    // Wrap the fetch in a try-catch to handle any external interference
    const response = await fetch(`${BACKEND_URL}/api/auth/csrf/`, {
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
    
    // Only log a simple message instead of the full data object
    console.log("✅ CSRF token fetched successfully");
    return data;
  } catch (error) {
    // Log the error but don't let it crash the app
    console.error("❌ Error:", error);
    throw error;
  }
}

export async function login(username: string, password: string, loginType: string = "user") {
  try {
    // Get CSRF token first
    const csrfToken = await getCsrfToken();
    
    // Determine the endpoint based on login type
    let endpoint = `${BACKEND_URL}/api/auth/login/`;
    
    if (loginType === "admin") {
      endpoint = `${BACKEND_URL}/api/auth/admin/login/`;
    } else if (loginType === "superadmin") {
      endpoint = `${BACKEND_URL}/api/auth/superadmin/login/`;
    }
    
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": csrfToken,
      },
      credentials: "include",
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      // Only show specific message for 404 (not found) if we're certain
      if (response.status === 404 && errorData.detail?.includes("not found")) {
        throw new Error(`Username "${username}" not found. Please sign up first.`);
      }
      // For 401 and other authentication failures, show a generic message
      if (response.status === 401 || response.status === 403) {
        throw new Error("Username or password is incorrect. Please try again.");
      }
      throw new Error(errorData.detail || "Login failed");
    }

    const data = await response.json();
    
    // Store user information in localStorage
    if (data.user) {
      localStorage.setItem("user", JSON.stringify(data.user));
    }
    
    return data;
  } catch (error) {
    console.error("Login error:", error);
    throw error;
  }
} 