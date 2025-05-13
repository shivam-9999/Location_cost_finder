/**
 * Auto-logout functionality
 * Logs out the user after 30 minutes of inactivity
 */

class AutoLogout {
  constructor(options = {}) {
    this.options = {
      inactivityTime: 60 * 1000, // 30 minutes in milliseconds
      warningTime: 15* 1000,     // 1 minute warning before logout
      logoutUrl: '/api/auth/logout/',
      redirectUrl: '/login',
      warningMessage: 'You will be logged out due to inactivity in',
      ...options
    };
    
    this.timer = null;
    this.warningTimer = null;
    this.warningShown = false;
    this.warningElement = null;
    
    this.init();
  }
  
  init() {
    // Create and add warning element to the DOM
    this.createWarningElement();
    
    // Reset timer on user activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => {
      document.addEventListener(event, () => this.resetTimer());
    });
    
    // Start the initial timer
    this.resetTimer();
    
    // Add event listener for page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        // When page becomes visible, check if session is still valid
        this.checkSession();
      }
    });
  }
  
  resetTimer() {
    // Clear existing timers
    clearTimeout(this.timer);
    clearTimeout(this.warningTimer);
    
    // Hide warning if it's showing
    if (this.warningShown) {
      this.hideWarning();
    }
    
    // Set warning timer to show warning before logout
    this.warningTimer = setTimeout(() => {
      this.showWarning();
    }, this.options.inactivityTime - this.options.warningTime);
    
    // Set main timer for logout
    this.timer = setTimeout(() => {
      this.logout();
    }, this.options.inactivityTime);
  }
  
  createWarningElement() {
    this.warningElement = document.createElement('div');
    this.warningElement.className = 'auto-logout-warning';
    this.warningElement.style.display = 'none';
    this.warningElement.style.position = 'fixed';
    this.warningElement.style.top = '20px';
    this.warningElement.style.right = '20px';
    this.warningElement.style.padding = '15px 20px';
    this.warningElement.style.background = 'rgba(244, 67, 54, 0.9)';
    this.warningElement.style.color = 'white';
    this.warningElement.style.borderRadius = '4px';
    this.warningElement.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
    this.warningElement.style.zIndex = '9999';
    this.warningElement.style.transition = 'opacity 0.3s ease';
    
    const content = document.createElement('div');
    content.className = 'warning-content';
    
    const message = document.createElement('p');
    message.className = 'warning-message';
    message.style.margin = '0 0 10px 0';
    message.textContent = this.options.warningMessage;
    
    const timer = document.createElement('span');
    timer.className = 'warning-timer';
    timer.style.fontWeight = 'bold';
    
    const buttonContainer = document.createElement('div');
    buttonContainer.style.marginTop = '10px';
    
    const stayButton = document.createElement('button');
    stayButton.textContent = 'Stay Logged In';
    stayButton.style.background = 'white';
    stayButton.style.color = '#333';
    stayButton.style.border = 'none';
    stayButton.style.padding = '6px 12px';
    stayButton.style.borderRadius = '3px';
    stayButton.style.cursor = 'pointer';
    stayButton.addEventListener('click', () => this.resetTimer());
    
    buttonContainer.appendChild(stayButton);
    message.appendChild(timer);
    content.appendChild(message);
    content.appendChild(buttonContainer);
    this.warningElement.appendChild(content);
    
    document.body.appendChild(this.warningElement);
    
    this.timerElement = timer;
  }
  
  showWarning() {
    this.warningShown = true;
    this.warningElement.style.display = 'block';
    
    // Start countdown
    let secondsLeft = Math.floor(this.options.warningTime / 1000);
    this.updateCountdown(secondsLeft);
    
    this.countdown = setInterval(() => {
      secondsLeft -= 1;
      this.updateCountdown(secondsLeft);
      
      if (secondsLeft <= 0) {
        clearInterval(this.countdown);
      }
    }, 1000);
  }
  
  updateCountdown(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    this.timerElement.textContent = ` ${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  }
  
  hideWarning() {
    this.warningShown = false;
    this.warningElement.style.display = 'none';
    clearInterval(this.countdown);
  }
  
  async checkSession() {
    try {
      // Make a lightweight request to verify session is still valid
      const response = await fetch('/api/auth/check-user/', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        // If session is invalid, redirect to login
        window.location.href = this.options.redirectUrl;
      }
    } catch (error) {
      console.error('Session check failed:', error);
    }
  }
  
  async logout() {
    try {
      // Call logout API
      await fetch(this.options.logoutUrl, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'X-CSRFToken': this.getCSRFToken()
        }
      });
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      // Redirect to login page regardless of logout API success
      window.location.href = this.options.redirectUrl;
    }
  }
  
  getCSRFToken() {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.startsWith('csrftoken=')) {
        return cookie.substring('csrftoken='.length, cookie.length);
      }
    }
    return '';
  }
}

// Initialize auto logout when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Create auto logout instance with default settings
  window.autoLogout = new AutoLogout();
  
  // You can customize settings:
  // window.autoLogout = new AutoLogout({
  //   inactivityTime: 15 * 60 * 1000,  // 15 minutes
  //   warningTime: 30 * 1000,          // 30 seconds warning
  //   logoutUrl: '/custom/logout/path/',
  //   redirectUrl: '/custom/login/page',
  //   warningMessage: 'Your session will expire in:'
  // });
}); 