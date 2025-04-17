import { getCookie } from './cookies';
import { BACKEND_URL } from '../constants';

export async function getCsrfToken() {
  try {
    const response = await fetch(`${BACKEND_URL}/api/auth/csrf/`, {
      method: "GET",
      credentials: "include",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
      mode: "cors",
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log("✅ CSRF token fetched:", data.csrfToken);

    if (!data.csrfToken) {
      throw new Error("CSRF token missing in JSON response");
    }

    return data.csrfToken;

  } catch (error) {
    console.error("❌ CSRF fetch error:", error);
    throw error;
  }
}



export async function login(username: string, password: string, loginType: string = "user") {
  try {
    let endpoint = `${BACKEND_URL}/api/auth/login/`;

    console.log("🔄 Getting CSRF token...");
    const csrfToken =await getCsrfToken();
    // const csrfToken = getCookie('csrftoken');
    console.log("✅ Got CSRF token:", csrfToken);

    if (!csrfToken) {
      throw new Error("❌ CSRF token not found. Please refresh the page.");
    }

    if (loginType === "admin") {
      endpoint = `${BACKEND_URL}/api/auth/admin/login/`;
    } else if (loginType === "superadmin") {
      endpoint = `${BACKEND_URL}/api/auth/superadmin/login/`;
    }

    console.log("👉 Making login request to:", endpoint);

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": csrfToken,
        "Accept": "application/json",
      },
      credentials: "include",
      mode: "cors",
      body: JSON.stringify({ username, password }),
    });

    console.log("📦 Login response status:", response.status);

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
        console.error("❌ Login failed with response:", errorData);
      } catch (err) {
        console.error("❌ Login failed but response not JSON:", response);
      }

      if (response.status === 404 && errorData?.detail?.includes("not found")) {
        throw new Error(`Username "${username}" not found. Please sign up first.`);
      }
      if (response.status === 401 || response.status === 403) {
        throw new Error("Username or password is incorrect. Please try again.");
      }
      throw new Error(errorData?.detail || "Login failed");
    }

    const data = await response.json();
    console.log("✅ Login success:", data);

    if (data.user) {
      localStorage.setItem("user", JSON.stringify(data.user));
    }

    return data;
  } catch (error) {
    console.error("🚨 Login error caught:", error);
    throw error;
  }
}
