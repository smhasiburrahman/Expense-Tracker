/**
 * =============================================================================
 * HisabNikash - Reusable Global Topbar Component (topbar.js)
 * 
 * Extracts the top-right navigation bar containing:
 *  1. [ 📅 Sep 1, 2026 — Sep 30, 2026 ⌵ ] (Interactive Calendar Widget)
 *  2. [ ↓ Export ] (Purely Visual UI Placeholder)
 *  3. [ 🔔 ] (Active Alerts Dropdown Filtered by User Settings)
 * 
 * Applies directly to the main layout wrapper (<main class="main-content"> <header class="top-header">)
 * to ensure 100% identical design, alignment, styling, and behavior across every page,
 * completely removing page-specific hardcoded variations.
 * =============================================================================
 */

(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // State Management
  // ---------------------------------------------------------------------------
  const today = new Date();
  let calCurrentYear = today.getFullYear();
  let calCurrentMonth = today.getMonth(); // 0-indexed
  let calSelectedDate = new Date();

  let activeNotifFilter = 'all'; // 'all', 'unread', 'budget', 'daily', 'weekly', 'savings'
  let userNotificationSettings = {
    notifyBudgetAlerts: true,
    notifyDailySummary: true,
    notifyWeeklyReport: true,
    notifySavingsGoals: true
  };

  // Active Real Application Alerts
  let rawAlerts = [];

  // Local Storage Keys
  const STORAGE_KEY_READ = 'hisabnikash_read_notifications';
  const STORAGE_KEY_DISMISSED = 'hisabnikash_dismissed_notifications';
  const STORAGE_KEY_CACHE = 'hisabnikash_cached_alerts';

  // ---------------------------------------------------------------------------
  // Date Helpers: Default Current Month Date Range (e.g. Sep 1, 2026 — Sep 30, 2026)
  // ---------------------------------------------------------------------------
  function getDefaultMonthDateRange(d = new Date()) {
    const year = d.getFullYear();
    const month = d.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    if (window.Localization && typeof window.Localization.formatDate === 'function') {
      const startStr = window.Localization.formatDate(firstDay, 'medium');
      const endStr = window.Localization.formatDate(lastDay, 'medium');
      return `${startStr} — ${endStr}`;
    }

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${monthNames[month]} 1, ${year} — ${monthNames[month]} ${lastDay.getDate()}, ${year}`;
  }

  // ---------------------------------------------------------------------------
  // Persistent Read Status Helpers
  // ---------------------------------------------------------------------------
  function getReadIds() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_READ);
      if (stored) {
        const parsed = JSON.parse(stored);
        return new Set(Array.isArray(parsed) ? parsed : []);
      }
    } catch (e) {
      console.warn('Failed to parse read notification IDs:', e);
    }
    return new Set();
  }

  function saveReadIds(readSet) {
    try {
      localStorage.setItem(STORAGE_KEY_READ, JSON.stringify(Array.from(readSet)));
    } catch (e) {
      console.warn('Failed to save read notification IDs to localStorage:', e);
    }
  }

  function getDismissedIds() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_DISMISSED);
      if (stored) {
        const parsed = JSON.parse(stored);
        return new Set(Array.isArray(parsed) ? parsed : []);
      }
    } catch (e) {
      console.warn('Failed to parse dismissed notification IDs:', e);
    }
    return new Set();
  }

  function saveDismissedIds(dismissedSet) {
    try {
      localStorage.setItem(STORAGE_KEY_DISMISSED, JSON.stringify(Array.from(dismissedSet)));
    } catch (e) {
      console.warn('Failed to save dismissed notification IDs:', e);
    }
  }

  function loadCachedAlerts() {
    try {
      const cached = localStorage.getItem(STORAGE_KEY_CACHE);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const readIds = getReadIds();
          const dismissedIds = getDismissedIds();
          rawAlerts = parsed
            .filter(a => !dismissedIds.has(a.id))
            .map(a => {
              const item = Object.assign({}, a, { read: readIds.has(a.id) });
              if (item.percent !== undefined && item.percent !== null && !isNaN(item.percent)) {
                item.percent = Math.round(Number(item.percent));
              }
              if (item.type === 'savings') {
                if ((item.percent === undefined || isNaN(item.percent) || Number(item.percent) === 0) && item.capBDT > 0 && item.amountBDT > 0) {
                  item.percent = Math.min(100, Math.round((Number(item.amountBDT) / Number(item.capBDT)) * 100));
                }
                if (typeof item.rawMessage === 'string') {
                  const cleanPct = (item.percent !== undefined && !isNaN(item.percent) && Number(item.percent) > 0)
                    ? Math.round(Number(item.percent))
                    : (item.capBDT > 0 && item.amountBDT > 0 ? Math.min(100, Math.round((Number(item.amountBDT) / Number(item.capBDT)) * 100)) : null);
                  if (cleanPct !== null && /\b(0|\d{3,})% complete!/.test(item.rawMessage)) {
                    item.rawMessage = item.rawMessage.replace(/\b\d+% complete!/g, `${cleanPct}% complete!`);
                  }
                }
              }
              return item;
            });
          updateNotificationBadge();
          renderNotificationsDropdown();
        }
      }
    } catch (e) {
      console.warn('Failed to load cached alerts:', e);
    }
  }

  function cacheAlerts() {
    try {
      localStorage.setItem(STORAGE_KEY_CACHE, JSON.stringify(rawAlerts));
    } catch (e) {
      console.warn('Failed to cache alerts:', e);
    }
  }

  // ---------------------------------------------------------------------------
  // User Notification Settings Loader & Synchronizer
  // ---------------------------------------------------------------------------
  function loadStoredSettings() {
    try {
      const stored = localStorage.getItem('userNotificationSettings');
      if (stored) {
        userNotificationSettings = Object.assign({}, userNotificationSettings, JSON.parse(stored));
      }
    } catch (e) {
      console.warn('Failed to parse userNotificationSettings from localStorage:', e);
    }
  }

  async function fetchServerSettings() {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const res = await fetch('/api/users/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        userNotificationSettings = {
          notifyBudgetAlerts: data.notifyBudgetAlerts !== false,
          notifyDailySummary: data.notifyDailySummary !== false,
          notifyWeeklyReport: data.notifyWeeklyReport !== false,
          notifySavingsGoals: data.notifySavingsGoals !== false
        };
        localStorage.setItem('userNotificationSettings', JSON.stringify(userNotificationSettings));
        updateFilterChipsVisibility();
        updateNotificationBadge();
        renderNotificationsDropdown();
      }
    } catch (err) {
      console.warn('Failed to fetch user notification settings from server:', err);
    }
  }

  // ---------------------------------------------------------------------------
  // Fetch Actual Application Events & Construct Notifications
  // ---------------------------------------------------------------------------
  async function loadApplicationEvents() {
    const token = localStorage.getItem('token');
    if (!token) return;

    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    try {
      // 1. Primary: Fetch real alerts directly from expanded backend logic
      const res = await fetch('/api/notifications', { headers });
      if (res.ok) {
        const backendAlerts = await res.json();
        if (Array.isArray(backendAlerts)) {
          processBackendAlerts(backendAlerts);
          return;
        }
      }
    } catch (err) {
      console.warn('Backend notifications endpoint unreachable, using fallback:', err);
    }

    // Fallback: If backend is temporarily offline or legacy
    try {
      const [catsRes, walletsRes, savingsRes, txsRes] = await Promise.allSettled([
        fetch('/api/categories', { headers }),
        fetch('/api/wallets', { headers }),
        fetch('/api/savings', { headers }),
        fetch('/api/transactions', { headers })
      ]);

      const categories = (catsRes.status === 'fulfilled' && catsRes.value.ok) ? await catsRes.value.json() : [];
      const wallets = (walletsRes.status === 'fulfilled' && walletsRes.value.ok) ? await walletsRes.value.json() : [];
      const savings = (savingsRes.status === 'fulfilled' && savingsRes.value.ok) ? await savingsRes.value.json() : [];
      const transactions = (txsRes.status === 'fulfilled' && txsRes.value.ok) ? await txsRes.value.json() : [];

      buildAlertsFromRealData(categories, wallets, savings, transactions);
    } catch (err) {
      console.error('Error fetching fallback application events:', err);
    }
  }

  // ---------------------------------------------------------------------------
  // Active Notification Preferences Verification from Settings
  // ---------------------------------------------------------------------------
  function getCanonicalAlertCategory(typeOrCategory) {
    if (!typeOrCategory) return 'daily';
    const t = String(typeOrCategory).toLowerCase().trim().replace(/[-_\s]/g, '');
    if (t.includes('budget') || t.includes('cap') || t.includes('overbudget') || t.includes('lowbalance') || t.includes('walletlow')) {
      return 'budget';
    }
    if (t.includes('saving') || t.includes('vault') || t.includes('milestone') || t.includes('goal')) {
      return 'savings';
    }
    if (t.includes('week')) {
      return 'weekly';
    }
    if (t.includes('daily') || t.includes('today') || t.includes('expense') || t.includes('tx') || t.includes('transaction') || t.includes('charity') || t.includes('sadaqa')) {
      return 'daily';
    }
    return 'daily';
  }

  function isAlertCategoryEnabled(canonicalCategory) {
    loadStoredSettings(); // Keep settings strictly up-to-date with Settings page
    switch (canonicalCategory) {
      case 'budget':
        return userNotificationSettings.notifyBudgetAlerts !== false;
      case 'daily':
        return userNotificationSettings.notifyDailySummary !== false;
      case 'weekly':
        return userNotificationSettings.notifyWeeklyReport !== false;
      case 'savings':
        return userNotificationSettings.notifySavingsGoals !== false;
      default:
        return true;
    }
  }

  /**
   * Real-time Application Event Processor for the Notification Bell
   * Verifies the event against active notification preferences, immediately pushes
   * to the bell's local state array, and dynamically increments the unread badge in DOM.
   */
  function handleApplicationEvent(eventData) {
    if (!eventData || typeof eventData !== 'object') {
      console.warn('[NotificationBell] Invalid event data passed to handleApplicationEvent:', eventData);
      return false;
    }

    // 1. Resolve canonical alert category
    const rawType = eventData.type || eventData.category || eventData.eventType || eventData.alertType || 'daily';
    const canonicalCategory = getCanonicalAlertCategory(rawType);

    // 2. VERIFY against active notification preferences from Settings page
    if (!isAlertCategoryEnabled(canonicalCategory)) {
      console.info(`[NotificationBell] Event '${rawType}' (${canonicalCategory}) ignored: disabled in Settings notification preferences.`);
      return false;
    }

    // 3. Format and normalize notification item
    const alertId = eventData.id || `event-${canonicalCategory}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const dismissedIds = getDismissedIds();
    if (dismissedIds.has(alertId)) {
      return false;
    }

    const defaultIcons = {
      budget: 'fa-solid fa-triangle-exclamation',
      daily: 'fa-solid fa-calendar-day',
      weekly: 'fa-solid fa-chart-line',
      savings: 'fa-solid fa-piggy-bank'
    };

    const defaultLinks = {
      budget: 'budgets.html',
      daily: 'dashboard.html',
      weekly: 'analytics.html',
      savings: 'savings.html'
    };

    const defaultTitles = {
      budget: 'Budget Alert',
      daily: 'Daily Activity',
      weekly: 'Weekly Summary',
      savings: 'Savings Goal Update'
    };

    const targetCapBDT = eventData.capBDT !== undefined ? Number(eventData.capBDT)
      : (eventData.cap !== undefined ? Number(eventData.cap)
      : (eventData.goal !== undefined ? Number(eventData.goal)
      : (eventData.targetAmount !== undefined ? Number(eventData.targetAmount)
      : (eventData.target !== undefined ? Number(eventData.target) : undefined))));

    const amountValBDT = eventData.amountBDT !== undefined ? Number(eventData.amountBDT)
      : (eventData.amount !== undefined ? Number(eventData.amount) : undefined);

    let eventPercent = (eventData.percent !== undefined && eventData.percent !== null && !isNaN(eventData.percent))
      ? Math.round(Number(eventData.percent))
      : undefined;

    if (canonicalCategory === 'savings') {
      if ((eventPercent === undefined || isNaN(eventPercent) || eventPercent === 0) && targetCapBDT > 0 && amountValBDT > 0) {
        eventPercent = Math.min(100, Math.round((amountValBDT / targetCapBDT) * 100));
      }
    } else if (canonicalCategory === 'budget') {
      if ((eventPercent === undefined || isNaN(eventPercent)) && targetCapBDT > 0 && amountValBDT !== undefined) {
        eventPercent = Math.round((amountValBDT / targetCapBDT) * 100);
      }
    }

    let rawMsg = eventData.message || eventData.rawMessage || eventData.desc || '';
    if (canonicalCategory === 'savings' && typeof rawMsg === 'string') {
      const cleanPct = (eventPercent !== undefined && !isNaN(eventPercent) && eventPercent > 0)
        ? Math.round(Number(eventPercent))
        : (targetCapBDT > 0 && amountValBDT > 0 ? Math.min(100, Math.round((amountValBDT / targetCapBDT) * 100)) : undefined);
      if (cleanPct !== undefined) {
        eventPercent = cleanPct;
        if (/\b(0|\d{3,})% complete!/.test(rawMsg)) {
          rawMsg = rawMsg.replace(/\b\d+% complete!/g, `${cleanPct}% complete!`);
        }
      }
    }

    const newAlert = {
      id: alertId,
      type: canonicalCategory,
      title: eventData.title || defaultTitles[canonicalCategory] || 'Notification',
      category: eventData.category || '',
      amountBDT: amountValBDT,
      capBDT: targetCapBDT,
      percent: eventPercent,
      rawMessage: rawMsg,
      timeAgo: eventData.timeAgo || 'Just now',
      timestamp: eventData.timestamp ? new Date(eventData.timestamp) : new Date(),
      read: false, // Arriving event is unread
      icon: eventData.icon || defaultIcons[canonicalCategory] || 'fa-solid fa-bell',
      link: eventData.link || defaultLinks[canonicalCategory] || 'dashboard.html',
      severity: eventData.severity || (canonicalCategory === 'budget' ? 'danger' : canonicalCategory === 'savings' ? 'success' : 'info')
    };

    // Ensure it is not marked as read so it increments unread count
    const readIds = getReadIds();
    if (readIds.has(alertId)) {
      readIds.delete(alertId);
      saveReadIds(readIds);
    }

    // 4. Immediately push to bell's local state array (unshift to top, replacing duplicates or prior category alert if any)
    rawAlerts = rawAlerts.filter(a => {
      if (a.id === newAlert.id) return false;
      if (canonicalCategory === 'budget' && a.type === 'budget' && a.category && newAlert.category && a.category.toLowerCase() === newAlert.category.toLowerCase()) {
        return false;
      }
      return true;
    });
    rawAlerts.unshift(newAlert);
    cacheAlerts();

    // 5. Dynamically increment and update unread badge count in DOM
    updateNotificationBadge();
    renderNotificationsDropdown();

    // 6. Trigger dynamic visual feedback (bell swing & badge pulse)
    triggerBellAnimation();

    window.dispatchEvent(new CustomEvent('notificationBellUpdated', {
      detail: { alert: newAlert, unreadCount: getActiveUnreadCount() }
    }));

    return true;
  }

  /**
   * Evaluates category spending against monthly budget caps.
   * If any category exceeds its cap, generates an over-budget alert payload,
   * validates against user notification settings, and pushes to the notification bell's local state array.
   */
  async function checkAndTriggerBudgetAlert(categoryIds) {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const res = await fetch('/api/categories', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) return;
      const categories = await res.json();

      let targetIds = null;
      if (categoryIds !== undefined && categoryIds !== null) {
        targetIds = new Set(Array.isArray(categoryIds) ? categoryIds.map(Number) : [Number(categoryIds)]);
      }

      categories.forEach(cat => {
        if (targetIds && !targetIds.has(Number(cat.id))) return;

        const spent = parseFloat(cat.spent) || 0;
        const cap = parseFloat(cat.cap) || 0;
        if (cap <= 0) return;

        const percent = Math.round((spent / cap) * 100);
        if (spent > cap || percent >= 100) {
          const budgetAlert = {
            type: 'budget',
            title: `Over Budget Alert: ${cat.name}`,
            category: cat.name,
            amountBDT: spent,
            capBDT: cap,
            percent: percent,
            message: `${cat.name} has exceeded its monthly budget cap. Immediate attention recommended.`,
            rawMessage: `${cat.name} has exceeded its monthly budget cap. Immediate attention recommended.`,
            severity: 'danger',
            icon: 'fa-solid fa-triangle-exclamation',
            link: 'budgets.html'
          };

          if (window.handleApplicationEvent) {
            window.handleApplicationEvent(budgetAlert);
          } else {
            window.dispatchEvent(new CustomEvent('applicationEvent', { detail: budgetAlert }));
          }
        }
      });
    } catch (err) {
      console.warn('[NotificationBell] Failed to evaluate category budget caps:', err);
    }
  }

  function processBackendAlerts(backendAlerts) {
    const readIds = getReadIds();
    const dismissedIds = getDismissedIds();

    const alerts = backendAlerts
      .filter(item => !dismissedIds.has(item.id))
      .map(item => {
        const isRead = Boolean(item.read || readIds.has(item.id));
        if (item.read && !readIds.has(item.id)) {
          readIds.add(item.id);
        }

        return {
          id: item.id,
          type: item.type,
          title: item.title,
          category: item.category || '',
          amountBDT: item.amount !== undefined && item.amount !== null ? parseFloat(item.amount) : undefined,
          capBDT: item.cap !== undefined && item.cap !== null ? parseFloat(item.cap) : undefined,
          percent: item.percent,
          rawMessage: item.message,
          timeAgo: item.timeAgo || 'Recent',
          timestamp: item.timestamp ? new Date(item.timestamp) : new Date(),
          read: isRead,
          icon: item.icon || (item.type === 'budget' ? 'fa-solid fa-triangle-exclamation' : item.type === 'daily' ? 'fa-solid fa-calendar-day' : item.type === 'weekly' ? 'fa-solid fa-chart-line' : 'fa-solid fa-piggy-bank'),
          link: item.link || (item.type === 'budget' ? 'budgets.html' : item.type === 'daily' ? 'dashboard.html' : item.type === 'weekly' ? 'analytics.html' : 'savings.html'),
          severity: item.severity || 'info'
        };
      });

    saveReadIds(readIds);

    // Retain recent local unread alerts that haven't been incorporated into backend yet
    const backendIds = new Set(alerts.map(a => a.id));
    const recentLocalAlerts = rawAlerts.filter(a => !backendIds.has(a.id) && !dismissedIds.has(a.id) && String(a.id).startsWith('event-'));

    rawAlerts = [...recentLocalAlerts, ...alerts];
    cacheAlerts();
    updateNotificationBadge();
    renderNotificationsDropdown();
  }

  // ---------------------------------------------------------------------------
  // Real-Time Server-Sent Events (SSE) Push Notifications
  // ---------------------------------------------------------------------------
  let notifEventSource = null;
  let sseReconnectTimer = null;
  let sseFallbackPollTimer = null;
  let sseRetryCount = 0;

  function initRealtimeNotifications() {
    const token = localStorage.getItem('token');
    if (!token) return;

    if (typeof EventSource === 'undefined') {
      console.warn('Browser does not support EventSource. Starting fallback polling.');
      startFallbackPolling();
      return;
    }

    // Clean up any existing connection
    if (notifEventSource) {
      try {
        notifEventSource.close();
      } catch (e) {}
      notifEventSource = null;
    }

    if (sseReconnectTimer) {
      clearTimeout(sseReconnectTimer);
      sseReconnectTimer = null;
    }

    try {
      const streamUrl = `/api/notifications/stream?token=${encodeURIComponent(token)}`;
      notifEventSource = new EventSource(streamUrl);

      notifEventSource.onopen = () => {
        sseRetryCount = 0;
        // Stop fallback polling if SSE is active
        if (sseFallbackPollTimer) {
          clearInterval(sseFallbackPollTimer);
          sseFallbackPollTimer = null;
        }
      };

      // Handle real-time notification push from backend
      notifEventSource.addEventListener('notifications', (e) => {
        try {
          if (!e.data) return;
          const backendAlerts = JSON.parse(e.data);
          if (Array.isArray(backendAlerts)) {
            handleRealtimeAlertsArrival(backendAlerts);
          }
        } catch (err) {
          console.error('Failed to parse incoming real-time notifications:', err);
        }
      });

      // Handle single notification event
      notifEventSource.addEventListener('notification', (e) => {
        try {
          if (!e.data) return;
          const data = JSON.parse(e.data);
          handleApplicationEvent(data);
        } catch (err) {
          console.error('Failed to parse incoming single notification:', err);
        }
      });

      // Handle generic application event over SSE
      notifEventSource.addEventListener('app_event', (e) => {
        try {
          if (!e.data) return;
          const data = JSON.parse(e.data);
          handleApplicationEvent(data);
        } catch (err) {
          console.error('Failed to parse incoming app_event:', err);
        }
      });

      // Heartbeat ping from server
      notifEventSource.addEventListener('ping', () => {
        // Keep-alive heartbeat received
      });

      notifEventSource.onerror = (err) => {
        if (notifEventSource) {
          try { notifEventSource.close(); } catch (e) {}
          notifEventSource = null;
        }

        sseRetryCount++;
        // If SSE fails repeatedly, fall back to background polling
        if (sseRetryCount >= 3 && !sseFallbackPollTimer) {
          startFallbackPolling();
        }

        const delay = Math.min(15000, 3000 * Math.min(sseRetryCount, 4));
        sseReconnectTimer = setTimeout(() => {
          initRealtimeNotifications();
        }, delay);
      };
    } catch (err) {
      console.error('Error establishing SSE connection:', err);
      startFallbackPolling();
    }
  }

  function handleRealtimeAlertsArrival(backendAlerts) {
    const prevUnreadIds = new Set(rawAlerts.filter(a => !a.read).map(a => a.id));

    processBackendAlerts(backendAlerts);

    const newUnreadAlerts = rawAlerts.filter(a => !a.read && !prevUnreadIds.has(a.id));
    if (newUnreadAlerts.length > 0) {
      triggerBellAnimation();
    }
  }

  function triggerBellAnimation() {
    const notifButtons = document.querySelectorAll('.topbar-notif-btn, .notification-icon');
    const badgeEls = document.querySelectorAll('.notification-badge, #topbarNotificationBadge');

    notifButtons.forEach(btn => {
      btn.classList.remove('has-new-alert');
      void btn.offsetWidth;
      btn.classList.add('has-new-alert');
      setTimeout(() => {
        btn.classList.remove('has-new-alert');
      }, 1400);
    });

    badgeEls.forEach(badge => {
      badge.classList.remove('badge-pop');
      void badge.offsetWidth;
      badge.classList.add('badge-pop');
      setTimeout(() => {
        badge.classList.remove('badge-pop');
      }, 1500);
    });
  }

  function startFallbackPolling() {
    if (sseFallbackPollTimer) return;
    sseFallbackPollTimer = setInterval(() => {
      loadApplicationEvents();
    }, 20000);
  }

  function buildAlertsFromRealData(categories, wallets, savings, transactions) {
    const readIds = getReadIds();
    const dismissedIds = getDismissedIds();
    const alerts = [];

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    // 1. ACTUAL BUDGET ALERTS (from Categories & monthly spending caps)
    if (Array.isArray(categories) && categories.length > 0) {
      categories.forEach(cat => {
        const spent = parseFloat(cat.spent) || 0;
        const cap = parseFloat(cat.cap) || 0;
        if (cap <= 0) return;

        const progress = Math.round((spent / cap) * 100);

        if (progress >= 100) {
          const alertId = `alert-budget-cap-${cat.id}`;
          if (!dismissedIds.has(alertId)) {
            alerts.push({
              id: alertId,
              type: 'budget',
              title: `Over Budget Alert: ${cat.name}`,
              category: cat.name,
              amountBDT: spent,
              capBDT: cap,
              percent: progress,
              rawMessage: `${cat.name} has exceeded its monthly budget cap. Immediate attention recommended.`,
              timeAgo: 'Recent',
              timestamp: new Date(Date.now() - 30 * 60 * 1000),
              read: readIds.has(alertId),
              icon: 'fa-solid fa-triangle-exclamation',
              link: 'budgets.html'
            });
          }
        } else if (progress >= 80) {
          const alertId = `alert-budget-near-${cat.id}`;
          if (!dismissedIds.has(alertId)) {
            alerts.push({
              id: alertId,
              type: 'budget',
              title: `Budget Warning: ${cat.name}`,
              category: cat.name,
              amountBDT: spent,
              capBDT: cap,
              percent: progress,
              rawMessage: `${cat.name} spending reached ${progress}% of monthly budget limit.`,
              timeAgo: '1h ago',
              timestamp: new Date(Date.now() - 60 * 60 * 1000),
              read: readIds.has(alertId),
              icon: 'fa-solid fa-chart-pie',
              link: 'budgets.html'
            });
          }
        }
      });

      // If no category exceeded 80%, highlight the highest spending category as a budget status
      const hasBudgetAlert = alerts.some(a => a.type === 'budget');
      if (!hasBudgetAlert && categories.length > 0) {
        const sortedCats = [...categories].sort((a, b) => (parseFloat(b.spent) || 0) - (parseFloat(a.spent) || 0));
        const topCat = sortedCats[0];
        const topSpent = parseFloat(topCat.spent) || 0;
        const topCap = parseFloat(topCat.cap) || 0;
        if (topCap > 0 && topSpent > 0) {
          const alertId = `alert-budget-top-${topCat.id}`;
          if (!dismissedIds.has(alertId)) {
            const prog = Math.round((topSpent / topCap) * 100);
            alerts.push({
              id: alertId,
              type: 'budget',
              title: `Budget Update: ${topCat.name}`,
              category: topCat.name,
              amountBDT: topSpent,
              capBDT: topCap,
              percent: prog,
              rawMessage: `Highest spending category this month: ${topCat.name} at ${prog}% of cap.`,
              timeAgo: '2h ago',
              timestamp: new Date(Date.now() - 2 * 3600 * 1000),
              read: readIds.has(alertId),
              icon: 'fa-solid fa-chart-pie',
              link: 'budgets.html'
            });
          }
        }
      }
    }

    // 2. ACTUAL WALLET UPDATES & WARNINGS (from User Wallets)
    if (Array.isArray(wallets) && wallets.length > 0) {
      wallets.forEach(wallet => {
        const bal = parseFloat(wallet.currentBalance) || 0;

        // Low balance alert for wallets under 1,000 BDT
        if (bal < 1000 && bal >= 0) {
          const alertId = `alert-wallet-low-${wallet.id}`;
          if (!dismissedIds.has(alertId)) {
            alerts.push({
              id: alertId,
              type: 'budget',
              title: `Low Wallet Balance: ${wallet.name}`,
              category: wallet.name,
              amountBDT: bal,
              rawMessage: `${wallet.name} is running low on funds. Consider transferring balance.`,
              timeAgo: '3h ago',
              timestamp: new Date(Date.now() - 3 * 3600 * 1000),
              read: readIds.has(alertId),
              icon: 'fa-solid fa-wallet',
              link: 'wallets.html'
            });
          }
        }
      });

      // Primary wallet status update
      const activeWallet = wallets.find(w => (parseFloat(w.currentBalance) || 0) >= 1000) || wallets[0];
      if (activeWallet) {
        const alertId = `alert-wallet-active-${activeWallet.id}`;
        if (!dismissedIds.has(alertId)) {
          const bal = parseFloat(activeWallet.currentBalance) || 0;
          alerts.push({
            id: alertId,
            type: 'daily',
            title: `Wallet Update: ${activeWallet.name}`,
            category: activeWallet.name,
            amountBDT: bal,
            rawMessage: `${activeWallet.name} current balance verified and up to date.`,
            timeAgo: '4h ago',
            timestamp: new Date(Date.now() - 4 * 3600 * 1000),
            read: readIds.has(alertId),
            icon: 'fa-solid fa-credit-card',
            link: 'wallets.html'
          });
        }
      }
    }

    // 3. ACTUAL SAVINGS GOAL MILESTONES (from User Vaults)
    if (Array.isArray(savings) && savings.length > 0) {
      savings.forEach(vault => {
        const current = parseFloat(vault.initialSavings || vault.currentAmount || vault.current || 0);
        const target = parseFloat(vault.targetAmount || vault.goal || vault.target || 0);
        const percent = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;

        const alertId = `alert-savings-vault-${vault.id}`;
        if (!dismissedIds.has(alertId)) {
          alerts.push({
            id: alertId,
            type: 'savings',
            title: `Goal Milestone: ${vault.name}`,
            category: vault.name,
            amountBDT: current,
            capBDT: target,
            percent: percent,
            rawMessage: `${vault.name} target progress: ${percent}% achieved. Keep saving toward your goal!`,
            timeAgo: '5h ago',
            timestamp: new Date(Date.now() - 5 * 3600 * 1000),
            read: readIds.has(alertId),
            icon: 'fa-solid fa-bullseye',
            link: 'savings.html'
          });
        }
      });
    }

    // 4. ACTUAL DAILY SUMMARY (from Transactions today)
    if (Array.isArray(transactions)) {
      const todayExpenses = transactions.filter(t => {
        const isToday = t.transactionDate && t.transactionDate.startsWith(todayStr);
        const isExpense = t.transactionType === 'EXPENSE';
        return isToday && isExpense;
      });

      const todayTotal = todayExpenses.reduce((sum, t) => sum + (parseFloat(t.convertedAmount) || 0), 0);
      const alertId = `alert-daily-${todayStr}`;

      if (!dismissedIds.has(alertId)) {
        const msg = todayExpenses.length > 0
          ? `Total spent today: ${todayExpenses.length} transaction${todayExpenses.length > 1 ? 's' : ''} recorded.`
          : `No expenses logged yet today. All wallet balances are in order.`;

        alerts.push({
          id: alertId,
          type: 'daily',
          title: 'Daily Spending Summary',
          amountBDT: todayTotal,
          txCount: todayExpenses.length,
          rawMessage: msg,
          timeAgo: 'Today',
          timestamp: new Date(),
          read: readIds.has(alertId),
          icon: 'fa-solid fa-calendar-day',
          link: 'dashboard.html'
        });
      }

      // 5. ACTUAL WEEKLY REPORT (from past 7 days of Transactions)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(now.getDate() - 7);
      const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

      const weeklyExpenses = transactions.filter(t => {
        return t.transactionDate &&
               t.transactionDate >= sevenDaysAgoStr &&
               t.transactionType === 'EXPENSE';
      });

      const weeklyTotal = weeklyExpenses.reduce((sum, t) => sum + (parseFloat(t.convertedAmount) || 0), 0);
      const weekNumber = Math.ceil((now.getDate() - now.getDay()) / 7);
      const alertWeeklyId = `alert-weekly-${now.getFullYear()}-${now.getMonth() + 1}-w${weekNumber}`;

      if (!dismissedIds.has(alertWeeklyId)) {
        const catTotals = {};
        weeklyExpenses.forEach(t => {
          const cName = t.category ? t.category.name : 'General';
          catTotals[cName] = (catTotals[cName] || 0) + (parseFloat(t.convertedAmount) || 0);
        });

        let topCatName = 'Essentials';
        let topCatAmt = 0;
        Object.entries(catTotals).forEach(([name, amt]) => {
          if (amt > topCatAmt) {
            topCatAmt = amt;
            topCatName = name;
          }
        });

        alerts.push({
          id: alertWeeklyId,
          type: 'weekly',
          title: 'Weekly Financial Digest',
          amountBDT: weeklyTotal,
          topCategory: topCatName,
          rawMessage: `Weekly outflow review ready. Top spending category: ${topCatName}.`,
          timeAgo: '1d ago',
          timestamp: new Date(Date.now() - 24 * 3600 * 1000),
          read: readIds.has(alertWeeklyId),
          icon: 'fa-solid fa-chart-line',
          link: 'analytics.html'
        });
      }
    }

    rawAlerts = alerts;
    cacheAlerts();
    updateNotificationBadge();
    renderNotificationsDropdown();
  }

  // Dynamic alert message formatting with Localization currency conversion
  function formatAlertMessage(alert) {
    if (alert.rawMessage) {
      if (alert.type === 'savings' && typeof alert.rawMessage === 'string') {
        const cleanPct = alert.percent !== undefined && !isNaN(alert.percent) && Number(alert.percent) > 0
          ? Math.round(Number(alert.percent))
          : (alert.capBDT > 0 && alert.amountBDT > 0 ? Math.min(100, Math.round((Number(alert.amountBDT) / Number(alert.capBDT)) * 100)) : null);
        if (cleanPct !== null && /\b(0|\d{3,})% complete!/.test(alert.rawMessage)) {
          return alert.rawMessage.replace(/\b\d+% complete!/g, `${cleanPct}% complete!`);
        }
      }
      return alert.rawMessage;
    }
    if (alert.type === 'budget') {
      const spent = window.Localization ? window.Localization.formatMoney(alert.amountBDT, 'BDT') : `৳${(alert.amountBDT || 0).toLocaleString()}`;
      if (alert.capBDT !== undefined) {
        const cap = window.Localization ? window.Localization.formatMoney(alert.capBDT, 'BDT') : `৳${alert.capBDT.toLocaleString()}`;
        return `You have spent ${alert.percent}% of your monthly ${alert.category} budget (${spent} of ${cap} cap).`;
      }
      return `${alert.category} balance: ${spent}.`;
    }
    if (alert.type === 'daily') {
      const spent = window.Localization ? window.Localization.formatMoney(alert.amountBDT, 'BDT') : `৳${(alert.amountBDT || 0).toLocaleString()}`;
      return `Total spent today: ${spent}.`;
    }
    if (alert.type === 'savings') {
      const saved = window.Localization ? window.Localization.formatMoney(alert.amountBDT, 'BDT') : `৳${(alert.amountBDT || 0).toLocaleString()}`;
      const goal = window.Localization ? window.Localization.formatMoney(alert.capBDT, 'BDT') : `৳${alert.capBDT.toLocaleString()}`;
      const calcPct = alert.percent !== undefined && !isNaN(alert.percent) && alert.percent > 0
        ? alert.percent
        : (alert.capBDT > 0 && alert.amountBDT > 0 ? Math.min(100, Math.round(((alert.amountBDT || 0) / alert.capBDT) * 100)) : 0);
      return `${alert.category} reached ${calcPct}% of target goal (${saved} saved of ${goal} target).`;
    }
    if (alert.type === 'weekly') {
      const total = window.Localization ? window.Localization.formatMoney(alert.amountBDT, 'BDT') : `৳${(alert.amountBDT || 0).toLocaleString()}`;
      return `Weekly spending: ${total}. Review your analytics.`;
    }
    return '';
  }

  // Filter alerts strictly according to user's toggles
  function getFilteredAlerts() {
    return rawAlerts.filter(alert => {
      if (alert.type === 'budget' && !userNotificationSettings.notifyBudgetAlerts) return false;
      if (alert.type === 'daily' && !userNotificationSettings.notifyDailySummary) return false;
      if (alert.type === 'weekly' && !userNotificationSettings.notifyWeeklyReport) return false;
      if (alert.type === 'savings' && !userNotificationSettings.notifySavingsGoals) return false;

      if (activeNotifFilter === 'unread') return !alert.read;
      if (activeNotifFilter !== 'all' && alert.type !== activeNotifFilter) return false;

      return true;
    });
  }

  function getActiveUnreadCount() {
    return rawAlerts.filter(alert => {
      if (alert.type === 'budget' && !userNotificationSettings.notifyBudgetAlerts) return false;
      if (alert.type === 'daily' && !userNotificationSettings.notifyDailySummary) return false;
      if (alert.type === 'weekly' && !userNotificationSettings.notifyWeeklyReport) return false;
      if (alert.type === 'savings' && !userNotificationSettings.notifySavingsGoals) return false;
      return !alert.read;
    }).length;
  }

  // ---------------------------------------------------------------------------
  // Mark as Read / Dismiss / Global Sync
  // ---------------------------------------------------------------------------
  function markSingleAlertRead(id) {
    const readIds = getReadIds();
    readIds.add(id);
    saveReadIds(readIds);

    const alertObj = rawAlerts.find(a => a.id === id);
    if (alertObj) {
      alertObj.read = true;
    }

    cacheAlerts();
    updateNotificationBadge();
    renderNotificationsDropdown();

    // Persist read status to backend
    const token = localStorage.getItem('token');
    if (token) {
      fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ alertId: id })
      }).catch(e => console.warn('Failed to persist mark-read to backend:', e));
    }

    window.dispatchEvent(new CustomEvent('notificationsReadUpdated', { detail: Array.from(readIds) }));
  }

  function markAllAlertsRead() {
    const readIds = getReadIds();
    const alertIds = rawAlerts.map(a => a.id);
    rawAlerts.forEach(a => {
      a.read = true;
      readIds.add(a.id);
    });

    saveReadIds(readIds);
    cacheAlerts();
    updateNotificationBadge();
    renderNotificationsDropdown();

    // Persist all read to backend
    const token = localStorage.getItem('token');
    if (token) {
      fetch('/api/notifications/mark-all-read', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ alertIds })
      }).catch(e => console.warn('Failed to persist mark-all-read to backend:', e));
    }

    window.dispatchEvent(new CustomEvent('notificationsReadUpdated', { detail: Array.from(readIds) }));
  }

  function dismissSingleAlert(id) {
    const dismissedIds = getDismissedIds();
    dismissedIds.add(id);
    saveDismissedIds(dismissedIds);

    rawAlerts = rawAlerts.filter(a => a.id !== id);
    cacheAlerts();
    updateNotificationBadge();
    renderNotificationsDropdown();
  }

  // ---------------------------------------------------------------------------
  // Topbar Export Button Handler (Purely Visual UI Placeholder)
  // ---------------------------------------------------------------------------
  function initExportPlaceholder() {
    const exportButtons = document.querySelectorAll('.btn-export, #exportBtn, #topbarExportBtn');
    exportButtons.forEach(btn => {
      btn.setAttribute('type', 'button');
      btn.removeAttribute('onclick');
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
      });
    });
  }

  // ---------------------------------------------------------------------------
  // Interactive Calendar Widget Implementation
  // ---------------------------------------------------------------------------
  function buildCalendarWidgetHTML() {
    return `
      <div class="topbar-calendar-dropdown" id="topbarCalendarDropdown" role="dialog" aria-modal="true" aria-label="Interactive Calendar">
        <!-- Calendar Header -->
        <div class="cal-header">
          <div class="cal-month-title" id="calMonthYearTitle">Month Year</div>
          <div class="cal-nav-group">
            <button type="button" class="cal-today-pill" id="calTodayBtn" title="Jump to Today">Today</button>
            <button type="button" class="cal-nav-btn" id="calPrevMonthBtn" title="Previous Month" aria-label="Previous Month">
              <i class="fa-solid fa-chevron-left"></i>
            </button>
            <button type="button" class="cal-nav-btn" id="calNextMonthBtn" title="Next Month" aria-label="Next Month">
              <i class="fa-solid fa-chevron-right"></i>
            </button>
          </div>
        </div>

        <!-- Weekday Headers -->
        <div class="cal-weekdays" id="calWeekdaysRow">
          <div class="cal-weekday">Su</div>
          <div class="cal-weekday">Mo</div>
          <div class="cal-weekday">Tu</div>
          <div class="cal-weekday">We</div>
          <div class="cal-weekday">Th</div>
          <div class="cal-weekday">Fr</div>
          <div class="cal-weekday">Sa</div>
        </div>

        <!-- Days Grid -->
        <div class="cal-days-grid" id="calDaysGrid"></div>

        <!-- Quick Presets -->
        <div class="cal-presets">
          <button type="button" class="cal-preset-btn" data-preset="today">Today</button>
          <button type="button" class="cal-preset-btn" data-preset="this-week">This Week</button>
          <button type="button" class="cal-preset-btn" data-preset="this-month">This Month</button>
        </div>

        <!-- Selected Date Footer -->
        <div class="cal-footer">
          <div class="cal-selected-info">
            <i class="fa-regular fa-calendar-check"></i>
            <span id="calSelectedDateText">Today</span>
          </div>
          <button type="button" class="cal-today-pill" id="calCloseBtn" style="color: #475569; border-color: #e2e8f0;">Done</button>
        </div>
      </div>
    `;
  }

  function renderCalendarGrid() {
    const titleEl = document.getElementById('calMonthYearTitle');
    const gridEl = document.getElementById('calDaysGrid');
    const footerTextEl = document.getElementById('calSelectedDateText');
    const weekdaysRow = document.getElementById('calWeekdaysRow');
    if (!titleEl || !gridEl) return;

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    titleEl.textContent = `${monthNames[calCurrentMonth]} ${calCurrentYear}`;

    // Localized weekdays
    if (weekdaysRow) {
      const locale = window.Localization ? window.Localization.getLocale() : undefined;
      const sampleDays = [0, 1, 2, 3, 4, 5, 6].map(d => {
        const dObj = new Date(2026, 8, 20 + d);
        try {
          return new Intl.DateTimeFormat(locale, { weekday: 'narrow' }).format(dObj);
        } catch (e) {
          return ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'][d];
        }
      });
      weekdaysRow.innerHTML = sampleDays.map(name => `<div class="cal-weekday">${name}</div>`).join('');
    }

    if (footerTextEl) {
      if (window.Localization && typeof window.Localization.formatDate === 'function') {
        footerTextEl.textContent = window.Localization.formatDate(calSelectedDate, 'long');
      } else {
        footerTextEl.textContent = calSelectedDate.toLocaleDateString(undefined, {
          weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
        });
      }
    }

    gridEl.innerHTML = '';

    const firstDayIndex = new Date(calCurrentYear, calCurrentMonth, 1).getDay();
    const daysInCurrentMonth = new Date(calCurrentYear, calCurrentMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(calCurrentYear, calCurrentMonth, 0).getDate();

    // Previous month trailing days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'cal-day-cell other-month';
      cell.textContent = dayNum;
      cell.addEventListener('click', () => {
        calCurrentMonth--;
        if (calCurrentMonth < 0) {
          calCurrentMonth = 11;
          calCurrentYear--;
        }
        selectDate(new Date(calCurrentYear, calCurrentMonth, dayNum));
      });
      gridEl.appendChild(cell);
    }

    // Current month days
    const now = new Date();
    const isThisCurrentMonth = now.getFullYear() === calCurrentYear && now.getMonth() === calCurrentMonth;

    for (let day = 1; day <= daysInCurrentMonth; day++) {
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'cal-day-cell';
      cell.textContent = day;

      const isToday = isThisCurrentMonth && day === now.getDate();
      if (isToday) {
        cell.classList.add('today');
      }

      const isSelected = calSelectedDate.getFullYear() === calCurrentYear &&
                         calSelectedDate.getMonth() === calCurrentMonth &&
                         calSelectedDate.getDate() === day;
      if (isSelected) {
        cell.classList.add('selected');
      }

      cell.addEventListener('click', () => {
        selectDate(new Date(calCurrentYear, calCurrentMonth, day));
      });

      gridEl.appendChild(cell);
    }

    // Next month leading days to complete full grid
    const totalRendered = firstDayIndex + daysInCurrentMonth;
    const remainingCells = (7 - (totalRendered % 7)) % 7;
    for (let d = 1; d <= remainingCells; d++) {
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'cal-day-cell other-month';
      cell.textContent = d;
      cell.addEventListener('click', () => {
        calCurrentMonth++;
        if (calCurrentMonth > 11) {
          calCurrentMonth = 0;
          calCurrentYear++;
        }
        selectDate(new Date(calCurrentYear, calCurrentMonth, d));
      });
      gridEl.appendChild(cell);
    }
  }

  function selectDate(dateObj) {
    calSelectedDate = new Date(dateObj);
    calCurrentYear = calSelectedDate.getFullYear();
    calCurrentMonth = calSelectedDate.getMonth();

    renderCalendarGrid();
    updateTopbarDateDisplay(calSelectedDate);

    window.dispatchEvent(new CustomEvent('topbarDateSelected', {
      detail: {
        date: calSelectedDate,
        formatted: window.Localization ? window.Localization.formatDate(calSelectedDate) : calSelectedDate.toDateString()
      }
    }));
  }

  function updateTopbarDateDisplay(dateObj) {
    const textElements = document.querySelectorAll(
      '#topbarDateDisplay, #selectedDateRange, #currentDateDisplay, #dateRangeText, .date-selector span:not(.arrow-down), .topbar-date-text'
    );

    let formatted = '';
    if (window.Localization && typeof window.Localization.formatDate === 'function') {
      formatted = window.Localization.formatDate(dateObj, 'medium');
    } else {
      formatted = dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    }

    textElements.forEach(el => {
      el.textContent = formatted;
    });
  }

  function selectPreset(preset) {
    const now = new Date();
    if (preset === 'today') {
      selectDate(now);
    } else if (preset === 'this-week') {
      const first = new Date(now);
      first.setDate(now.getDate() - now.getDay());
      selectDate(first);
    } else if (preset === 'this-month') {
      selectDate(new Date(now.getFullYear(), now.getMonth(), 1));
      const rangeStr = getDefaultMonthDateRange(now);
      document.querySelectorAll('#topbarDateDisplay, .topbar-date-text').forEach(el => {
        el.textContent = rangeStr;
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Notification Dropdown Implementation
  // ---------------------------------------------------------------------------
  function buildNotificationDropdownHTML() {
    return `
      <div class="topbar-notification-dropdown" id="topbarNotificationDropdown" role="dialog" aria-modal="true" aria-label="Notifications">
        <!-- Header -->
        <div class="notif-header">
          <div class="notif-title-row">
            <h3>Notifications</h3>
            <span class="notif-count-badge" id="notifActiveCountBadge">0 active</span>
          </div>
          <button type="button" class="notif-mark-read-btn" id="notifMarkAllReadBtn">
            <i class="fa-solid fa-check-double"></i> Mark all read
          </button>
        </div>

        <!-- Filter Chips Bar -->
        <div class="notif-filter-bar" id="notifFilterBar">
          <button type="button" class="notif-filter-chip active" data-filter="all">All</button>
          <button type="button" class="notif-filter-chip" data-filter="unread">Unread</button>
          <button type="button" class="notif-filter-chip" data-filter="budget" data-category="budget">Budgets</button>
          <button type="button" class="notif-filter-chip" data-filter="daily" data-category="daily">Daily</button>
          <button type="button" class="notif-filter-chip" data-filter="weekly" data-category="weekly">Weekly</button>
          <button type="button" class="notif-filter-chip" data-filter="savings" data-category="savings">Savings</button>
        </div>

        <!-- Alerts List Container -->
        <div class="notif-list" id="notifItemsList"></div>

        <!-- Footer -->
        <div class="notif-footer">
          <a href="settings.html#notificationsCard" class="notif-settings-link" id="notifSettingsLink">
            <i class="fa-solid fa-sliders"></i> Notification Preferences
          </a>
          <span style="font-size: 0.72rem; color: #94a3b8;">Live App Alerts</span>
        </div>
      </div>
    `;
  }

  function updateFilterChipsVisibility() {
    const chipBudget = document.querySelector('.notif-filter-chip[data-category="budget"]');
    const chipDaily = document.querySelector('.notif-filter-chip[data-category="daily"]');
    const chipWeekly = document.querySelector('.notif-filter-chip[data-category="weekly"]');
    const chipSavings = document.querySelector('.notif-filter-chip[data-category="savings"]');

    if (chipBudget) chipBudget.style.display = userNotificationSettings.notifyBudgetAlerts ? 'inline-block' : 'none';
    if (chipDaily) chipDaily.style.display = userNotificationSettings.notifyDailySummary ? 'inline-block' : 'none';
    if (chipWeekly) chipWeekly.style.display = userNotificationSettings.notifyWeeklyReport ? 'inline-block' : 'none';
    if (chipSavings) chipSavings.style.display = userNotificationSettings.notifySavingsGoals ? 'inline-block' : 'none';
  }

  function updateNotificationBadge() {
    const unreadCount = getActiveUnreadCount();
    const badges = document.querySelectorAll('.notification-badge, #topbarNotificationBadge');
    badges.forEach(b => {
      if (unreadCount > 0) {
        b.style.display = 'inline-flex';
        b.textContent = unreadCount > 9 ? '9+' : unreadCount;
      } else {
        b.style.display = 'none';
      }
    });

    const activeCountBadge = document.getElementById('notifActiveCountBadge');
    if (activeCountBadge) {
      const totalFiltered = getFilteredAlerts().length;
      activeCountBadge.textContent = `${totalFiltered} active`;
    }
  }

  function renderNotificationsDropdown() {
    const listEl = document.getElementById('notifItemsList');
    if (!listEl) return;

    updateFilterChipsVisibility();
    const filtered = getFilteredAlerts();

    const allDisabled = !userNotificationSettings.notifyBudgetAlerts &&
                        !userNotificationSettings.notifyDailySummary &&
                        !userNotificationSettings.notifyWeeklyReport &&
                        !userNotificationSettings.notifySavingsGoals;

    if (allDisabled) {
      listEl.innerHTML = `
        <div class="notif-empty-state">
          <div class="notif-empty-icon"><i class="fa-regular fa-bell-slash"></i></div>
          <div class="notif-empty-title">All Notifications Paused</div>
          <div class="notif-empty-desc">You have disabled Over Budget, Daily Summary, Weekly Report, and Savings alerts in your Settings.</div>
          <a href="settings.html#notificationsCard" class="notif-empty-link">
            <i class="fa-solid fa-gear"></i> Enable in Settings
          </a>
        </div>
      `;
      return;
    }

    if (filtered.length === 0) {
      listEl.innerHTML = `
        <div class="notif-empty-state">
          <div class="notif-empty-icon"><i class="fa-regular fa-circle-check"></i></div>
          <div class="notif-empty-title">All Caught Up!</div>
          <div class="notif-empty-desc">No active alerts matching your enabled notification preferences.</div>
        </div>
      `;
      return;
    }

    listEl.innerHTML = filtered.map(alert => {
      const typeClass = `type-${alert.type}`;
      const unreadClass = alert.read ? '' : 'unread';
      const message = formatAlertMessage(alert);

      const typeLabel = alert.type === 'budget' ? 'Budget'
                      : alert.type === 'daily' ? 'Daily'
                      : alert.type === 'weekly' ? 'Weekly'
                      : 'Savings';

      return `
        <div class="notif-item ${unreadClass}" data-id="${alert.id}">
          <div class="notif-icon-box ${typeClass}">
            <i class="${alert.icon}"></i>
          </div>
          <div class="notif-content">
            <div class="notif-item-top">
              <span class="notif-item-title">${alert.title}</span>
              <span class="notif-item-time">${alert.timeAgo}</span>
            </div>
            <div class="notif-item-msg">${message}</div>
            <div class="notif-item-meta">
              <span class="notif-badge-pill ${typeClass}">${typeLabel}</span>
              ${!alert.read ? '<span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #14806c; margin-left: 2px;" title="Unread"></span>' : ''}
              <button type="button" class="notif-item-dismiss" data-dismiss="${alert.id}" title="Dismiss alert">
                <i class="fa-solid fa-xmark"></i>
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Attach click handlers to items
    listEl.querySelectorAll('.notif-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (e.target.closest('[data-dismiss]')) {
          e.stopPropagation();
          const id = e.target.closest('[data-dismiss]').getAttribute('data-dismiss');
          dismissSingleAlert(id);
          return;
        }

        const id = item.getAttribute('data-id');
        markSingleAlertRead(id);

        const alertObj = rawAlerts.find(a => a.id === id);
        if (alertObj && alertObj.link) {
          window.location.href = alertObj.link;
        }
      });
    });
  }

  // ---------------------------------------------------------------------------
  // Canonical Reusable Global UI Component Builder
  // ---------------------------------------------------------------------------
  const GlobalTopbarComponent = {
    renderHTML: function () {
      const defaultDateRange = getDefaultMonthDateRange();
      return `
        <div class="global-topbar-actions header-actions" id="globalTopbarActions">
          <!-- 1. Interactive Calendar Trigger: [ 📅 Sep 1, 2026 — Sep 30, 2026 ⌵ ] -->
          <div class="calendar-container" id="globalCalendarContainer">
            <button class="topbar-date-btn date-selector" id="topbarCalendarBtn" type="button" title="Interactive Calendar" aria-label="Open Calendar">
              <i class="fa-regular fa-calendar topbar-cal-icon"></i>
              <span class="topbar-date-text" id="topbarDateDisplay">${defaultDateRange}</span>
              <i class="fa-solid fa-chevron-down topbar-chevron-icon arrow-down"></i>
            </button>
          </div>

          <!-- 2. Purely Visual Export Button Placeholder: [ ↓ Export ] -->
          <button class="topbar-export-btn btn-export" id="topbarExportBtn" type="button" title="Export" aria-label="Export">
            <i class="fa-solid fa-arrow-down topbar-export-icon"></i>
            <span>Export</span>
          </button>

          <!-- 3. Filtered Notifications Bell: [ 🔔 ] -->
          <div class="notification-container" id="globalNotificationContainer">
            <button class="topbar-notif-btn notification-icon" id="topbarNotificationBtn" type="button" title="Notifications" aria-label="Notifications">
              <i class="fa-regular fa-bell topbar-bell-icon"></i>
              <span class="notification-badge" id="topbarNotificationBadge" style="display: none;">0</span>
            </button>
          </div>
        </div>
      `;
    },

    mount: function (targetHeader) {
      if (!targetHeader) {
        targetHeader = document.querySelector('.main-content .top-header') || document.querySelector('header.top-header');
      }
      if (!targetHeader) return;

      const existingActions = targetHeader.querySelector('.header-actions, .global-topbar-actions');
      if (existingActions) {
        if (existingActions.classList.contains('global-topbar-actions') && existingActions.dataset.topbarMounted === 'true') {
          return;
        }
        existingActions.outerHTML = this.renderHTML();
      } else {
        targetHeader.insertAdjacentHTML('beforeend', this.renderHTML());
      }
      const mounted = targetHeader.querySelector('.global-topbar-actions');
      if (mounted) {
        mounted.dataset.topbarMounted = 'true';
      }
    }
  };

  // ---------------------------------------------------------------------------
  // Topbar Dropdown Controller Setup & Mounting
  // ---------------------------------------------------------------------------
  function initTopbar() {
    // 1. Mount Unified Component to Main Layout Wrapper
    GlobalTopbarComponent.mount();

    // 2. Ensure Backward Compatibility with Legacy Page-Specific IDs
    const dateSpan = document.getElementById('topbarDateDisplay');
    if (dateSpan) {
      ['dateRangeText', 'selectedDateRange', 'currentDateDisplay'].forEach(aliasId => {
        let aliasSpan = document.getElementById(aliasId);
        if (!aliasSpan) {
          aliasSpan = document.createElement('span');
          aliasSpan.id = aliasId;
          aliasSpan.style.display = 'none';
          aliasSpan.textContent = dateSpan.textContent;
          dateSpan.parentNode.appendChild(aliasSpan);
        }
        try {
          const observer = new MutationObserver(() => {
            if (aliasSpan.textContent && aliasSpan.textContent !== dateSpan.textContent) {
              dateSpan.textContent = aliasSpan.textContent;
            }
          });
          observer.observe(aliasSpan, { childList: true, characterData: true, subtree: true });
        } catch (e) {
          console.warn('MutationObserver not available for topbar alias sync:', e);
        }
      });
    }

    loadStoredSettings();
    loadCachedAlerts();
    initExportPlaceholder();

    // 3. Locate Component Elements
    const dateSelector = document.getElementById('topbarCalendarBtn') || document.querySelector('.date-selector');
    const notifTrigger = document.getElementById('topbarNotificationBtn') || document.querySelector('.notification-icon');
    const calContainer = document.getElementById('globalCalendarContainer') || (dateSelector ? dateSelector.closest('.calendar-container') : null);
    const notifContainer = document.getElementById('globalNotificationContainer') || (notifTrigger ? notifTrigger.closest('.notification-container') : null);
    const headerActions = document.getElementById('globalTopbarActions') || document.querySelector('.header-actions');

    if (!headerActions) return;

    // 4. Inject Calendar Widget if not present
    let calDropdown = document.getElementById('topbarCalendarDropdown');
    if (!calDropdown) {
      const wrapper = document.createElement('div');
      wrapper.innerHTML = buildCalendarWidgetHTML();
      calDropdown = wrapper.firstElementChild;

      if (calContainer) {
        calContainer.appendChild(calDropdown);
      } else {
        headerActions.appendChild(calDropdown);
      }
    }

    // 5. Inject Notification Dropdown if not present
    let notifDropdown = document.getElementById('topbarNotificationDropdown');
    if (!notifDropdown) {
      const wrapper = document.createElement('div');
      wrapper.innerHTML = buildNotificationDropdownHTML();
      notifDropdown = wrapper.firstElementChild;

      if (notifContainer) {
        notifContainer.appendChild(notifDropdown);
      } else {
        headerActions.appendChild(notifDropdown);
      }
    }

    // 6. Calendar Event Listeners
    if (dateSelector) {
      dateSelector.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        const isOpen = calDropdown.classList.contains('open');
        closeAllDropdowns();
        if (!isOpen) {
          calDropdown.classList.add('open');
          dateSelector.classList.add('active');
          renderCalendarGrid();
        }
      });
    }

    const prevMonthBtn = document.getElementById('calPrevMonthBtn');
    const nextMonthBtn = document.getElementById('calNextMonthBtn');
    const todayBtn = document.getElementById('calTodayBtn');
    const calCloseBtn = document.getElementById('calCloseBtn');

    if (prevMonthBtn) {
      prevMonthBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        calCurrentMonth--;
        if (calCurrentMonth < 0) {
          calCurrentMonth = 11;
          calCurrentYear--;
        }
        renderCalendarGrid();
      });
    }

    if (nextMonthBtn) {
      nextMonthBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        calCurrentMonth++;
        if (calCurrentMonth > 11) {
          calCurrentMonth = 0;
          calCurrentYear++;
        }
        renderCalendarGrid();
      });
    }

    if (todayBtn) {
      todayBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        selectPreset('today');
      });
    }

    if (calCloseBtn) {
      calCloseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeAllDropdowns();
      });
    }

    document.querySelectorAll('.cal-preset-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const preset = btn.getAttribute('data-preset');
        selectPreset(preset);
      });
    });

    if (calDropdown) {
      calDropdown.addEventListener('click', (e) => {
        e.stopPropagation();
      });
    }

    // 7. Notification Event Listeners
    if (notifTrigger) {
      notifTrigger.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        const isOpen = notifDropdown.classList.contains('open');
        closeAllDropdowns();
        if (!isOpen) {
          notifDropdown.classList.add('open');
          notifTrigger.classList.add('active');
          renderNotificationsDropdown();
        }
      });
    }

    const markAllReadBtn = document.getElementById('notifMarkAllReadBtn');
    if (markAllReadBtn) {
      markAllReadBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        markAllAlertsRead();
      });
    }

    const filterChips = document.querySelectorAll('.notif-filter-chip');
    filterChips.forEach(chip => {
      chip.addEventListener('click', (e) => {
        e.stopPropagation();
        filterChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        activeNotifFilter = chip.getAttribute('data-filter');
        renderNotificationsDropdown();
      });
    });

    if (notifDropdown) {
      notifDropdown.addEventListener('click', (e) => {
        e.stopPropagation();
      });
    }

    // 8. Global Close Triggers (Outside click & Escape key)
    document.addEventListener('click', () => {
      closeAllDropdowns();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeAllDropdowns();
      }
    });

    function closeAllDropdowns() {
      if (calDropdown) calDropdown.classList.remove('open');
      if (notifDropdown) notifDropdown.classList.remove('open');
      if (dateSelector) dateSelector.classList.remove('active');
      if (notifTrigger) notifTrigger.classList.remove('active');
    }

    // 9. Initialize Badges, Settings, and Actual Application Events
    updateNotificationBadge();
    fetchServerSettings();
    loadApplicationEvents();
    initRealtimeNotifications();

    // 10. Cross-Tab & Cross-Component Synchronization
    window.addEventListener('notificationSettingsChanged', (e) => {
      if (e.detail) {
        userNotificationSettings = Object.assign({}, userNotificationSettings, e.detail);
        localStorage.setItem('userNotificationSettings', JSON.stringify(userNotificationSettings));
        updateFilterChipsVisibility();
        updateNotificationBadge();
        renderNotificationsDropdown();
        loadApplicationEvents(); // Query backend to immediately generate and push alerts matching updated toggles
      }
    });

    window.addEventListener('notificationsReadUpdated', (e) => {
      const readIds = new Set(e.detail || []);
      rawAlerts.forEach(a => {
        a.read = readIds.has(a.id);
      });
      updateNotificationBadge();
      renderNotificationsDropdown();
    });

    window.addEventListener('storage', (e) => {
      if (e.key === 'userNotificationSettings') {
        loadStoredSettings();
        updateFilterChipsVisibility();
        updateNotificationBadge();
        renderNotificationsDropdown();
        loadApplicationEvents();
      } else if (e.key === STORAGE_KEY_READ) {
        const readIds = getReadIds();
        rawAlerts.forEach(a => {
          a.read = readIds.has(a.id);
        });
        updateNotificationBadge();
        renderNotificationsDropdown();
      }
    });

    // Re-render when regional or currency preferences update
    window.addEventListener('localizationChanged', () => {
      const defaultRange = getDefaultMonthDateRange();
      document.querySelectorAll('#topbarDateDisplay, .topbar-date-text').forEach(el => {
        el.textContent = defaultRange;
      });
      renderCalendarGrid();
      renderNotificationsDropdown();
    });

    // Auto-reconnect real-time stream when browser tab regains visibility
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        if (!notifEventSource || notifEventSource.readyState === EventSource.CLOSED) {
          initRealtimeNotifications();
        } else {
          loadApplicationEvents();
        }
      }
    });

    // 11. Real-time Application Event Listeners for Notification Bell
    window.addEventListener('applicationEvent', (e) => {
      if (e.detail) handleApplicationEvent(e.detail);
    });

    window.addEventListener('appEvent', (e) => {
      if (e.detail) handleApplicationEvent(e.detail);
    });

    window.addEventListener('notificationEvent', (e) => {
      if (e.detail) handleApplicationEvent(e.detail);
    });
  }

  // Auto-initialize component when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTopbar);
  } else {
    initTopbar();
  }

  // Global Notification Bell API
  window.handleApplicationEvent = handleApplicationEvent;
  window.checkAndTriggerBudgetAlert = checkAndTriggerBudgetAlert;
  window.NotificationBell = {
    pushEvent: handleApplicationEvent,
    checkBudgetAlert: checkAndTriggerBudgetAlert,
    getAlerts: () => [...rawAlerts],
    getFilteredAlerts: () => getFilteredAlerts(),
    getUnreadCount: () => getActiveUnreadCount(),
    isCategoryEnabled: (cat) => isAlertCategoryEnabled(getCanonicalAlertCategory(cat)),
    updateBadge: updateNotificationBadge,
    renderDropdown: renderNotificationsDropdown,
    markAllRead: markAllAlertsRead,
    markSingleRead: markSingleAlertRead,
    triggerAnimation: triggerBellAnimation
  };

  // Global component namespace export
  window.GlobalTopbarComponent = GlobalTopbarComponent;
  window.GlobalTopbar = {
    component: GlobalTopbarComponent,
    handleApplicationEvent: handleApplicationEvent,
    NotificationBell: window.NotificationBell,
    openCalendar: () => {
      const cal = document.getElementById('topbarCalendarDropdown');
      if (cal) cal.classList.add('open');
    },
    openNotifications: () => {
      const notif = document.getElementById('topbarNotificationDropdown');
      if (notif) notif.classList.add('open');
    },
    updateSettings: (newSettings) => {
      userNotificationSettings = Object.assign({}, userNotificationSettings, newSettings);
      localStorage.setItem('userNotificationSettings', JSON.stringify(userNotificationSettings));
      updateFilterChipsVisibility();
      updateNotificationBadge();
      renderNotificationsDropdown();
    },
    markAllRead: markAllAlertsRead,
    markSingleRead: markSingleAlertRead,
    refreshEvents: loadApplicationEvents,
    reconnectRealtime: initRealtimeNotifications
  };

})();
