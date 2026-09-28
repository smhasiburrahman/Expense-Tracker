// =========================================================================
// SETTINGS ENGINE - FINANCIAL BESTIE (TABBED NAVIGATION)
// =========================================================================

let currentCurrencySymbol = '৳';

document.addEventListener('DOMContentLoaded', async () => {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = 'index.html';
    return;
  }

  // 1. Initialize Tabbed Navigation
  initSettingsNav();

  // 2. Setup Logout Handlers
  initLogout();

  // 3. Fetch Currencies List & User Settings
  await fetchCurrencies();
  await loadUserSettings();

  // 4. Setup Form Submissions (Account & Localization)
  initSettingsForms();

  // 5. Setup Notification Toggles Auto-Save
  initNotificationToggles();

  // 6. Currency Selector Live Symbol Update
  initCurrencyListener();

  // 7. Initialize Global Add Expense Modal
  if (typeof initExpenseModal === 'function') {
    initExpenseModal();
  }
});

// -------------------------------------------------------------------------
// Tabbed Navigation
// -------------------------------------------------------------------------
function initSettingsNav() {
  const navButtons = document.querySelectorAll('.settings-nav-item');
  const tabPanels = document.querySelectorAll('.settings-tab-panel');

  navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTabId = btn.getAttribute('data-tab') || btn.getAttribute('data-target');
      if (!targetTabId) return;

      switchSettingsTab(targetTabId);
    });
  });
}

window.switchSettingsTab = function(targetTabId) {
  const navButtons = document.querySelectorAll('.settings-nav-item');
  const tabPanels = document.querySelectorAll('.settings-tab-panel');

  // Normalize targetTabId
  let panelId = targetTabId;
  if (targetTabId === 'accountCard') panelId = 'panelAccount';
  if (targetTabId === 'localizationCard') panelId = 'panelLocalization';
  if (targetTabId === 'notificationsCard') panelId = 'panelNotifications';
  if (targetTabId === 'sessionCard') panelId = 'panelSession';

  // 1. Update Active Navigation Button
  navButtons.forEach(b => {
    const t = b.getAttribute('data-tab') || b.getAttribute('data-target');
    if (t === panelId || t === targetTabId) {
      b.classList.add('active');
    } else {
      b.classList.remove('active');
    }
  });

  // 2. Render only the matching content panel, hide all other panels
  tabPanels.forEach(panel => {
    if (panel.id === panelId || panel.getAttribute('data-tab') === panelId) {
      panel.classList.add('active');
      panel.style.display = 'block';
    } else {
      panel.classList.remove('active');
      panel.style.display = 'none';
    }
  });

  // 3. Clear transient error alerts on tab switch
  closeSettingsAlert();
};

// -------------------------------------------------------------------------
// Logout Handlers
// -------------------------------------------------------------------------
function initLogout() {
  const sidebarLogoutBtn = document.getElementById('logoutBtn');
  const cardLogoutBtn = document.getElementById('settingsLogoutBtn');

  const performLogout = () => {
    if (window.AuthContext && typeof window.AuthContext.logout === 'function') {
      window.AuthContext.logout();
    } else {
      localStorage.removeItem('token');
      localStorage.removeItem('currentUser');
      localStorage.removeItem('user');
      window.location.href = 'index.html';
    }
  };

  if (sidebarLogoutBtn) {
    sidebarLogoutBtn.addEventListener('click', performLogout);
  }
  if (cardLogoutBtn) {
    cardLogoutBtn.addEventListener('click', () => {
      if (confirm('Are you sure you want to log out of your session?')) {
        performLogout();
      }
    });
  }
}

// -------------------------------------------------------------------------
// Fetch Currencies List
// -------------------------------------------------------------------------
async function fetchCurrencies() {
  const token = localStorage.getItem('token');
  const currencySelect = document.getElementById('preferredCurrency');
  if (!currencySelect) return;

  try {
    const res = await fetch('/api/currencies', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      const currencies = await res.json();
      if (Array.isArray(currencies) && currencies.length > 0) {
        currencySelect.innerHTML = currencies.map(c => 
          `<option value="${c.currencyCode}" data-symbol="${c.symbol}">${c.currencyCode} - ${c.currencyName} (${c.symbol})</option>`
        ).join('');
      }
    }
  } catch (err) {
    console.warn('Could not fetch dynamic currencies, using pre-rendered options:', err);
  }
}

