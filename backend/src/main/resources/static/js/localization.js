// =========================================================================
// GLOBAL LOCALIZATION ENGINE - FINANCIAL BESTIE
// Dynamically recalculates and formats monetary amounts, currency symbols,
// and regional dates across every page of the application.
// =========================================================================

(function (window) {
  'use strict';

  // Standard Exchange Rates relative to 1 USD
  const EXCHANGE_RATES = {
    'USD': 1.0,
    'BDT': 120.0,
    'EUR': 0.92,
    'GBP': 0.79,
    'CAD': 1.36,
    'AUD': 1.52,
    'INR': 83.5,
    'SAR': 3.75,
    'AED': 3.67,
    'JPY': 155.0,
    'SGD': 1.35,
    'MYR': 4.70
  };

  // Currency Symbols
  const CURRENCY_SYMBOLS = {
    'BDT': '৳',
    'USD': '$',
    'EUR': '€',
    'GBP': '£',
    'CAD': 'C$',
    'AUD': 'A$',
    'INR': '₹',
    'SAR': '﷼',
    'AED': 'د.إ',
    'JPY': '¥',
    'SGD': 'S$',
    'MYR': 'RM'
  };

  // Region to Locale Configuration
  const REGION_CONFIGS = {
    'Bangladesh (Asia/Dhaka)': {
      locale: 'en-BD',
      timeZone: 'Asia/Dhaka',
      currency: 'BDT'
    },
    'United States (en-US)': {
      locale: 'en-US',
      timeZone: 'America/New_York',
      currency: 'USD'
    },
    'United Kingdom (en-GB)': {
      locale: 'en-GB',
      timeZone: 'Europe/London',
      currency: 'GBP'
    },
    'European Union (en-EU)': {
      locale: 'en-IE',
      timeZone: 'Europe/Paris',
      currency: 'EUR'
    },
    'India (en-IN)': {
      locale: 'en-IN',
      timeZone: 'Asia/Kolkata',
      currency: 'INR'
    },
    'Canada (en-CA)': {
      locale: 'en-CA',
      timeZone: 'America/Toronto',
      currency: 'CAD'
    },
    'Australia (en-AU)': {
      locale: 'en-AU',
      timeZone: 'Australia/Sydney',
      currency: 'AUD'
    },
    'Saudi Arabia (ar-SA)': {
      locale: 'ar-SA',
      timeZone: 'Asia/Riyadh',
      currency: 'SAR'
    },
    'United Arab Emirates (ar-AE)': {
      locale: 'ar-AE',
      timeZone: 'Asia/Dubai',
      currency: 'AED'
    },
    'Singapore (en-SG)': {
      locale: 'en-SG',
      timeZone: 'Asia/Singapore',
      currency: 'SGD'
    },
    'Malaysia (ms-MY)': {
      locale: 'ms-MY',
      timeZone: 'Asia/Kuala_Lumpur',
      currency: 'MYR'
    },
    'Japan (ja-JP)': {
      locale: 'ja-JP',
      timeZone: 'Asia/Tokyo',
      currency: 'JPY'
    },
    'Global (en-US)': {
      locale: 'en-US',
      timeZone: 'UTC',
      currency: 'USD'
    }
  };

  // Default Fallback Preferences
  const DEFAULT_PREFERENCES = {
    currencyCode: 'BDT',
    currencySymbol: '৳',
    region: 'Bangladesh (Asia/Dhaka)',
    locale: 'en-BD'
  };

  class LocalizationService {
    constructor() {
      this.currentPreferences = this.loadPreferencesFromStorage();
      this.syncWithBackend();

      // Listen for cross-tab or in-page storage changes
      window.addEventListener('storage', (e) => {
        if (e.key === 'userLocalization' || e.key === 'preferredCurrency' || e.key === 'preferredRegion') {
          this.currentPreferences = this.loadPreferencesFromStorage();
          this.applyToDOM();
          window.dispatchEvent(new CustomEvent('localizationChanged', { detail: this.currentPreferences }));
        }
      });
    }

    loadPreferencesFromStorage() {
      try {
        const stored = localStorage.getItem('userLocalization');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && parsed.currencyCode) {
            return {
              currencyCode: parsed.currencyCode,
              currencySymbol: parsed.currencySymbol || CURRENCY_SYMBOLS[parsed.currencyCode] || '$',
              region: parsed.region || DEFAULT_PREFERENCES.region,
              locale: parsed.locale || this.getLocaleForRegion(parsed.region)
            };
          }
        }

        // Check standalone keys
        const standaloneCurrency = localStorage.getItem('preferredCurrency');
        const standaloneRegion = localStorage.getItem('preferredRegion');
        if (standaloneCurrency || standaloneRegion) {
          const cur = standaloneCurrency || DEFAULT_PREFERENCES.currencyCode;
          const reg = standaloneRegion || DEFAULT_PREFERENCES.region;
          return {
            currencyCode: cur,
            currencySymbol: CURRENCY_SYMBOLS[cur] || '$',
            region: reg,
            locale: this.getLocaleForRegion(reg)
          };
        }
      } catch (err) {
        console.warn('Localization load error:', err);
      }
      return { ...DEFAULT_PREFERENCES };
    }

    async syncWithBackend() {
      const token = localStorage.getItem('token');
      if (!token) return;

      try {
        const res = await fetch('/api/users/me', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const user = await res.json();
          if (user.currencyCode || user.region) {
            const cur = user.currencyCode || this.currentPreferences.currencyCode;
            const reg = user.region || this.currentPreferences.region;
            const sym = user.currencySymbol || CURRENCY_SYMBOLS[cur] || '$';
            this.setPreferences(cur, reg, sym, false);
          }
        }
      } catch (e) {
        // Use cached preferences if backend is unreachable
      }
    }

    getLocaleForRegion(region) {
      if (REGION_CONFIGS[region]) {
        return REGION_CONFIGS[region].locale;
      }
      return 'en-US';
    }

    getPreferences() {
      return { ...this.currentPreferences };
    }

    getCurrencyCode() {
      return this.currentPreferences.currencyCode;
    }

    getCurrencySymbol() {
      const sym = this.currentPreferences.currencySymbol;
      if (!sym || sym.includes('?')) {
        return CURRENCY_SYMBOLS[this.currentPreferences.currencyCode] || '$';
      }
      return sym;
    }

    getRegion() {
      return this.currentPreferences.region;
    }

    getLocale() {
      return this.currentPreferences.locale;
    }

    // Set and persist new preferences globally
    setPreferences(currencyCode, region, currencySymbol = null, dispatch = true) {
      const cur = currencyCode || 'BDT';
      const reg = region || 'Bangladesh (Asia/Dhaka)';
      const sym = (currencySymbol && !currencySymbol.includes('?')) ? currencySymbol : (CURRENCY_SYMBOLS[cur] || '$');
      const locale = this.getLocaleForRegion(reg);

      this.currentPreferences = {
        currencyCode: cur,
        currencySymbol: sym,
        region: reg,
        locale: locale
      };

      try {
        localStorage.setItem('userLocalization', JSON.stringify(this.currentPreferences));
        localStorage.setItem('preferredCurrency', cur);
        localStorage.setItem('preferredRegion', reg);
        localStorage.setItem('currencySymbol', sym);
      } catch (e) {
        console.warn('LocalStorage save error:', e);
      }

      this.applyToDOM();

      if (dispatch) {
        window.dispatchEvent(new CustomEvent('localizationChanged', { detail: this.currentPreferences }));
      }
    }

    // Convert an amount from source currency (defaults to BDT) to user's preferred currency
    convert(amount, fromCurrency = 'BDT', toCurrency = null) {
      if (amount === null || amount === undefined || isNaN(amount)) return 0;
      const num = parseFloat(amount);
      const targetCur = toCurrency || this.getCurrencyCode();
      const sourceCur = fromCurrency || 'BDT';

      if (sourceCur === targetCur) return num;

      const rateSource = EXCHANGE_RATES[sourceCur] || 1.0;
      const rateTarget = EXCHANGE_RATES[targetCur] || 1.0;

      // Convert from source to USD, then from USD to target
      const inUSD = num / rateSource;
      return inUSD * rateTarget;
    }

    // Format money with dynamic conversion, regional thousands separators and currency symbol
    formatMoney(amount, fromCurrency = 'BDT', options = {}) {
      if (amount === null || amount === undefined || isNaN(amount)) {
        return `${this.getCurrencySymbol()}0.00`;
      }

      const targetCur = options.currencyCode || this.getCurrencyCode();
      const shouldConvert = options.noConvert !== true;
      const finalAmount = shouldConvert ? this.convert(amount, fromCurrency, targetCur) : parseFloat(amount);

      const symbol = options.symbol !== undefined ? options.symbol : (CURRENCY_SYMBOLS[targetCur] || this.getCurrencySymbol());
      const locale = options.locale || this.getLocale();

      const isZeroDecimal = targetCur === 'JPY';
      const minDec = options.minDecimals !== undefined 
        ? options.minDecimals 
        : (options.decimals !== undefined ? options.decimals : (isZeroDecimal ? 0 : 2));
      const maxDec = options.maxDecimals !== undefined 
        ? options.maxDecimals 
        : (options.decimals !== undefined ? options.decimals : (isZeroDecimal ? 0 : 2));

      let numStr;
      try {
        numStr = finalAmount.toLocaleString(locale, {
          minimumFractionDigits: minDec,
          maximumFractionDigits: maxDec
        });
      } catch (e) {
        numStr = finalAmount.toFixed(minDec);
      }

      if (options.noSymbol) {
        return numStr;
      }

      return `${symbol}${numStr}`;
    }

    // Format date string or object according to user's regional locale
    formatDate(dateInput, style = 'medium') {
      if (!dateInput) return '';
      let d;
      if (dateInput instanceof Date) {
        d = dateInput;
      } else if (typeof dateInput === 'string' && dateInput.includes('-') && dateInput.length === 10) {
        // Avoid timezone shift on YYYY-MM-DD
        const parts = dateInput.split('-');
        d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      } else {
        d = new Date(dateInput);
      }

      if (isNaN(d.getTime())) return String(dateInput);

      const locale = this.getLocale();
      try {
        if (style === 'short') {
          return d.toLocaleDateString(locale, { year: 'numeric', month: 'numeric', day: 'numeric' });
        } else if (style === 'long') {
          return d.toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' });
        } else if (style === 'monthYear') {
          return d.toLocaleDateString(locale, { year: 'numeric', month: 'long' });
        } else if (style === 'weekday') {
          return d.toLocaleDateString(locale, { weekday: 'short', month: 'short', day: 'numeric' });
        } else {
          // medium: "Sep 27, 2026" or "27 Sep 2026" based on locale
          return d.toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' });
        }
      } catch (e) {
        return d.toDateString();
      }
    }

    // Format a date range string
    formatDateRange(startDateInput, endDateInput) {
      const startStr = this.formatDate(startDateInput, 'medium');
      const endStr = this.formatDate(endDateInput, 'medium');
      return `${startStr} — ${endStr}`;
    }

    // Apply currency symbol to all DOM elements marked with .currency-symbol or .g-cur-symbol
    applyToDOM() {
      const sym = this.getCurrencySymbol();
      const cur = this.getCurrencyCode();

      document.querySelectorAll('.g-cur-symbol, .currency-symbol, #currencyPrefix, .income-prefix').forEach(el => {
        el.textContent = sym;
      });

      // Update labels with currency in brackets, e.g. AMOUNT (৳) -> AMOUNT ($)
      document.querySelectorAll('label').forEach(lbl => {
        if (lbl.textContent.includes('(৳)')) {
          lbl.textContent = lbl.textContent.replace(/\(৳\)/g, `(${sym})`);
        } else if (/\([$€£₹¥৳]|C\$|A\$|RM|S\$|﷼|د\.إ\)/.test(lbl.textContent)) {
          lbl.textContent = lbl.textContent.replace(/\([$€£₹¥৳]|C\$|A\$|RM|S\$|﷼|د\.إ\)/g, `(${sym})`);
        }
      });

      // Update quick buttons in modals (e.g. +৳500 -> +$4.17 or +$5)
      document.querySelectorAll('.quick-pill-btn, .quick-btn').forEach(btn => {
        const val = btn.getAttribute('data-val');
        if (val) {
          const isZeroDec = cur === 'JPY';
          const formatted = this.formatMoney(parseFloat(val), 'BDT', { decimals: isZeroDec ? 0 : 0 });
          btn.textContent = btn.textContent.trim().startsWith('+') ? `+${formatted}` : formatted;
        }
      });

      // Update dateRangeText headers if they exist and contain default static text
      const dateRangeEl = document.getElementById('dateRangeText');
      if (dateRangeEl && (dateRangeEl.textContent.includes('2025') || dateRangeEl.textContent.includes('Jul 1'))) {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        dateRangeEl.textContent = this.formatDateRange(start, end);
      }

      // Update chat prompt pills if present
      document.querySelectorAll('.chat-pill').forEach(pill => {
        if (pill.textContent.includes('৳5,000') || /Can I afford a .* purchase\?/i.test(pill.textContent)) {
          const formatted = this.formatMoney(5000, 'BDT', { decimals: 0 });
          pill.textContent = `Can I afford a ${formatted} purchase?`;
          pill.setAttribute('onclick', `sendPrompt('Can I afford a ${formatted} purchase?')`);
        }
      });

      const selectedDateRangeEl = document.getElementById('selectedDateRange');
      if (selectedDateRangeEl && (selectedDateRangeEl.textContent.includes('2025') || selectedDateRangeEl.textContent.includes('Jul 1'))) {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        selectedDateRangeEl.textContent = this.formatDateRange(start, end);
      }
    }
  }

  // Instantiate singleton
  const instance = new LocalizationService();

  // Expose globally
  window.Localization = instance;

  // Convenient top-level shortcuts
  window.formatMoney = function (amount, fromCur, opts) {
    return instance.formatMoney(amount, fromCur, opts);
  };
  window.formatDate = function (date, style) {
    return instance.formatDate(date, style);
  };
  window.formatDateRange = function (start, end) {
    return instance.formatDateRange(start, end);
  };

  // Run DOM updates when DOM is ready
  document.addEventListener('DOMContentLoaded', () => {
    instance.applyToDOM();
  });

})(window);
