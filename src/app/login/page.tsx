"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
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
import { getCsrfToken, login } from "@/lib/auth";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";

const LoginButton = ({ isLoading, usernameError }: { isLoading: boolean, usernameError: string }) => (
  <Button 
    type="submit" 
    className="w-full bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400 hover:from-blue-700 hover:via-blue-700 hover:to-blue-500 transition-all text-white" 
    disabled={isLoading || !!usernameError}
  >
    {isLoading ? "Logging in..." : "Login"}
  </Button>
);

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loginType, setLoginType] = useState<"user" | "admin" | "superadmin">("user");
  const [error, setError] = useState<string | React.ReactNode>("");
  const [usernameError, setUsernameError] = useState<string>("");

  const validateUsername = (username: string): boolean => {
    // Username should be at least 3 characters long
    if (username.length < 3) {
      setUsernameError("Username must be at least 3 characters long");
      return false;
    }

    // Username should only contain letters, numbers, and underscores
    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if (!usernameRegex.test(username)) {
      setUsernameError("Username can only contain letters, numbers, and underscores");
      return false;
    }

    setUsernameError("");
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validate username before proceeding
    if (!validateUsername(username)) {
      return;
    }

    setIsLoading(true);
    
    try {
      // First get CSRF token
      await getCsrfToken();
      
      // Then attempt login using the existing login function
      // Pass the loginType as a parameter to the login function
      const data = await login(username, password, loginType);
      console.log("Login successful:", data);
      toast.success("Login successful!");
      
      // Check if the user is a superadmin, admin, or regular user based on the response
      const isSuperAdmin = data.user?.groups?.includes("superadmin");
      const isAdmin = data.user?.groups?.includes("admin");
      
      // Redirect to the appropriate dashboard based on user role
      if (isSuperAdmin) {
        router.push("/superadmin/dashboard");
      } else if (isAdmin) {
        router.push("/admin/dashboard");
      } else {
        router.push("/user/dashboard");
      }
      
    } catch (error) {
      console.error("Login error:", error);
      
      // Handle different error cases
      if (error instanceof Error) {
        if (error.message.includes("not found")) {
          // Username not found error - show sign up link
          setError(
            <div className="text-center">
              <p className="text-red-500">{error.message}</p>
              <Link 
                href={loginType === "admin" ? "/admin/signup" : "/user/signup"} 
                className="text-blue-500 hover:underline mt-2 inline-block"
              >
                Click here to sign up
              </Link>
            </div>
          );
        } else if (error.message.includes("Username or password is incorrect")) {
          // Generic authentication error - show error message and clear password field
          setError(
            <div className="text-center">
              <p className="text-red-500">{error.message}</p>
              <p className="text-sm text-gray-500 mt-1">
                Please verify your credentials and try again
              </p>
            </div>
          );
          setPassword(""); // Clear password field for security
        } else {
          // Generic error
          setError(error.message);
        }
      } else {
        setError("Login failed");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.trim();
    setUsername(value);
    // Validate on each change
    validateUsername(value);
    // Clear error when user starts typing
    if (error) {
      setError("");
    }
  };

  const renderUsernameField = () => (
    <div className="flex flex-col space-y-1.5">
      <Label htmlFor="username">Username</Label>
      <Input
        id="username"
        placeholder="Enter your username (min. 3 characters)"
        value={username}
        onChange={handleUsernameChange}
        required
        autoComplete="username"
        minLength={3}
        className={usernameError ? "border-red-500" : ""}
      />
      {usernameError && (
        <p className="text-sm text-red-500 mt-1">{usernameError}</p>
      )}
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center relative">
      {/* Background image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat" 
        style={{ 
          backgroundImage: 'url("/images/maxresdefault.jpg")',
        }}
      />
      
      {/* Content */}
      <Card className="w-[350px] p-0 z-10 shadow-xl">
        <div className="w-full text-center py-4 bg-gradient-to-r from-blue-700 via-blue-600 to-blue-500  transition-all text-white rounded-t-lg">
          <h1 className="text-xl font-bold text-white">Location Finder</h1>
          <p className="text-white text-sm opacity-90">Sign in to your account</p>
        </div>
        <Tabs defaultValue="user" className="w-full p-4" onValueChange={(value: string) => setLoginType(value as "user" | "admin" | "superadmin")}>
          <TabsList className="grid w-full grid-cols-3 p-1 bg-muted rounded-md">
            <TabsTrigger value="user" className="rounded-sm data-[state=active]:bg-green-500 data-[state=active]:text-white">User</TabsTrigger>
            <TabsTrigger value="admin" className="rounded-sm data-[state=active]:bg-blue-500 data-[state=active]:text-white">Admin</TabsTrigger>
            <TabsTrigger value="superadmin" className="rounded-sm data-[state=active]:bg-red-500 data-[state=active]:text-white">Super Admin</TabsTrigger>
          </TabsList>
          <TabsContent value="user">
            <form onSubmit={handleSubmit}>
              <CardContent className="px-6 pt-6">
                <div className="grid w-full items-center gap-4">
                  {renderUsernameField()}
                  <div className="flex flex-col space-y-1.5">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      className="mb-5"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-4 px-6 pb-6">
                {error && <p className="text-red-500 text-sm">{error}</p>}
                <LoginButton isLoading={isLoading} usernameError={usernameError} />
                <p className="text-sm text-center text-gray-500">
                  Don't have an account?{" "}
                  <Link href="/user/signup" className="text-blue-500 hover:underline">
                    Sign up
                  </Link>
                </p>
              </CardFooter>
            </form>
          </TabsContent>
          <TabsContent value="admin">
            <form onSubmit={handleSubmit}>
              <CardContent className="px-6 pt-6">
                <div className="grid w-full items-center gap-4">
                  {renderUsernameField()}
                  <div className="flex flex-col space-y-1.5">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      className="mb-5"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-4 px-6 pb-6">
                {error && <p className="text-red-500 text-sm">{error}</p>}
                <LoginButton isLoading={isLoading} usernameError={usernameError} />
                <p className="text-sm text-center text-gray-500">
                  Don't have an account?{" "}
                  <Link href="/admin/signup" className="text-blue-500 hover:underline">
                    Sign up
                  </Link>
                </p>
              </CardFooter>
            </form>
          </TabsContent>
          <TabsContent value="superadmin">
            <form onSubmit={handleSubmit}>
              <CardContent className="px-6 pt-6">
                <div className="grid w-full items-center gap-4">
                  {renderUsernameField()}
                  <div className="flex flex-col space-y-1.5">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      className="mb-5"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-4 px-6 pb-6">
                {error && <p className="text-red-500 text-sm">{error}</p>}
                <LoginButton isLoading={isLoading} usernameError={usernameError} />
              </CardFooter>
            </form>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
} 