// -------------------------------------------------------------------------
// Load Current User Settings
// -------------------------------------------------------------------------
async function loadUserSettings() {
  const token = localStorage.getItem('token');
  try {
    const res = await fetch('/api/users/me', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (res.status === 401 || res.status === 403) {
      localStorage.removeItem('token');
      window.location.href = 'index.html';
      return;
    }

    if (!res.ok) {
      throw new Error(`Server returned ${res.status}`);
    }

    const user = await res.json();

    // 1. Account Settings Fields
    const nameInput = document.getElementById('profileFullName');
    const emailInput = document.getElementById('profileEmail');
    const incomeInput = document.getElementById('monthlyIncome');
    if (nameInput) nameInput.value = user.fullName || '';
    if (emailInput) emailInput.value = user.email || '';
    if (incomeInput) incomeInput.value = user.monthlyIncome !== null && user.monthlyIncome !== undefined ? user.monthlyIncome : '';

    // 2. Localization Dropdowns
    const currencySelect = document.getElementById('preferredCurrency');
    const regionSelect = document.getElementById('preferredRegion');
    if (currencySelect && user.currencyCode) {
      currencySelect.value = user.currencyCode;
    }
    if (regionSelect && user.region) {
      regionSelect.value = user.region;
    }

    // Sync Global Localization Preferences
    if (window.Localization) {
      const cur = user.currencyCode || (currencySelect ? currencySelect.value : 'BDT');
      const reg = user.region || (regionSelect ? regionSelect.value : 'Bangladesh (Asia/Dhaka)');
      const sym = user.currencySymbol || null;
      window.Localization.setPreferences(cur, reg, sym, false);
      currentCurrencySymbol = window.Localization.getCurrencySymbol();
    } else if (user.currencySymbol) {
      currentCurrencySymbol = user.currencySymbol;
    }

    // Currency Prefix
    const prefixEl = document.getElementById('currencyPrefix');
    if (prefixEl) prefixEl.textContent = currentCurrencySymbol;

    // 3. Notification Toggles
    const toggleBudget = document.getElementById('toggleBudgetAlerts');
    const toggleDaily = document.getElementById('toggleDailySummary');
    const toggleWeekly = document.getElementById('toggleWeeklyReport');
    const toggleSavings = document.getElementById('toggleSavingsGoals');

    if (toggleBudget) toggleBudget.checked = user.notifyBudgetAlerts !== false;
    if (toggleDaily) toggleDaily.checked = user.notifyDailySummary !== false;
    if (toggleWeekly) toggleWeekly.checked = user.notifyWeeklyReport !== false;
    if (toggleSavings) toggleSavings.checked = user.notifySavingsGoals !== false;

    const notifSettings = {
      notifyBudgetAlerts: user.notifyBudgetAlerts !== false,
      notifyDailySummary: user.notifyDailySummary !== false,
      notifyWeeklyReport: user.notifyWeeklyReport !== false,
      notifySavingsGoals: user.notifySavingsGoals !== false
    };
    localStorage.setItem('userNotificationSettings', JSON.stringify(notifSettings));
    window.dispatchEvent(new CustomEvent('notificationSettingsChanged', { detail: notifSettings }));

    // 4. Update Global Session State and Sidebar User Profile Info
    if (window.AuthContext) {
      window.AuthContext.setUser(user);
    } else {
      const userNameEl = document.getElementById('userName');
      const userEmailEl = document.getElementById('userEmail');
      const userAvatarEl = document.getElementById('userAvatar');
      if (userNameEl) userNameEl.textContent = user.fullName || 'User';
      if (userEmailEl) userEmailEl.textContent = user.email || '';
      if (userAvatarEl) userAvatarEl.textContent = user.avatar || (user.fullName ? user.fullName[0].toUpperCase() : 'U');
    }

  } catch (err) {
    console.error('Error loading user settings:', err);
    showSettingsAlert('Could not load settings. Please refresh the page.', 'error');
  }
}

// -------------------------------------------------------------------------
// Live Currency Symbol Listener
// -------------------------------------------------------------------------
function initCurrencyListener() {
  const currencySelect = document.getElementById('preferredCurrency');
  const prefixEl = document.getElementById('currencyPrefix');
  if (!currencySelect || !prefixEl) return;

  const symbolMap = {
    'BDT': '৳', 'USD': '$', 'EUR': '€', 'GBP': '£',
    'CAD': 'C$', 'AUD': 'A$', 'INR': '₹', 'SAR': '﷼',
    'AED': 'د.إ', 'JPY': '¥', 'SGD': 'S$', 'MYR': 'RM'
  };

  currencySelect.addEventListener('change', () => {
    const selectedOpt = currencySelect.options[currencySelect.selectedIndex];
    const dataSymbol = selectedOpt ? selectedOpt.getAttribute('data-symbol') : null;
    const sym = dataSymbol || symbolMap[currencySelect.value] || '$';
    prefixEl.textContent = sym;
    currentCurrencySymbol = sym;
  });

  // Listen for global localization changes
  window.addEventListener('localizationChanged', (e) => {
    const prefs = e.detail;
    if (prefs) {
      if (currencySelect && prefs.currencyCode) currencySelect.value = prefs.currencyCode;
      if (regionSelect && prefs.region) regionSelect.value = prefs.region;
      if (prefixEl && prefs.currencySymbol) prefixEl.textContent = prefs.currencySymbol;
      currentCurrencySymbol = prefs.currencySymbol || currentCurrencySymbol;
    }
  });
}

// -------------------------------------------------------------------------
// Account Settings & Localization Form Handlers
// -------------------------------------------------------------------------
function initSettingsForms() {
  const accountForm = document.getElementById('accountForm');
  const localizationForm = document.getElementById('localizationForm');
  const saveAccountBtn = document.getElementById('saveAccountBtn');
  const saveLocalizationBtn = document.getElementById('saveLocalizationBtn');

  // Submit Helper Function
  async function submitSettingsPayload(btn, statusHintEl) {
    closeSettingsAlert();
    document.querySelectorAll('.settings-input, .settings-select').forEach(el => el.classList.remove('input-error'));

    const nameInput = document.getElementById('profileFullName');
    const emailInput = document.getElementById('profileEmail');
    const incomeInput = document.getElementById('monthlyIncome');
    const currencySelect = document.getElementById('preferredCurrency');
    const regionSelect = document.getElementById('preferredRegion');

    const fullName = nameInput ? nameInput.value.trim() : '';
    const email = emailInput ? emailInput.value.trim() : '';
    const incomeVal = incomeInput ? incomeInput.value.trim() : '';
    const currencyCode = currencySelect ? currencySelect.value : 'BDT';
    const region = regionSelect ? regionSelect.value : 'Bangladesh (Asia/Dhaka)';

    // Validation 1: Required Full Name
    if (!fullName) {
      showSettingsAlert('Full Name is required and cannot be empty.', 'error');
      if (nameInput) {
        nameInput.classList.add('input-error');
        nameInput.focus();
      }
      return false;
    }

    // Validation 2: Required Email Address
    if (!email) {
      showSettingsAlert('Email Address is required and cannot be empty.', 'error');
      if (emailInput) {
        emailInput.classList.add('input-error');
        emailInput.focus();
      }
      return false;
    }

    // Validation 3: Email Format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!emailRegex.test(email)) {
      showSettingsAlert('Please enter a valid email address (e.g. name@domain.com).', 'error');
      if (emailInput) {
        emailInput.classList.add('input-error');
        emailInput.focus();
      }
      return false;
    }

    // Validation 4: Required Monthly Income (non-negative number)
    if (incomeVal === '' || isNaN(incomeVal)) {
      showSettingsAlert('Monthly Income is required and must be a valid number.', 'error');
      if (incomeInput) {
        incomeInput.classList.add('input-error');
        incomeInput.focus();
      }
      return false;
    }

    const incomeNumber = parseFloat(incomeVal);
    if (incomeNumber < 0) {
      showSettingsAlert('Monthly Income cannot be negative.', 'error');
      if (incomeInput) {
        incomeInput.classList.add('input-error');
        incomeInput.focus();
      }
      return false;
    }

    const token = localStorage.getItem('token');
    const payload = {
      fullName,
      email,
      monthlyIncome: incomeNumber,
      currencyCode,
      region
    };

    if (btn) {
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
      btn.disabled = true;
    }

    try {
      const res = await fetch('/api/users/me/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || `Server returned ${res.status}`);
      }

      if (data.token) {
        localStorage.setItem('token', data.token);
      }

      // Update global localization preferences
      const savedCurrency = data.currencyCode || currencyCode;
      const savedRegion = data.region || region;
      const savedSymbol = data.currencySymbol || currentCurrencySymbol;

      if (window.Localization) {
        window.Localization.setPreferences(savedCurrency, savedRegion, savedSymbol, true);
        currentCurrencySymbol = window.Localization.getCurrencySymbol();
      }

      // Update sidebar profile and global session state
      if (window.AuthContext) {
        const currentUser = window.AuthContext.getUser() || {};
        window.AuthContext.setUser({
          ...currentUser,
          fullName: data.fullName || fullName,
          email: data.email || email
        });
      } else {
        const userNameEl = document.getElementById('userName');
        const userEmailEl = document.getElementById('userEmail');
        const userAvatarEl = document.getElementById('userAvatar');
        if (userNameEl) userNameEl.textContent = data.fullName || fullName;
        if (userEmailEl) userEmailEl.textContent = data.email || email;
        if (userAvatarEl) userAvatarEl.textContent = (data.fullName || fullName)[0].toUpperCase();
      }

      showSettingsAlert(data.message || 'Settings updated successfully!', 'success');

      if (statusHintEl) {
        statusHintEl.textContent = `Saved at ${new Date().toLocaleTimeString()}`;
        setTimeout(() => { statusHintEl.textContent = ''; }, 4000);
      }
      return true;

    } catch (err) {
      console.error('Failed to update settings:', err);
      showSettingsAlert(err.message || 'An error occurred while saving changes. Please try again.', 'error');
      return false;
    } finally {
      if (btn) {
        btn.innerHTML = '<i class="fa-solid fa-check"></i> Save Changes';
        btn.disabled = false;
      }
    }
  }

  // 1. Account Settings Form Handler
  if (accountForm) {
    accountForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const hint = document.getElementById('saveAccountStatusHint');
      await submitSettingsPayload(saveAccountBtn, hint);
    });
  }

  // 2. Localization Form Handler
  if (localizationForm) {
    localizationForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const hint = document.getElementById('saveLocalizationStatusHint');
      await submitSettingsPayload(saveLocalizationBtn, hint);
    });
  }

  // 3. Fallback support for any legacy/generic #settingsForm or #saveSettingsBtn
  const legacyForm = document.getElementById('settingsForm');
  if (legacyForm) {
    legacyForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      await submitSettingsPayload(document.getElementById('saveSettingsBtn'), null);
    });
  }
}

