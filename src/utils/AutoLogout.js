import { toast } from 'sonner';
import { BACKEND_URL } from '@/constants';

class AutoLogout {
  constructor() {
    // Updated timeouts
    this.inactivityTimeoutMs = 15 * 60 * 1000; // 15 minutes
    this.warningTimeoutMs = 60 * 1000; // 1 minute warning
    this.inactivityTimer = null;
    this.warningTimer = null;
    this.countdownInterval = null;
    this.warningDialogActive = false;
    this.timeLeftSec = 60; // Updated to match warning timeout
    this.logoutCallback = null;
    this.logoutWarningCallback = null;
    this.resetTimerCallback = null;
    this.toastId = null;
  }

  // Helper method to get CSRF token from cookies
  getCSRFToken() {
    const tokenMatch = document.cookie.match('(^|;)\\s*csrftoken\\s*=\\s*([^;]+)');
    return tokenMatch ? tokenMatch.pop() : '';
  }

  init(logoutCallback, logoutWarningCallback, resetTimerCallback) {
    this.logoutCallback = logoutCallback;
    this.logoutWarningCallback = logoutWarningCallback;
    this.resetTimerCallback = resetTimerCallback;
    this.startActivityMonitoring();
    this.resetInactivityTimer();
    console.log('[AutoLogout] Initialized with 15-minute timeout');
  }

  startActivityMonitoring() {
    // Events that indicate user activity
    const events = [
      'mousedown', 'mousemove', 'keypress', 
      'scroll', 'touchstart', 'click', 'keydown'
    ];

    // Add event listeners
    events.forEach(event => {
      document.addEventListener(event, this.resetOnActivity.bind(this));
    });

    // Also track tab/window visibility changes
    document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
    console.log('[AutoLogout] Activity monitoring started');
  }

  resetOnActivity() {
    // Only reset timer if warning dialog is not active
    if (!this.warningDialogActive) {
      console.log('[AutoLogout] User activity detected, resetting timer');
      this.resetInactivityTimer();
      if (this.resetTimerCallback) {
        this.resetTimerCallback();
      }
    }
  }

  handleVisibilityChange() {
    // When user returns to the tab
    if (!document.hidden && !this.warningDialogActive) {
      console.log('[AutoLogout] Tab visibility changed, resetting timer');
      this.resetInactivityTimer();
    }
  }

  resetInactivityTimer() {
    // Clear existing timers
    this.clearTimers();

    // Set new inactivity timer
    this.inactivityTimer = setTimeout(() => {
      this.showWarning();
    }, this.inactivityTimeoutMs - this.warningTimeoutMs);
    
    console.log(`[AutoLogout] Inactivity timer reset. Warning in ${(this.inactivityTimeoutMs - this.warningTimeoutMs)/1000}s`);
  }

  showWarning() {
    this.warningDialogActive = true;
    this.timeLeftSec = this.warningTimeoutMs / 1000;
    console.log(`[AutoLogout] Warning displayed. Logout in ${this.timeLeftSec}s if no action taken`);

    if (this.logoutWarningCallback) {
      this.logoutWarningCallback(this.timeLeftSec);
    }

    // Show toast warning
    this.toastId = toast.warning(
      <div className="auto-logout-warning">
        <p>You will be logged out in {this.timeLeftSec} seconds due to inactivity.</p>
        <button 
          onClick={this.handleStayLoggedIn.bind(this)}
          className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          Stay Logged In
        </button>
      </div>,
      {
        duration: this.warningTimeoutMs, // Keep it displayed for the full warning duration
        onDismiss: () => {
          // Toast was dismissed manually, but still proceed with logout if timer completes
        }
      }
    );

    // Start countdown
    this.countdownInterval = setInterval(() => {
      this.timeLeftSec -= 1;
      
      if (this.timeLeftSec <= 0) {
        console.log('[AutoLogout] Countdown complete, logging out');
        this.logout();
        return;
      }

      if (this.logoutWarningCallback) {
        this.logoutWarningCallback(this.timeLeftSec);
      }
    }, 1000);

    // Set final logout timer
    this.warningTimer = setTimeout(() => {
      this.logout();
    }, this.warningTimeoutMs);
  }

