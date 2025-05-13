import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import autoLogout from '@/utils/AutoLogout';

// Custom hook to handle auto logout
export const useAutoLogout = () => {
  const router = useRouter();
  const [secondsToLogout, setSecondsToLogout] = useState(null);

  // Function to handle logout process
  const handleLogout = useCallback(async () => {
    console.log('[useAutoLogout] Executing logout function');
    
    // Note: Token cleanup is now handled in the AutoLogout class directly
    // We're just handling the router navigation and any React-specific cleanup here
    try {
      // Additional React-specific cleanup if needed
      console.log('[useAutoLogout] Handling React-specific cleanup');
    } catch (error) {
      console.error('[useAutoLogout] Error during auto-logout React cleanup:', error);
    } finally {
      // Redirect to login page
      console.log('[useAutoLogout] Redirecting to login page');
      router.push('/login');
    }
  }, [router]);

  // Function to handle warning before logout
  const handleWarning = useCallback((secondsLeft) => {
    console.log(`[useAutoLogout] Warning callback triggered: ${secondsLeft}s remaining`);
    setSecondsToLogout(secondsLeft);
  }, []);

  // Function when timer is reset (optional, for analytics or extending session with backend)
  const handleTimerReset = useCallback(async () => {
    console.log('[useAutoLogout] Timer reset, pinging backend to extend session');
    // Optionally ping backend to extend session
    try {
      const response = await fetch('/api/auth/check', {
        method: 'GET',
        credentials: 'include',
      });
      
      if (response.ok) {
        console.log('[useAutoLogout] Session extension successful');
      } else {
        console.log('[useAutoLogout] Session extension failed with status:', response.status);
      }
    } catch (error) {
      // Silent fail - we don't want to disrupt the UX if this fails
      console.error('[useAutoLogout] Failed to extend session:', error);
    }
  }, []);

  useEffect(() => {
    // Check if we're in the browser environment
    if (typeof window === 'undefined') return;

    // Check if user is authenticated before initializing
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      console.log('[useAutoLogout] No user found in localStorage, not initializing auto-logout');
      return;
    }
    
    console.log('[useAutoLogout] User found in localStorage, initializing auto-logout');
    // Initialize auto logout with our callbacks
    autoLogout.init(handleLogout, handleWarning, handleTimerReset);

    // Clean up when the component unmounts
    return () => {
      console.log('[useAutoLogout] Component unmounting, destroying auto-logout');
      autoLogout.destroy();
    };
  }, [handleLogout, handleWarning, handleTimerReset]);

  return {
    secondsToLogout,
    resetInactivityTimer: () => autoLogout.resetInactivityTimer(),
    stayLoggedIn: () => autoLogout.handleStayLoggedIn(),
  };
}; 