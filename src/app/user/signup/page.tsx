"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getCsrfToken } from "@/lib/auth";

function getCookie(name: string) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift();
  return null;
}

export default function UserSignupPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    email: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [validationErrors, setValidationErrors] = useState({
    username: "",
    password: "",
    email: "",
  });

  const validateUsername = (username: string): boolean => {
    // Username should be at least 3 characters long
    if (username.length < 3) {
      setValidationErrors(prev => ({
        ...prev,
        username: "Username must be at least 3 characters long"
      }));
      return false;
    }

    // Username should only contain letters, numbers, and underscores
    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if (!usernameRegex.test(username)) {
      setValidationErrors(prev => ({
        ...prev,
        username: "Username can only contain letters, numbers, and underscores"
      }));
      return false;
    }

    setValidationErrors(prev => ({ ...prev, username: "" }));
    return true;
  };

  const validatePassword = (password: string): boolean => {
    if (password.length < 6) {
      setValidationErrors(prev => ({
        ...prev,
        password: "Password must be at least 6 characters long"
      }));
      return false;
    }

    // Password should contain at least one lowercase letter and one number
    const passwordRegex = /^(?=.*[a-z])(?=.*\d).+$/;
    if (!passwordRegex.test(password)) {
      setValidationErrors(prev => ({
        ...prev,
        password: "Password must contain at least one lowercase letter and one number"
      }));
      return false;
    }

    setValidationErrors(prev => ({ ...prev, password: "" }));
    return true;
  };

  const validateEmail = (email: string): boolean => {
    if (!email) {
      setValidationErrors(prev => ({ ...prev, email: "" }));
      return true; // Email is optional
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      setValidationErrors(prev => ({
        ...prev,
        email: "Please enter a valid email address"
      }));
      return false;
    }

    setValidationErrors(prev => ({ ...prev, email: "" }));
    return true;
  };

  const validateForm = (): boolean => {
    const isUsernameValid = validateUsername(formData.username);
    const isPasswordValid = validatePassword(formData.password);
    const isEmailValid = validateEmail(formData.email);

    return isUsernameValid && isPasswordValid && isEmailValid;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value.trim() }));
    setError("");

    // Validate field on change
    switch (name) {
      case "username":
        validateUsername(value);
        break;
      case "password":
        validatePassword(value);
        break;
      case "email":
        validateEmail(value);
        break;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (!validateForm()) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      // First get CSRF token from Django backend
      const csrfResponse = await fetch("http://localhost:8000/api/auth/csrf/", {
        method: "GET",
        credentials: "include",
      });
      
      if (!csrfResponse.ok) {
        throw new Error("Failed to get CSRF token");
      }

      // Wait for the response and parse it
      const csrfData = await csrfResponse.json();
      
      // Get the CSRF token from cookies
      const csrfToken = getCookie('csrftoken');
      
      if (!csrfToken) {
        throw new Error("CSRF token not found. Please refresh the page.");
      }
      
      // Prepare the request data - only include email if it's not empty
      const requestData = {
        username: formData.username,
        password: formData.password,
        ...(formData.email && { email: formData.email }),
      };
      
      // Then attempt signup using the direct backend URL with the correct endpoint
      const response = await fetch("http://localhost:8000/api/auth/signup/", {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
          "X-CSRFToken": csrfToken,
        },
        credentials: "include",
        body: JSON.stringify(requestData),
      });
      
      const responseText = await response.text();
      let jsonData;
      
      try {
        jsonData = JSON.parse(responseText);
      } catch (e) {
        if (responseText.includes("<!DOCTYPE")) {
          throw new Error("Server configuration error. Please try again later.");
        }
        throw new Error(responseText || "Signup failed. Please try again.");
      }

      if (!response.ok) {
        // Handle specific error cases from the backend
        if (response.status === 403) {
          throw new Error(jsonData?.error || "Permission denied. Please try again.");
        }
        if (response.status === 400) {
          throw new Error(jsonData?.error || "Invalid input data. Please check your information.");
        }
        if (response.status === 409) {
          throw new Error("Username already exists. Please choose a different username.");
        }
        throw new Error(jsonData?.error || "Signup failed. Please try again.");
      }

      // Clear any stored user data to prevent automatic login
      localStorage.removeItem("user");
      sessionStorage.clear();
      
      // Remove all authentication cookies
      document.cookie = "sessionid=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      document.cookie = "csrftoken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      document.cookie = "access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      document.cookie = "refresh_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      document.cookie = "user_role=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";

      // Clear any role-specific data
      localStorage.removeItem("adminLocationData");
      localStorage.removeItem("superadminLocationData");

      toast.success("User signup successful! Please login.");
      
      // Force a complete navigation to login page with a parameter to prevent middleware redirection
      window.location.href = "/login?fromSignup=true";
      
    } catch (error) {
      console.error("Signup error:", error);
      setError(error instanceof Error ? error.message : "Signup failed");
    } finally {
      setIsLoading(false);
    }
  };

  const renderField = (
    name: "username" | "password" | "email",
    label: string,
    type: string = "text",
    required: boolean = true,
    placeholder: string
  ) => (
    <div className="flex flex-col space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        name={name}
        type={type}
        placeholder={placeholder}
        value={formData[name]}
        onChange={handleChange}
        required={required}
        autoComplete={name}
        className={validationErrors[name] ? "border-red-500" : "border-gray-300 focus:border-green-500 focus:ring-green-500"}
      />
      {validationErrors[name] && (
        <p className="text-sm text-red-500 mt-1">{validationErrors[name]}</p>
      )}
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-white">
      <Card className="w-[350px] p-0 shadow-lg border border-gray-100">
        <CardHeader className="pt-6 px-6 bg-gradient-to-r from-green-600 to-green-400 text-white">
          <CardTitle>User Sign Up</CardTitle>
          <CardDescription className="text-white text-opacity-80">
            Create a new user account
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="px-6 pt-6">
            <div className="grid w-full items-center gap-4">
              {renderField(
                "username",
                "Username",
                "text",
                true,
                "Choose a username (min. 3 characters)"
              )}
              {renderField(
                "email",
                "Email (Optional)",
                "email",
                false,
                "Enter your email (optional)"
              )}
              {renderField(
                "password",
                "Password",
                "password",
                true,
                "Choose a password (min. 6 characters)"
              )}
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4 px-6 pb-6">
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <Button 
              type="submit" 
              className="w-full bg-green-500 hover:bg-green-600 text-white" 
              disabled={isLoading || Object.values(validationErrors).some(error => error !== "")}
            >
              {isLoading ? "Signing up..." : "Sign Up"}
            </Button>
            <p className="text-sm text-center text-gray-500">
              Already have an account?{" "}
              <Link href="/login" className="text-green-500 hover:underline">
                Login
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
} 