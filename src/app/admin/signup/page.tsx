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

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`${name}=([^;]+)`));
  return match ? match[1] : null;
}

export default function AdminSignupPage() {
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

  const validateForm = () => {
    // Match backend validation rules exactly
    if (!formData.username || !formData.password) {
      setError("Username and password are required");
      return false;
    }
    if (formData.username.length < 3) {
      setError("Username must be at least 3 characters long");
      return false;
    }
    if (!validatePassword(formData.password)) {
      return false;
    }
    if (formData.email) {
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(formData.email)) {
        setError("Invalid email format");
        return false;
      }
    }
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value.trim() }));
    setError("");
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
      
      // Then attempt signup using the direct backend URL
      const response = await fetch("http://localhost:8000/api/auth/admin/signup/", {
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
        throw new Error(jsonData?.error || "Signup failed. Please try again.");
      }

      // Show success message with waiting for approval info
      toast.success(
        jsonData?.message || 
        "Admin registration request submitted successfully. Waiting for superadmin approval."
      );
      
      // Redirect to login with parameter to prevent middleware redirection
      router.push("/login?fromSignup=true");
      
    } catch (error) {
      console.error("Signup error:", error);
      setError(error instanceof Error ? error.message : "Signup failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <Card className="w-[350px] p-0">
        <CardHeader className="pt-6 px-6">
          <CardTitle>Admin Sign Up</CardTitle>
          <CardDescription>
            Create a new admin account request
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="px-6">
            <div className="grid w-full items-center gap-4">
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  name="username"
                  placeholder="Choose a username (min. 3 characters)"
                  value={formData.username}
                  onChange={handleChange}
                  required
                  minLength={3}
                  autoComplete="username"
                />
              </div>
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="email">Email (Optional)</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="Enter your email (optional)"
                  value={formData.email}
                  onChange={handleChange}
                  autoComplete="email"
                />
              </div>
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  className="mb-5"
                  placeholder="Choose a password (min. 6 characters)"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4 px-6 pb-6">
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Submitting..." : "Submit Admin Request"}
            </Button>
            <p className="text-sm text-center text-gray-500">
              Already have an account?{" "}
              <Link href="/login" className="text-blue-500 hover:underline">
                Login
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}