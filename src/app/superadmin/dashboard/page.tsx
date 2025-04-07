"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

interface User {
  id: number;
  username: string;
  email: string;
  date_joined: string;
  last_login: string | null;
  is_active: boolean;
  groups: string[];
}

interface Admin {
  id: number;
  username: string;
  email: string;
  date_joined: string;
  last_login: string | null;
  is_active: boolean;
  groups: string[];
}

interface AdminRequest {
  id: number;
  username: string;
  email: string;
  created_at: string;
}

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

// Add toast styling options
const errorToastOptions = {
  className: 'toast-error',
  style: { 
    background: '#9e2a2b !important', 
    color: 'white !important',
    border: 'none !important',
    boxShadow: '0 4px 12px rgba(158, 42, 43, 0.4) !important'
  },
  duration: 5000
};

const successToastOptions = {
  className: 'toast-success',
  style: { 
    background: '#10B981 !important', 
    color: 'white !important',
    border: 'none !important',
    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4) !important'
  },
  duration: 3000
};

export default function SuperAdminDashboardPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [homeAddress, setHomeAddress] = useState("");
  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [imageHistory, setImageHistory] = useState<LocationData[]>([]);
  const [editingItem, setEditingItem] = useState<LocationData | null>(null);
  const [editAddress, setEditAddress] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [adminRequests, setAdminRequests] = useState<AdminRequest[]>([]);
  const [isProcessingRequest, setIsProcessingRequest] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [isDeletingUser, setIsDeletingUser] = useState(false);
  const [admins, setAdmins] = useState<Admin[]>([]);

  // Fetch admin requests
  const fetchAdminRequests = async () => {
    try {
      const csrfToken = getCookie('csrftoken');
      
      if (!csrfToken) {
        throw new Error('CSRF token not found. Please refresh the page.');
      }

      const response = await fetch('http://localhost:8000/api/auth/admin/requests/', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'X-CSRFToken': csrfToken,
        },
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          toast.error("Authentication failed. Please login again.", errorToastOptions);
          router.push('/login');
          return;
        }
        if (response.status === 403) {
          toast.error("Only superadmin can view admin requests", errorToastOptions);
          router.push('/login');
          return;
        }
        throw new Error('Failed to fetch admin requests');
      }
      
      const data = await response.json();
      setAdminRequests(data);
    } catch (error) {
      console.error('Error fetching admin requests:', error);
      toast.error('Failed to load admin requests', errorToastOptions);
    }
  };

  // Handle approve admin request
  const handleApproveRequest = async (requestId: number) => {
    setIsProcessingRequest(true);
    try {
      const csrfToken = getCookie('csrftoken');
      
      if (!csrfToken) {
        throw new Error('CSRF token not found. Please refresh the page.');
      }

      const response = await fetch(`http://localhost:8000/api/auth/admin/approve/${requestId}/`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to approve admin request');
      }

      const data = await response.json();
      toast.success(data.message || 'Admin request approved successfully', successToastOptions);
      
      // Refresh the admin requests list
      fetchAdminRequests();
    } catch (error) {
      console.error('Error approving admin request:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to approve admin request', errorToastOptions);
    } finally {
      setIsProcessingRequest(false);
    }
  };

  // Handle reject admin request
  const handleRejectRequest = async (requestId: number) => {
    if (!window.confirm('Are you sure you want to reject this admin request? This will delete the user account.')) {
      return;
    }

    setIsProcessingRequest(true);
    try {
      const csrfToken = getCookie('csrftoken');
      
      if (!csrfToken) {
        throw new Error('CSRF token not found. Please refresh the page.');
      }

      const response = await fetch(`http://localhost:8000/api/auth/admin/reject/${requestId}/`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to reject admin request');
      }

      const data = await response.json();
      toast.success(data.message || 'Admin request rejected successfully', successToastOptions);
      
      // Refresh the admin requests list
      fetchAdminRequests();
    } catch (error) {
      console.error('Error rejecting admin request:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to reject admin request', errorToastOptions);
    } finally {
      setIsProcessingRequest(false);
    }
  };

  // Load admin requests when component mounts and authentication is confirmed
  useEffect(() => {
    if (isAuthenticated) {
      fetchAdminRequests();
    }
  }, [isAuthenticated]);

  // Fetch image history
  const fetchImageHistory = async () => {
    try {
      const csrfToken = getCookie('csrftoken');
      
      if (!csrfToken) {
        throw new Error('CSRF token not found. Please refresh the page.');
      }

      const response = await fetch('/api/images', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'X-CSRFToken': csrfToken,
        },
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          toast.error("Authentication failed. Please login again.", errorToastOptions);
          router.push('/login');
          return;
        }
        throw new Error('Failed to fetch image history');
      }
      
      const data = await response.json();
      console.log("Fetched image history:", data);
      setImageHistory(data);
    } catch (error) {
      console.error('Error fetching image history:', error);
      toast.error('Failed to load image history', errorToastOptions);
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
    const savedLocationData = localStorage.getItem('superadminLocationData');
    if (savedLocationData) {
      try {
        setLocationData(JSON.parse(savedLocationData));
      } catch (error) {
        console.error('Error parsing saved location data:', error);
        localStorage.removeItem('superadminLocationData');
      }
    }
  }, []);

  // Save location data to localStorage whenever it changes
  useEffect(() => {
    if (locationData) {
      localStorage.setItem('superadminLocationData', JSON.stringify(locationData));
    }
  }, [locationData]);

  // Check authentication status on component mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/check', {
          credentials: 'include',
        });
        
        if (!response.ok) {
          router.push('/login');
          return;
        }
        
        const data = await response.json();
        setIsAuthenticated(true);
        
        // Get user information from localStorage
        const userStr = localStorage.getItem("user");
        if (userStr) {
          const user = JSON.parse(userStr);
          setUsername(user.username);
          
          // Verify that the user is a superadmin
          const isSuperAdmin = user.groups && user.groups.includes("superadmin");
          if (!isSuperAdmin) {
              router.push('/user/dashboard');
            return;
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
        localStorage.removeItem("user");
        localStorage.removeItem("superadminLocationData");
        setLocationData(null);
        
        toast.success("Logged out successfully", successToastOptions);
        router.push('/login');
      } else {
        const data = await response.json();
        toast.error(data.message || "Failed to logout", errorToastOptions);
      }
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Error during logout", errorToastOptions);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const validTypes = ['image/png', 'image/jpeg', 'image/bmp', 'image/tiff'];
      
      if (!validTypes.includes(file.type)) {
        toast.error("Please upload a valid image file (PNG, JPEG, BMP, TIFF)", errorToastOptions);
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
      toast.error("Please select an image to upload", errorToastOptions);
      return;
    }
    
    setIsUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('image', selectedImage);
      if (homeAddress.trim()) {
        formData.append('home_address', homeAddress.trim());
      }
      
      const csrfToken = getCookie('csrftoken');
      
      if (!csrfToken) {
        throw new Error('CSRF token not found. Please refresh the page.');
      }

      let response;
      try {
        response = await fetch('/api/location/upload/', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'X-CSRFToken': csrfToken,
          },
          body: formData,
        });
      } catch (error) {
        console.error("Network error during fetch:", error);
        toast.error("Network error. Please check your connection and try again.", errorToastOptions);
        setIsUploading(false);
        return;
      }
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        if (response.status === 401) {
          toast.error("Authentication failed. Please login again.", errorToastOptions);
          router.push('/login');
          return;
        }
        
        if (response.status === 404) {
          toast.error("API endpoint not found. Please check the server configuration.", errorToastOptions);
          return;
        }
        
        throw new Error(
          errorData?.detail || 
          `Upload failed with status ${response.status}`
        );
      }
      
      const data = await response.json();
      setLocationData(data);
      toast.success("Location found successfully!", successToastOptions);
      
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
      toast.error(error instanceof Error ? error.message : "Failed to process image", errorToastOptions);
    } finally {
      setIsUploading(false);
    }
  };

  const handleClearResults = () => {
    setLocationData(null);
    localStorage.removeItem('superadminLocationData');
    toast.success("Results cleared successfully", successToastOptions);
  };

  const handleEdit = async (item: LocationData) => {
    setIsEditing(true);
    try {
      const formData = new FormData();
      formData.append('home_address', editAddress.trim());

      const csrfToken = getCookie('csrftoken');
      if (!csrfToken) {
        throw new Error('CSRF token not found. Please refresh the page.');
      }

      const response = await fetch(`/api/images/${item.id}/edit/`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'X-CSRFToken': csrfToken,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          toast.error("Authentication failed. Please login again.", errorToastOptions);
          router.push('/login');
          return;
        }

        if (response.status === 403) {
          toast.error("You don't have permission to edit this location.", errorToastOptions);
          return;
        }

        if (response.status === 404) {
          toast.error("Location not found. It may have been deleted.", errorToastOptions);
          setImageHistory(prevHistory => 
            prevHistory.filter(historyItem => historyItem.id !== item.id)
          );
          return;
        }

        throw new Error(data.error || 'Failed to edit location');
      }

      setImageHistory(prevHistory =>
        prevHistory.map(historyItem =>
          historyItem.id === item.id ? data : historyItem
        )
      );

      toast.success('Location updated successfully', successToastOptions);
      setEditingItem(null);
      setEditAddress("");
    } catch (error) {
      console.error('Edit error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update location', errorToastOptions);
    } finally {
      setIsEditing(false);
    }
  };

  const handleDelete = async (item: LocationData) => {
    if (!window.confirm('Are you sure you want to delete this location?')) {
      return;
    }

    try {
      const csrfToken = getCookie('csrftoken');
      if (!csrfToken) {
        throw new Error('CSRF token not found. Please refresh the page.');
      }

      const response = await fetch(`/api/images/${item.id}/delete/`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'X-CSRFToken': csrfToken,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          toast.error("Authentication failed. Please login again.", errorToastOptions);
          router.push('/login');
          return;
        }

        if (response.status === 403) {
          toast.error("You don't have permission to delete this location.", errorToastOptions);
          return;
        }

        if (response.status === 404) {
          toast.error("Location not found. It may have been already deleted.", errorToastOptions);
          setImageHistory(prevHistory => 
            prevHistory.filter(historyItem => historyItem.id !== item.id)
          );
          return;
        }

        throw new Error(data.error || 'Failed to delete location');
      }

      setImageHistory(prevHistory => 
        prevHistory.filter(historyItem => historyItem.id !== item.id)
      );
      toast.success('Location deleted successfully', successToastOptions);
    } catch (error) {
      console.error('Delete error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete location', errorToastOptions);
    }
  };

  // Fetch all users
  const fetchUsers = async () => {
    try {
      const response = await fetch("http://localhost:8000/api/auth/users/", {
        credentials: "include",
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          router.push("/login");
          return;
        }
        throw new Error("Failed to fetch users");
      }
      
      const data = await response.json();
      // Filter out admin and superadmin users to only show regular users
      const regularUsers = data.filter((user: User) => 
        !user.groups.some(group => group === "admin" || group === "superadmin")
      );
      setUsers(regularUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to load users", errorToastOptions);
    }
  };

  // Fetch all admins
  const fetchAdmins = async () => {
    try {
      const response = await fetch("http://localhost:8000/api/auth/admins/", {
        credentials: "include",
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          router.push("/login");
          return;
        }
        throw new Error("Failed to fetch admins");
      }
      
      const data = await response.json();
      setAdmins(data);
    } catch (error) {
      console.error("Error fetching admins:", error);
      toast.error("Failed to load admins", errorToastOptions);
    }
  };

  // Handle delete user
  const handleDeleteUser = async (userId: number, username: string) => {
    if (!window.confirm(`Are you sure you want to delete user "${username}"? This action cannot be undone.`)) {
      return;
    }

    setIsDeletingUser(true);
    try {
      const csrfToken = getCookie('csrftoken');
      
      if (!csrfToken) {
        throw new Error('CSRF token not found. Please refresh the page.');
      }

      const response = await fetch(`http://localhost:8000/api/auth/user/${userId}/delete/`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 403) {
          throw new Error("You don't have permission to delete users");
        }
        throw new Error(errorData.error || 'Failed to delete user');
      }

      toast.success(`User "${username}" deleted successfully`, successToastOptions);
      // Refresh the users list
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete user', errorToastOptions);
    } finally {
      setIsDeletingUser(false);
    }
  };

  const handleDeleteAdmin = async (adminId: number, username: string) => {
    if (!window.confirm(`Are you sure you want to delete admin "${username}"? This action cannot be undone.`)) {
      return;
    }

    setIsDeletingUser(true);
    try {
      const csrfToken = getCookie('csrftoken');
      
      if (!csrfToken) {
        throw new Error('CSRF token not found. Please refresh the page.');
      }

      const response = await fetch(`http://localhost:8000/api/auth/admin/${adminId}/delete/`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 403) {
          throw new Error("You don't have permission to delete admins");
        }
        throw new Error(errorData.error || 'Failed to delete admin');
      }

      toast.success(`Admin "${username}" deleted successfully`, successToastOptions);
      // Refresh the admins list
      fetchAdmins();
    } catch (error) {
      console.error('Error deleting admin:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete admin', errorToastOptions);
    } finally {
      setIsDeletingUser(false);
    }
  };

  // Load users when component mounts and authentication is confirmed
  useEffect(() => {
    if (isAuthenticated) {
      fetchUsers();
      fetchAdmins();
    }
  }, [isAuthenticated]);

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
              Super Admin Dashboard
            </h1>
            <Button
              onClick={handleLogout}
              variant="destructive"
              className="bg-red-600 hover:bg-red-700"
            >
              Logout
            </Button>
          </div>
          
          {/* Welcome message for superadmin */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Welcome, Super Admin {username}!</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Manage users, admins, and view system information from this dashboard.
              </p>
            </CardContent>
          </Card>
          
          {/* Tabs for different sections */}
          <div className="mb-8">
            <Tabs defaultValue="users" className="w-full">
              <TabsList className="grid grid-cols-3 mb-4">
                <TabsTrigger value="users">Users</TabsTrigger>
                <TabsTrigger value="admins">Admins</TabsTrigger>
                <TabsTrigger value="requests">Admin Requests</TabsTrigger>
              </TabsList>
              
              <TabsContent value="users">
                <Card>
                  <CardHeader>
                    <CardTitle>Regular Users Management</CardTitle>
                    <CardDescription>
                      View and manage regular user accounts
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {users.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-gray-500">No regular users found</p>
                      </div>
                    ) : (
                      <div className="grid gap-4">
                        {users.map((user) => (
                          <Card key={user.id} className="overflow-hidden">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <h3 className="font-medium">ID: {user.id} - {user.username}</h3>
                                    <Badge variant={user.is_active ? "success" : "secondary"}>
                                      {user.is_active ? "Active" : "Inactive"}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-gray-500">Email: {user.email || 'No email provided'}</p>
                                  <p className="text-xs text-gray-400">Joined: {new Date(user.date_joined).toLocaleString()}</p>
                                  <div className="flex gap-1 mt-1">
                                    {user.groups.map((group) => (
                                      <Badge key={group} variant="outline" className="text-xs">
                                        {group}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                                <div>
                                  <Button
                                    onClick={() => handleDeleteUser(user.id, user.username)}
                                    disabled={isDeletingUser}
                                    variant="destructive"
                                    size="sm"
                                  >
                                    Delete User
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="admins">
                <Card>
                  <CardHeader>
                    <CardTitle>Admin Management</CardTitle>
                    <CardDescription>
                      View and manage admin accounts
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {admins.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-gray-500">No admins found</p>
                      </div>
                    ) : (
                      <div className="grid gap-4">
                        {admins.map((admin) => (
                          <Card key={admin.id} className="overflow-hidden">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <h3 className="font-medium">ID: {admin.id} - {admin.username}</h3>
                                    <Badge variant={admin.is_active ? "success" : "secondary"}>
                                      {admin.is_active ? "Active" : "Inactive"}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-gray-500">Email: {admin.email || 'No email provided'}</p>
                                  <p className="text-xs text-gray-400">Joined: {new Date(admin.date_joined).toLocaleString()}</p>
                                  <div className="flex gap-1 mt-1">
                                    {admin.groups.map((group) => (
                                      <Badge key={group} variant="outline" className="text-xs">
                                        {group}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                                <div>
                                  <Button
                                    onClick={() => handleDeleteAdmin(admin.id, admin.username)}
                                    disabled={isDeletingUser}
                                    variant="destructive"
                                    size="sm"
                                  >
                                    Delete Admin
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="requests">
                <Card>
                  <CardHeader>
                    <CardTitle>Pending Admin Requests</CardTitle>
                    <CardDescription>
                      Review and manage admin approval requests
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {adminRequests.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-gray-500">No pending admin requests</p>
                      </div>
                    ) : (
                      <div className="grid gap-4">
                        {adminRequests.map((request) => (
                          <Card key={request.id} className="overflow-hidden">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                  <h3 className="font-medium">{request.username}</h3>
                                  <p className="text-sm text-gray-500">
                                    {request.email || 'No email provided'}
                                  </p>
                                  <p className="text-xs text-gray-400">
                                    Requested: {new Date(request.created_at).toLocaleString()}
                                  </p>
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    onClick={() => handleApproveRequest(request.id)}
                                    disabled={isProcessingRequest}
                                    className="bg-green-600 hover:bg-green-700"
                                  >
                                    Approve
                                  </Button>
                                  <Button
                                    onClick={() => handleRejectRequest(request.id)}
                                    disabled={isProcessingRequest}
                                    variant="destructive"
                                  >
                                    Reject
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Find Location from Image</CardTitle>
                <CardDescription>
                  Upload an image to find its location
                </CardDescription>
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
            <Card>
              <CardHeader>
                <CardTitle>All Users Image History</CardTitle>
                <CardDescription>
                  View and manage location data from all users
                </CardDescription>
              </CardHeader>
              <CardContent>
                {imageHistory.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No image history found</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {imageHistory.map((item) => (
                      <Card key={item.id} className="overflow-hidden">
                        <CardHeader className="pb-2">
                          <div className="flex justify-between items-center">
                            <CardTitle className="text-lg">Location #{item.id}</CardTitle>
                            <div className="flex gap-2">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setEditingItem(item);
                                      setEditAddress(item.Address);
                                    }}
                                  >
                                    Edit
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Edit Location</DialogTitle>
                                  </DialogHeader>
                                  <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                      <Label>Current Address</Label>
                                      <p className="text-sm text-gray-500">{item.Address}</p>
                                    </div>
                                    <div className="space-y-2">
                                      <Label htmlFor="edit-address">New Address</Label>
                                      <Input
                                        id="edit-address"
                                        value={editAddress}
                                        onChange={(e) => setEditAddress(e.target.value)}
                                        placeholder="Enter new address"
                                      />
                                    </div>
                                    <Button
                                      className="w-full"
                                      onClick={() => handleEdit(item)}
                                      disabled={isEditing || !editAddress.trim()}
                                    >
                                      {isEditing ? "Updating..." : "Update Address"}
                                    </Button>
                                  </div>
                                </DialogContent>
                              </Dialog>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDelete(item)}
                              >
                                Delete
                              </Button>
                            </div>
                          </div>
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
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
} 