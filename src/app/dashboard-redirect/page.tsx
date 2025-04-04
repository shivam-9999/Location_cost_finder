"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DashboardRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    // Get user information from localStorage
    const userStr = localStorage.getItem("user");
    if (userStr) {
      const user = JSON.parse(userStr);
      
      // Check if the user is a superadmin, admin, or regular user
      const isSuperAdmin = user.groups && user.groups.includes("superadmin");
      const isAdmin = user.groups && user.groups.includes("admin");
      
      // Redirect to the appropriate dashboard
      if (isSuperAdmin) {
        router.push("/superadmin/dashboard");
      } else if (isAdmin) {
        router.push("/admin/dashboard");
      } else {
        router.push("/user/dashboard");
      }
    } else {
      // If no user information is found, redirect to login
      router.push("/login");
    }
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Redirecting...</h1>
        <p className="text-gray-600">Please wait while we redirect you to your dashboard.</p>
      </div>
    </div>
  );
} 