// -------------------------------------------------------------------------
// Notifications Toggles Auto-Save Handler
// -------------------------------------------------------------------------
function initNotificationToggles() {
  const toggleBudget = document.getElementById('toggleBudgetAlerts');
  const toggleDaily = document.getElementById('toggleDailySummary');
  const toggleWeekly = document.getElementById('toggleWeeklyReport');
  const toggleSavings = document.getElementById('toggleSavingsGoals');

  const toggles = [toggleBudget, toggleDaily, toggleWeekly, toggleSavings].filter(Boolean);

  let debounceTimer = null;

  toggles.forEach(toggle => {
    toggle.addEventListener('change', async () => {
      const payload = {
        notifyBudgetAlerts: toggleBudget ? toggleBudget.checked : true,
        notifyDailySummary: toggleDaily ? toggleDaily.checked : true,
        notifyWeeklyReport: toggleWeekly ? toggleWeekly.checked : true,
        notifySavingsGoals: toggleSavings ? toggleSavings.checked : true
      };

      const token = localStorage.getItem('token');
      const badge = document.getElementById('notifAutoSaveBadge');

      // Immediately update local storage and broadcast
      localStorage.setItem('userNotificationSettings', JSON.stringify(payload));
      window.dispatchEvent(new CustomEvent('notificationSettingsChanged', { detail: payload }));

      try {
        const res = await fetch('/api/users/me/notifications', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });

        if (!res.ok) {
          throw new Error('Failed to update notification settings.');
        }

        // Show auto-save badge feedback
        if (badge) {
          badge.style.display = 'inline-flex';
          badge.innerHTML = '<i class="fa-solid fa-circle-check"></i> Saved automatically';
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => {
            badge.style.display = 'none';
          }, 2500);
        }

      } catch (err) {
        console.error('Failed to auto-save notification toggle:', err);
        // Revert toggle on error
        toggle.checked = !toggle.checked;
        showSettingsAlert('Could not save notification preference. Please check connection.', 'error');
      }
    });
  });
}

// -------------------------------------------------------------------------
// Global Alert Banner Helper
// -------------------------------------------------------------------------
function showSettingsAlert(message, type) {
  const alertEl = document.getElementById('settingsAlert');
  const msgEl = document.getElementById('settingsAlertMessage');
  const iconEl = document.getElementById('settingsAlertIcon');
  if (!alertEl || !msgEl) return;

  msgEl.textContent = message;
  alertEl.className = `settings-alert alert-${type}`;
  alertEl.style.display = 'flex';

  if (iconEl) {
    iconEl.className = type === 'success' 
      ? 'fa-solid fa-circle-check' 
      : 'fa-solid fa-circle-exclamation';
  }

  alertEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

window.closeSettingsAlert = function () {
  const alertEl = document.getElementById('settingsAlert');
  if (alertEl) {
    alertEl.style.display = 'none';
  }
};