"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface LocationData {
  id: number;
  Address: string;
  Latitude: number;
  Longitude: number;
  Landmark: string;
  "Confidence Score": string;
  Coordinates: string;
  "Distance (Haversine Formula)": string;
  "Image_URL": string;
}

// Add this function to get the complete image URL
const getCompleteImageUrl = (imageUrl: string) => {
  // Check if the URL is already absolute
  if (imageUrl.startsWith('http')) {
    return imageUrl;
  }
  // Add the Django backend URL
  return `http://127.0.0.1:8000${imageUrl}`;
};

export default function UserDashboardPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [homeAddress, setHomeAddress] = useState("");
  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [imageHistory, setImageHistory] = useState<LocationData[]>([]);

  // Fetch image history
  const fetchImageHistory = async () => {
    try {
      const csrfToken = getCookie('csrftoken');
      
      if (!csrfToken) {
        throw new Error('CSRF token not found. Please refresh the page.');
      }

      const response = await fetch('/api/images', {
        method: 'GET',
        credentials: 'include', // This ensures HttpOnly cookies are sent
        headers: {
          'X-CSRFToken': csrfToken,
        },
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          toast.error("Authentication failed. Please login again.");
          router.push('/login');
          return;
        }
        throw new Error('Failed to fetch image history');
      }
      
      const data = await response.json();
      console.log("Fetched image history:", data); // Debug log
      setImageHistory(data);
    } catch (error) {
      console.error('Error fetching image history:', error);
      toast.error('Failed to load image history');
    }
  };

  // Load image history when component mounts
  useEffect(() => {
    if (isAuthenticated) {
      fetchImageHistory();
    }
  }, [isAuthenticated]);

  // Refresh image history after successful upload
  useEffect(() => {
    if (locationData) {
      fetchImageHistory();
    }
  }, [locationData]);

  // Load location data from localStorage on component mount
  useEffect(() => {
    const savedLocationData = localStorage.getItem('locationData');
    if (savedLocationData) {
      try {
        setLocationData(JSON.parse(savedLocationData));
      } catch (error) {
        console.error('Error parsing saved location data:', error);
        localStorage.removeItem('locationData'); // Clear invalid data
      }
    }
  }, []);

  // Save location data to localStorage whenever it changes
  useEffect(() => {
    if (locationData) {
      localStorage.setItem('locationData', JSON.stringify(locationData));
    }
  }, [locationData]);

  // Check authentication status on component mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Log request cookies first
        console.log("=== Request Cookies ===");
        const requestCookies = document.cookie.split(';').map(c => c.trim());
        console.log("_next_hmr_refresh_hash:", requestCookies.find(cookie => cookie.startsWith('_next_hmr_refresh_hash='))?.split('=')[1] || 'Not found');
        console.log("csrftoken:", requestCookies.find(cookie => cookie.startsWith('csrftoken='))?.split('=')[1] || 'Not found');

        const response = await fetch('/api/auth/check', {
          credentials: 'include',
        });
        
        if (!response.ok) {
          router.push('/login');
          return;
        }
        
        const data = await response.json();
        setIsAuthenticated(true);

        // Log response cookies
        console.log("\n=== Response Cookies ===");
        const responseCookies = document.cookie.split(';').map(c => c.trim());
        console.log("access_token:", responseCookies.find(cookie => cookie.startsWith('access_token='))?.split('=')[1] || 'Not found');
        console.log("refresh_token:", responseCookies.find(cookie => cookie.startsWith('refresh_token='))?.split('=')[1] || 'Not found');
        
        // Log all cookies for debugging
        console.log("\n=== All Current Cookies ===");
        console.log(document.cookie.split(';').map(c => c.trim()));
        
        // Get user information from localStorage
        const userStr = localStorage.getItem("user");
        if (userStr) {
          const user = JSON.parse(userStr);
          setUsername(user.username);
          
          // Verify that the user is not an admin
          const isAdmin = user.groups && user.groups.includes("admin");
          if (isAdmin) {
            router.push('/admin/dashboard');
          }
        }
      } catch (error) {
        console.error("Auth check error:", error);
        router.push('/login');
      }
    };
    
    checkAuth();
  }, [router]);

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      
      if (response.ok) {
        // Clear user information and location data from localStorage
        localStorage.removeItem("user");
        localStorage.removeItem("locationData");
        setLocationData(null);
        
        toast.success("Logged out successfully");
        router.push('/login');
      } else {
        const data = await response.json();
        toast.error(data.message || "Failed to logout");
      }
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Error during logout");
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const validTypes = ['image/png', 'image/jpeg', 'image/bmp', 'image/tiff'];
      
      if (!validTypes.includes(file.type)) {
        toast.error("Please upload a valid image file (PNG, JPEG, BMP, TIFF)");
        return;
      }
      
      setSelectedImage(file);
    }
  };

  const getCookie = (name: string): string | undefined => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift();
    return undefined;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedImage) {
      toast.error("Please select an image to upload");
      return;
    }
    
    setIsUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('image', selectedImage);
      if (homeAddress.trim()) {
        formData.append('home_address', homeAddress.trim());
      }
      
      // Debug log the FormData contents
      console.log("Sending FormData:");
      for (const [key, value] of formData.entries()) {
        console.log(`${key}:`, value);
      }
      
      const csrfToken = getCookie('csrftoken');
      
      if (!csrfToken) {
        throw new Error('CSRF token not found. Please refresh the page.');
      }

      // Log request information
      console.log("=== Request Information ===");
      console.log("CSRF Token:", csrfToken);
      console.log("Request URL:", '/api/location/upload/');

      let response;
      try {
        response = await fetch('/api/location/upload/', {
          method: 'POST',
          credentials: 'include', // This ensures HttpOnly cookies are sent
          headers: {
            'X-CSRFToken': csrfToken,
          },
          body: formData,
        });
      } catch (error) {
        console.error("Network error during fetch:", error);
        toast.error("Network error. Please check your connection and try again.");
        setIsUploading(false);
        return;
      }
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        if (response.status === 401) {
          toast.error("Authentication failed. Please login again.");
          router.push('/login');
          return;
        }
        
        // Enhanced error handling for 404
        if (response.status === 404) {
          console.error("API endpoint not found. Please check the URL:", '/api/location/upload/');
          toast.error("API endpoint not found. Please check the server configuration.");
          return;
        }
        
        // Log detailed error information
        console.error("Request failed with status:", response.status);
        console.error("Response headers:", Object.fromEntries([...response.headers.entries()]));
        if (errorData) {
          console.error("Error data:", errorData);
        }
        
        throw new Error(
          errorData?.detail || 
          `Upload failed with status ${response.status}`
        );
      }
      
      const data = await response.json();
      setLocationData(data);
      toast.success("Location found successfully!");
      
      // Clear the form
      setSelectedImage(null);
      setHomeAddress("");
      
      // Reset the file input
      const fileInput = document.getElementById('image-upload') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to process image");
    } finally {
      setIsUploading(false);
    }
  };

  // Add a function to clear location data
  const handleClearResults = () => {
    setLocationData(null);
    localStorage.removeItem('locationData');
    toast.success("Results cleared successfully");
  };

  // Show loading state while checking authentication
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Loading...</h1>
          <p className="text-gray-600">Please wait while we verify your authentication.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900">
              User Dashboard
            </h1>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            >
              Logout
            </button>
          </div>
          <p className="text-sm my-4 text-gray-500"> {typeof window !== 'undefined' ? window.location.pathname : ''}</p>

          
          {/* Welcome message for user */}
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <p className="text-lg text-gray-700">
              Welcome, {username}!
            </p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Find Location from Image</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="image">Upload Image</Label>
                    <div className="flex items-center justify-center w-full">
                      <label
                        htmlFor="image-upload"
                        className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"
                      >
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <svg className="w-8 h-8 mb-4 text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/>
                          </svg>
                          <p className="mb-2 text-sm text-gray-500">
                            <span className="font-semibold">Click to upload</span> or drag and drop
                          </p>
                          <p className="text-xs text-gray-500">PNG, JPEG, BMP, TIFF</p>
                          {selectedImage && (
                            <p className="text-sm text-blue-500 mt-2">
                              Selected: {selectedImage.name}
                            </p>
                          )}
                        </div>
                        <input
                          id="image-upload"
                          type="file"
                          className="hidden"
                          onChange={handleImageChange}
                          accept=".png,.jpg,.jpeg,.bmp,.tiff"
                        />
                      </label>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="home_address">Home Address (Optional)</Label>
                    <Input
                      id="home_address"
                      placeholder="Enter your home address"
                      value={homeAddress}
                      onChange={(e) => setHomeAddress(e.target.value)}
                    />
                  </div>
                  
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={!selectedImage || isUploading}
                  >
                    {isUploading ? "Processing..." : "Find Location"}
                  </Button>
                </form>
              </CardContent>
            </Card>
            
            {locationData && (
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>Location Results</CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleClearResults}
                      className="text-red-600 hover:text-red-700"
                    >
                      Clear Results
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="border-2 border-dotted border-gray-300 rounded-lg">
                  
                    {locationData["Image_URL"] && (
                      <div className="col-span-2">
   
                        <div className="flex justify-center">
                          <img 
                            src={getCompleteImageUrl(locationData["Image_URL"])} 
                            alt="Location Image" 
                            className="max-w-[1000px] max-h-[300px] w-full object-contain rounded-lg shadow-sm" 
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Address</Label>
                      <p className="text-gray-700">{locationData.Address}</p>
                    </div>
                    <div>
                      <Label>Landmark</Label>
                      <p className="text-gray-700">{locationData.Landmark}</p>
                    </div>
                    <div>
                      <Label>Coordinates</Label>
                      <p className="text-gray-700">{locationData.Coordinates}</p>
                    </div>
                    <div>
                      <Label>Confidence Score</Label>
                      <p className="text-gray-700">{locationData["Confidence Score"]}</p>
                    </div>
                    {locationData["Distance (Haversine Formula)"] && (
                      <div className="col-span-2">
                        <Label>Distance from Home</Label>
                        <p className="text-gray-700">{locationData["Distance (Haversine Formula)"]}</p>
                      </div>
                    )}
                   
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Image History Section */}
          <div className="mt-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Image History</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {imageHistory.map((item) => (
                <Card key={item.id}>
                  <CardHeader>
                    <CardTitle className="text-lg">Location #{item.id}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="border-2 border-dotted border-gray-300 rounded-lg p-2">
                      <div className="flex justify-center">
                        <img 
                          src={getCompleteImageUrl(item.Image_URL)} 
                          alt={`Location ${item.id}`} 
                          className="max-w-[300px] max-h-[200px] w-full object-contain rounded-lg shadow-sm" 
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <Label>Address</Label>
                        <p className="text-gray-700 text-sm">{item.Address}</p>
                      </div>
                      <div>
                        <Label>Landmark</Label>
                        <p className="text-gray-700 text-sm">{item.Landmark}</p>
                      </div>
                      <div>
                        <Label>Coordinates</Label>
                        <p className="text-gray-700 text-sm">{item.Coordinates}</p>
                      </div>
                      <div>
                        <Label>Confidence Score</Label>
                        <p className="text-gray-700 text-sm">{item["Confidence Score"]}</p>
                      </div>
                      {item["Distance (Haversine Formula)"] && (
                        <div>
                          <Label>Distance from Home</Label>
                          <p className="text-gray-700 text-sm">{item["Distance (Haversine Formula)"]}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 