  handleStayLoggedIn() {
    console.log('[AutoLogout] "Stay Logged In" clicked, session extended');
    
    // Make sure to set warningDialogActive to false first
    this.warningDialogActive = false;
    
    // Clear all timers
    this.clearTimers();
    
    // Dismiss any active toast notifications
    if (this.toastId) {
      toast.dismiss(this.toastId);
      this.toastId = null;
    }
    
    // Reset timeLeftSec
    this.timeLeftSec = this.warningTimeoutMs / 1000;
    
    // Restart the inactivity timer
    this.resetInactivityTimer();
    
    // Let the user know their session was extended
    toast.success("Session extended!", { duration: 3000 });
  }

  async logout() {
    console.log('[AutoLogout] Executing logout process');
    this.clearTimers();
    toast.dismiss(this.toastId);

    try {
      // Call logout API first to clear server-side HTTP-only cookies
      console.log('[AutoLogout] Calling logout API to clear HTTP-only cookies');
      const response = await fetch('/api/auth/logout/', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'X-CSRFToken': this.getCSRFToken()
        }
      });
      
      console.log('[AutoLogout] Logout API response:', response.status);
      
      // For HTTP-only cookies, also try a separate /api/auth/clear-cookies endpoint if available
      try {
        console.log('[AutoLogout] Attempting to call clear-cookies endpoint');
        await fetch('/api/auth/clear-cookies', {
          method: 'POST',
          credentials: 'include'
        });
      } catch (e) {
        console.log('[AutoLogout] Clear-cookies endpoint not available:', e);
      }
      
      // More comprehensive token cleanup with multiple approaches to ensure cookies are deleted
      // Try various paths and domains to cover all bases
      const cookiesToClear = ['csrftoken', 'access_token', 'refresh_token'];
      const paths = ['/', '/api', '/api/auth', ''];
      const domains = [window.location.hostname, '.' + window.location.hostname, ''];
      
      console.log('[AutoLogout] Removing cookies with multiple path/domain combinations');
      
      cookiesToClear.forEach(cookieName => {
        // Try all combinations of paths and domains
        paths.forEach(path => {
          domains.forEach(domain => {
            const cookieString = `${cookieName}=; Path=${path}; Expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Lax;`;
            const domainCookieString = domain 
              ? `${cookieName}=; Path=${path}; Domain=${domain}; Expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Lax;` 
              : cookieString;
              
            document.cookie = cookieString;
            if (domain) document.cookie = domainCookieString;
            
            // Also try secure version
            document.cookie = cookieString + ' Secure;';
            if (domain) document.cookie = domainCookieString + ' Secure;';
          });
        });
        
        console.log(`[AutoLogout] Attempted to remove ${cookieName} cookie with multiple approaches`);
      });
      
      // Clear any localStorage tokens
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('locationData');
      
      // Also clear sessionStorage
      sessionStorage.clear();
      
      // Debug: Check if cookies were actually cleared
      console.log('[AutoLogout] Remaining cookies after cleanup:', document.cookie);
      
      console.log('[AutoLogout] Auto logout complete - tokens removed');
    } catch (error) {
      console.error('[AutoLogout] Logout failed:', error);
    } finally {
      // Call the logout callback if provided (for additional cleanup)
      if (this.logoutCallback) {
        await this.logoutCallback();
      } else {
        // Always redirect to login page
        window.location.href = '/login';
      }
    }
  }

  clearTimers() {
    if (this.inactivityTimer) clearTimeout(this.inactivityTimer);
    if (this.warningTimer) clearTimeout(this.warningTimer);
    if (this.countdownInterval) clearInterval(this.countdownInterval);
  }

  destroy() {
    // Remove event listeners
    const events = [
      'mousedown', 'mousemove', 'keypress', 
      'scroll', 'touchstart', 'click', 'keydown'
    ];
    
    events.forEach(event => {
      document.removeEventListener(event, this.resetOnActivity.bind(this));
    });
    
    document.removeEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
    
    this.clearTimers();
    toast.dismiss(this.toastId);
    console.log('[AutoLogout] Destroyed and cleaned up');
  }
}

// Singleton instance
const autoLogout = new AutoLogout();
export default autoLogout; 