/**
 * =============================================================================
 * HisabNikash - Global AuthContext & Dynamic User Profile Manager
 * 
 * Manages global session state, authenticated user profile, avatar initials,
 * sidebar user rendering, and the dynamic dashboard greeting across all pages.
 * =============================================================================
 */

(function () {
  'use strict';

  // Compute initials from full name (e.g. "Alex Rivera" -> "AR", "Demo User" -> "DU")
  function computeInitials(name) {
    if (!name || typeof name !== 'string') return 'U';
    const trimmed = name.trim();
    if (!trimmed) return 'U';
    const words = trimmed.split(/\s+/).filter(Boolean);
    if (words.length >= 2) {
      return (words[0][0] + words[words.length - 1][0]).toUpperCase();
    }
    return trimmed.substring(0, Math.min(2, trimmed.length)).toUpperCase();
  }

  // Get dynamic time-of-day greeting (Morning, Afternoon, Evening)
  function getTimeGreeting() {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Good morning';
    if (hour >= 12 && hour < 17) return 'Good afternoon';
    return 'Good evening';
  }

  // Extract first name from full name
  function getFirstName(fullName) {
    if (!fullName || typeof fullName !== 'string') return 'there';
    const parts = fullName.trim().split(/\s+/);
    return parts[0] || 'there';
  }

  // Format current month and year (e.g., "September 2026")
  function getCurrentMonthYear() {
    return new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  const AuthContext = {
    STORAGE_KEY_USER: 'currentUser',
    STORAGE_KEY_TOKEN: 'token',

    /**
     * Retrieve the currently authenticated user from global session state.
     */
    getUser() {
      try {
        const stored = localStorage.getItem(this.STORAGE_KEY_USER);
        return stored ? JSON.parse(stored) : null;
      } catch (err) {
        console.warn('[AuthContext] Error reading currentUser from localStorage:', err);
        return null;
      }
    },

    /**
     * Update global session state with user data and re-render.
     */
    setUser(user) {
      if (user) {
        try {
          localStorage.setItem(this.STORAGE_KEY_USER, JSON.stringify(user));
        } catch (err) {
          console.error('[AuthContext] Failed to save user in localStorage:', err);
        }
      } else {
        localStorage.removeItem(this.STORAGE_KEY_USER);
      }

      this.renderUserProfile(user);

      // Dispatch global event so page scripts can react if needed
      window.dispatchEvent(new CustomEvent('auth:userChanged', { detail: user }));
    },

    /**
     * Retrieve current JWT token.
     */
    getToken() {
      return localStorage.getItem(this.STORAGE_KEY_TOKEN);
    },

    /**
     * Log out current user and redirect to login page.
     */
    logout() {
      localStorage.removeItem(this.STORAGE_KEY_TOKEN);
      localStorage.removeItem(this.STORAGE_KEY_USER);
      window.location.href = 'index.html';
    },

    /**
     * Dynamically render user identity in the sidebar and dashboard greeting.
     */
    renderUserProfile(user) {
      if (!user) return;

      const fullName = user.fullName || 'User';
      const email = user.email || '';
      const initials = computeInitials(fullName);

      // 1. Sidebar Profile Elements
      const userNameEls = document.querySelectorAll('#userName, .sidebar-user-name');
      userNameEls.forEach(el => {
        el.textContent = fullName;
      });

      const userEmailEls = document.querySelectorAll('#userEmail, .sidebar-user-email');
      userEmailEls.forEach(el => {
        el.textContent = email;
      });

      const userAvatarEls = document.querySelectorAll('#userAvatar, .sidebar-user-avatar');
      userAvatarEls.forEach(el => {
        el.textContent = initials;
      });

      // 2. Dashboard Greeting Header
      const greetingHeading = document.getElementById('greetingHeading');
      if (greetingHeading) {
        const timeGreeting = getTimeGreeting();
        const firstName = getFirstName(fullName);
        greetingHeading.textContent = `${timeGreeting}, ${firstName} 👋`;
      }

      const greetingSub = document.getElementById('greetingSub');
      if (greetingSub) {
        const monthYear = getCurrentMonthYear();
        greetingSub.textContent = `Here's your financial snapshot for ${monthYear}`;
      }

      // 3. Month Pill Display (if showing an outdated hardcoded year)
      const currentMonthText = document.getElementById('currentMonthText');
      if (currentMonthText && (currentMonthText.textContent.includes('2025') || !currentMonthText.textContent.trim())) {
        currentMonthText.textContent = getCurrentMonthYear();
      }

      // 4. AI Bestie welcome message (if present on the page)
      const aiWelcomeMsg = document.querySelector('#chatMessages .bot-msg, .chat-messages .bot-msg');
      if (aiWelcomeMsg && aiWelcomeMsg.textContent.includes('Rahim')) {
        const firstName = getFirstName(fullName);
        aiWelcomeMsg.textContent = aiWelcomeMsg.textContent.replace(/\bRahim\b/g, firstName);
      }
    },

    /**
     * Fetch the authenticated user's profile from the backend API.
     */
    async fetchUser() {
      const token = this.getToken();
      if (!token) return null;

      try {
        const res = await fetch('/api/users/me', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (res.ok) {
          const user = await res.json();
          this.setUser(user);
          return user;
        } else if (res.status === 401 || res.status === 403) {
          console.warn('[AuthContext] Session invalid or expired.');
          // Redirect to login if on a protected page
          const isAuthPage = window.location.pathname.endsWith('index.html') || 
                             window.location.pathname.endsWith('register.html') ||
                             window.location.pathname === '/';
          if (!isAuthPage) {
            this.logout();
          }
        }
      } catch (err) {
        console.error('[AuthContext] Error fetching /api/users/me:', err);
      }

      return null;
    },

    /**
     * Initialize the AuthContext on page load.
     */
    async init() {
      // Step A: Immediately render from global session state cache (avoids any flash of mock data)
      const cachedUser = this.getUser();
      if (cachedUser) {
        this.renderUserProfile(cachedUser);
      }

      // Step B: Wire up logout triggers
      const logoutBtns = document.querySelectorAll('#logoutBtn, .btn-logout, [title="Click to logout"]');
      logoutBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          this.logout();
        });
      });

      // Step C: Fetch fresh profile data in background to ensure up-to-date state
      await this.fetchUser();
    }
  };

  // Expose to global window scope
  window.AuthContext = AuthContext;

  // Auto-initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      AuthContext.init();
    });
  } else {
    AuthContext.init();
  }
})();
