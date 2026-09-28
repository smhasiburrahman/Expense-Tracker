// Global self-contained Add Expense modal script
(function () {
  // Dynamic categories and wallets state
  let categories = [];
  let wallets = [];

  // Helper to map icon names/classes or category names to emojis for standard select options
  function getCategoryEmoji(icon, name) {
    if (!icon && !name) return '📁';
    const str = `${icon || ''} ${name || ''}`.toLowerCase();
    if (str.includes('utensil') || str.includes('food') || str.includes('dining') || str.includes('restaur') || str.includes('eat')) return '🍴';
    if (str.includes('basket') || str.includes('cart') || str.includes('grocer') || str.includes('market')) return '🛒';
    if (str.includes('shopping') || str.includes('bag') || str.includes('cloth') || str.includes('store') || str.includes('shop')) return '🛍️';
    if (str.includes('car') || str.includes('transport') || str.includes('taxi') || str.includes('ride') || str.includes('bus') || str.includes('fuel')) return '🚗';
    if (str.includes('bolt') || str.includes('util') || str.includes('lightbulb') || str.includes('electric') || str.includes('gas') || str.includes('water')) return '⚡';
    if (str.includes('film') || str.includes('movie') || str.includes('cinema') || str.includes('clapperboard') || str.includes('theatre') || str.includes('video')) return '🎬';
    if (str.includes('heart') || str.includes('health') || str.includes('med') || str.includes('doctor') || str.includes('pharmacy')) return '❤️';
    if (str.includes('mug') || str.includes('coffee') || str.includes('tea') || str.includes('cafe')) return '☕';
    if (str.includes('book') || str.includes('grad') || str.includes('edu') || str.includes('school') || str.includes('study')) return '📚';
    if (str.includes('home') || str.includes('house') || str.includes('rent')) return '🏠';
    if (str.includes('plane') || str.includes('travel') || str.includes('flight') || str.includes('tour')) return '✈️';
    if (str.includes('game') || str.includes('play') || str.includes('esport')) return '🎮';
    if (str.includes('bill') || str.includes('money') || str.includes('cash')) return '💵';
    if (str.includes('phone') || str.includes('mobile') || str.includes('tel')) return '📱';
    if (str.includes('gift') || str.includes('charity')) return '🎁';
    if (icon && !icon.startsWith('fa-') && icon.length <= 4) return icon;
    return '📌';
  }

  // Inject required modal styles directly into document head
  function injectModalStyles() {
    if (document.getElementById('injected-expense-modal-styles')) return;

    const styleEl = document.createElement('style');
    styleEl.id = 'injected-expense-modal-styles';
    styleEl.textContent = `
      .g-modal-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(15, 23, 42, 0.45);
        backdrop-filter: blur(2px);
        display: none;
        align-items: center;
        justify-content: center;
        z-index: 999999;
      }
      .g-modal-card {
        background: #ffffff;
        width: 680px;
        max-width: 92%;
        border-radius: 16px;
        padding: 1.8rem;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.15);
        font-family: 'Inter', sans-serif;
      }
      .g-modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1.2rem;
      }
      .g-modal-title {
        font-size: 1.2rem;
        font-weight: 700;
        color: #0f172a;
        margin: 0;
      }
      .g-btn-close {
        background: none;
        border: none;
        font-size: 1.5rem;
        color: #94a3b8;
        cursor: pointer;
        line-height: 1;
      }
      .g-btn-close:hover { color: #475569; }
      .g-tab-bar {
        display: flex;
        background: #f1f5f9;
        border-radius: 25px;
        padding: 4px;
        margin-bottom: 1.2rem;
      }
      .g-tab-btn {
        flex: 1;
        background: transparent;
        border: none;
        padding: 8px 12px;
        border-radius: 20px;
        font-size: 0.85rem;
        font-weight: 600;
        color: #64748b;
        cursor: pointer;
      }
      .g-tab-btn.active {
        background: #ffffff;
        color: #0f172a;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
      }
      .g-date-row {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 1.2rem;
      }
      .g-date-label {
        font-size: 0.72rem;
        font-weight: 700;
        color: #94a3b8;
        letter-spacing: 0.5px;
      }
      .g-date-pill {
        border: 1px solid #e2e8f0;
        border-radius: 20px;
        padding: 4px 14px;
        background: #ffffff;
      }
      .g-date-pill input {
        border: none;
        outline: none;
        font-size: 0.85rem;
        font-weight: 600;
        color: #334155;
      }
      .g-headers-row {
        display: grid;
        grid-template-columns: 240px 1fr 140px;
        gap: 12px;
        font-size: 0.72rem;
        font-weight: 700;
        color: #94a3b8;
        letter-spacing: 0.5px;
        margin-bottom: 8px;
      }
      .g-rows-container {
        display: flex;
        flex-direction: column;
        gap: 10px;
        margin-bottom: 1.2rem;
      }
      .g-row-item {
        display: grid;
        grid-template-columns: 240px 1fr 140px;
        gap: 12px;
        align-items: center;
      }
      .g-amount-cat-box {
        display: flex;
        align-items: center;
        border: 1.5px solid #e2e8f0;
        border-radius: 10px;
        padding: 6px 10px;
        background: #ffffff;
      }
      .g-amount-cat-box:focus-within {
        border-color: #14806c;
      }
      .g-cur-symbol {
        font-size: 0.95rem;
        font-weight: 600;
        color: #94a3b8;
        margin-right: 4px;
      }
      .g-amount-input {
        width: 60px;
        border: none;
        outline: none;
        font-size: 0.95rem;
        font-weight: 700;
        color: #0f172a;
      }
      .g-cat-wrap {
        flex: 1;
        border-left: 1px solid #e2e8f0;
        padding-left: 8px;
        margin-left: 4px;
      }
      .g-cat-select {
        width: 100%;
        border: none;
        outline: none;
        background: transparent;
        font-size: 0.82rem;
        font-weight: 600;
        color: #d97706;
        cursor: pointer;
      }
      .g-desc-input {
        width: 100%;
        border: 1.5px solid #e2e8f0;
        border-radius: 10px;
        padding: 9px 12px;
        font-size: 0.85rem;
        outline: none;
        color: #0f172a;
        box-sizing: border-box;
      }
      .g-desc-input:focus {
        border-color: #14806c;
      }
      .g-wallet-box {
        border: 1.5px solid #2dd4bf;
        border-radius: 10px;
        padding: 8px 10px;
        background: #ffffff;
      }
      .g-wallet-select {
        width: 100%;
        border: none;
        outline: none;
        background: transparent;
        font-size: 0.85rem;
        font-weight: 600;
        color: #0f172a;
        cursor: pointer;
      }
      .g-btn-add-row {
        background: none;
        border: none;
        color: #14806c;
        font-size: 0.85rem;
        font-weight: 700;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 4px 0;
        margin-bottom: 1.5rem;
      }
      .g-btn-add-row:hover { color: #0f6152; }
      .g-modal-footer {
        border-top: 1px solid #f1f5f9;
        padding-top: 1.2rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .g-btn-cancel {
        background: transparent;
        border: none;
        font-size: 0.88rem;
        font-weight: 600;
        color: #64748b;
        cursor: pointer;
      }
      .g-btn-cancel:hover { color: #0f172a; }
      .g-btn-save {
        background: #14806c;
        color: #ffffff;
        border: none;
        border-radius: 10px;
        padding: 10px 24px;
        font-size: 0.88rem;
        font-weight: 700;
        cursor: pointer;
        transition: 0.2s;
      }
      .g-btn-save:hover { background: #106c5b; }
      @media (max-width: 768px) {
        .g-row-item { grid-template-columns: 1fr; }
        .g-headers-row { display: none; }
      }
    `;
    document.head.appendChild(styleEl);
  }

  // Inject modal HTML into DOM
  function injectModalHTML() {
    if (document.getElementById('globalAddExpenseBackdrop')) return;

    const modalMarkup = `
      <div class="g-modal-backdrop" id="globalAddExpenseBackdrop">
        <div class="g-modal-card">
          <div class="g-modal-header">
            <h3 class="g-modal-title">Add Expense</h3>
            <button type="button" class="g-btn-close" id="closeGlobalExpenseBtn">&times;</button>
          </div>

          <div class="g-tab-bar">
            <button type="button" class="g-tab-btn active">Manual Entry</button>
            <button type="button" class="g-tab-btn">Quick AI</button>
            <button type="button" class="g-tab-btn">Scan Receipt</button>
          </div>

          <div class="g-date-row">
            <span class="g-date-label">DATE</span>
            <div class="g-date-pill">
              <input type="date" id="globalExpenseDateInput" />
            </div>
          </div>

          <form id="globalExpenseForm">
            <div class="g-headers-row">
              <span>AMOUNT & CATEGORY</span>
              <span>DESCRIPTION</span>
              <span>WALLET</span>
            </div>

            <div class="g-rows-container" id="globalExpenseRowsWrapper">
              <div class="g-row-item">
                <div class="g-amount-cat-box">
                  <span class="g-cur-symbol">৳</span>
                  <input type="number" class="g-amount-input" placeholder="0" required min="1" step="any" />
                  <div class="g-cat-wrap">
                    <select class="g-cat-select" required></select>
                  </div>
                </div>

                <div>
                  <input type="text" class="g-desc-input" placeholder="e.g. Lunch, Rickshaw..." required />
                </div>

                <div class="g-wallet-box">
                  <select class="g-wallet-select" required></select>
                </div>
              </div>
            </div>

            <button type="button" class="g-btn-add-row" id="addAnotherExpenseRowBtn">
              + Add another expense
            </button>

            <div class="g-modal-footer">
              <button type="button" class="g-btn-cancel" id="cancelGlobalExpenseBtn">Cancel</button>
              <button type="submit" class="g-btn-save">Save Expense</button>
            </div>
          </form>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalMarkup);
  }

  // Populate options for select elements dynamically
  function fillSelect(el, items, type = 'category') {
    if (!el) return;
    const currentVal = el.value;

    if (type === 'category') {
      const sourceList = (items && items.length > 0) ? items : ((window.categoriesData && window.categoriesData.length > 0) ? window.categoriesData : categories);
      if (!sourceList || sourceList.length === 0) {
        el.innerHTML = '<option value="">-- No Categories Found --</option>';
        return;
      }

      el.innerHTML = sourceList.map(item => {
        const emoji = getCategoryEmoji(item.icon, item.name);
        return `<option value="${item.id}" data-name="${item.name}">${emoji} ${item.name}</option>`;
      }).join('');
    } else {
      const sourceList = (items && items.length > 0) ? items : ((window.walletsData && window.walletsData.length > 0) ? window.walletsData : wallets);
      if (!sourceList || sourceList.length === 0) {
        el.innerHTML = '<option value="">-- No Wallets Found --</option>';
        return;
      }

      el.innerHTML = sourceList.map(item => {
        let iconText = item.icon || '📱';
        if (iconText.startsWith('fa-')) iconText = '📱';
        return `<option value="${item.id}">${iconText} ${item.name}</option>`;
      }).join('');
    }

    // Preserve existing selection if valid in new options
    if (currentVal && Array.from(el.options).some(o => String(o.value) === String(currentVal))) {
      el.value = currentVal;
    }
  }

  // Re-render all category dropdowns in all modal rows
  function renderAllCategoryDropdowns() {
    const rowsWrapper = document.getElementById('globalExpenseRowsWrapper');
    if (!rowsWrapper) return;
    const catSelects = rowsWrapper.querySelectorAll('.g-cat-select');
    catSelects.forEach(select => {
      fillSelect(select, categories, 'category');
    });
  }

  // Re-render all wallet dropdowns in all modal rows
  function renderAllWalletDropdowns() {
    const rowsWrapper = document.getElementById('globalExpenseRowsWrapper');
    if (!rowsWrapper) return;
    const walletSelects = rowsWrapper.querySelectorAll('.g-wallet-select');
    walletSelects.forEach(select => {
      fillSelect(select, wallets, 'wallet');
    });
  }

  // Fetch wallets and categories dynamically from database / global state
  async function fetchRequiredData() {
    const token = localStorage.getItem('token');

    // Check if global state already available
    if (window.categoriesData && Array.isArray(window.categoriesData) && window.categoriesData.length > 0) {
      categories = window.categoriesData.map(c => ({
        id: c.id,
        name: c.name,
        icon: c.icon || '📌',
        color: c.color || '#f59e0b',
        cap: parseFloat(c.cap) || 0,
        spent: parseFloat(c.spent) || 0
      }));
      window.globalCategories = categories;
    }

    if (!token) return;

    try {
      const [walletRes, catRes] = await Promise.all([
        fetch('/api/wallets', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/categories', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      if (walletRes.ok) {
        const walletData = await walletRes.json();
        wallets = (walletData || []).map(w => ({
          id: w.id,
          name: w.name,
          icon: w.icon || '📱',
          balance: parseFloat(w.currentBalance || 0)
        }));
        window.walletsData = wallets;
      }
      
      if (catRes.ok) {
        const catData = await catRes.json();
        categories = (catData || []).map(c => ({
          id: c.id,
          name: c.name,
          icon: c.icon || '📌',
          color: c.color || '#f59e0b',
          cap: parseFloat(c.cap) || 0,
          spent: parseFloat(c.spent) || 0
        }));
        window.categoriesData = categories;
        window.globalCategories = categories;
      }
    } catch (e) {
      console.error('Error fetching wallets/categories for modal:', e);
    }
  }

  // Global function to trigger dynamic re-fetching and re-rendering of modal category dropdowns
  async function refreshExpenseModalCategories() {
    await fetchRequiredData();
    renderAllCategoryDropdowns();
    renderAllWalletDropdowns();
  }
  window.refreshExpenseModalCategories = refreshExpenseModalCategories;

  // Initialize modal functionality
  function setupModal() {
    injectModalStyles();
    injectModalHTML();

    const backdrop = document.getElementById('globalAddExpenseBackdrop');
    const form = document.getElementById('globalExpenseForm');
    const rowsWrapper = document.getElementById('globalExpenseRowsWrapper');
    const dateInput = document.getElementById('globalExpenseDateInput');

    // Set today date
    if (dateInput) {
      dateInput.value = new Date().toISOString().split('T')[0];
    }

    // Populate initial row
    renderAllCategoryDropdowns();
    renderAllWalletDropdowns();

    // Handle all click events globally
    document.addEventListener('click', function (e) {
      const openBtn = e.target.closest('#addExpenseBtn');
      const closeBtn = e.target.closest('#closeGlobalExpenseBtn');
      const cancelBtn = e.target.closest('#cancelGlobalExpenseBtn');
      const addRowBtn = e.target.closest('#addAnotherExpenseRowBtn');

      // Open modal
      if (openBtn) {
        e.preventDefault();
        e.stopPropagation();

        // Immediately render with current cached categories/wallets
        renderAllCategoryDropdowns();
        renderAllWalletDropdowns();

        backdrop.style.display = 'flex';

        // Simultaneously re-fetch from database to guarantee the absolute latest categories
        fetchRequiredData().then(() => {
          renderAllCategoryDropdowns();
          renderAllWalletDropdowns();
        });
      }

      // Close modal
      if (closeBtn || cancelBtn || e.target === backdrop) {
        e.preventDefault();
        backdrop.style.display = 'none';
      }

      // Append new row
      if (addRowBtn) {
        e.preventDefault();
        const newRow = document.createElement('div');
        newRow.className = 'g-row-item';
        const sym = window.Localization ? window.Localization.getCurrencySymbol() : '৳';
        newRow.innerHTML = `
          <div class="g-amount-cat-box">
            <span class="g-cur-symbol">${sym}</span>
            <input type="number" class="g-amount-input" placeholder="0" required min="1" step="any" />
            <div class="g-cat-wrap">
              <select class="g-cat-select" required></select>
            </div>
          </div>

          <div>
            <input type="text" class="g-desc-input" placeholder="e.g. Lunch, Rickshaw..." required />
          </div>

          <div class="g-wallet-box">
            <select class="g-wallet-select" required></select>
          </div>
        `;

        fillSelect(newRow.querySelector('.g-cat-select'), categories, 'category');
        fillSelect(newRow.querySelector('.g-wallet-select'), wallets, 'wallet');

        rowsWrapper.appendChild(newRow);
      }
    });

    // Handle form submit
    if (form) {
      form.addEventListener('submit', async function (e) {
        e.preventDefault();

        const rows = rowsWrapper.querySelectorAll('.g-row-item');
        const transactions = [];

        rows.forEach(row => {
          const enteredAmount = parseFloat(row.querySelector('.g-amount-input').value);
          const currentCur = window.Localization ? window.Localization.getCurrencyCode() : 'BDT';
          const amountInBDT = window.Localization ? window.Localization.convert(enteredAmount, currentCur, 'BDT') : enteredAmount;
          const catSelect = row.querySelector('.g-cat-select');
          const categoryId = catSelect.value ? parseInt(catSelect.value, 10) : null;
          const desc = row.querySelector('.g-desc-input').value;
          const walletSelect = row.querySelector('.g-wallet-select');
          const walletId = walletSelect.value ? parseInt(walletSelect.value, 10) : null;

          transactions.push({
            transactionType: 'EXPENSE',
            amount: amountInBDT,
            categoryId: categoryId,
            description: desc,
            walletId: walletId,
            transactionDate: dateInput ? dateInput.value : new Date().toISOString().split('T')[0]
          });
        });

        const token = localStorage.getItem('token');
        try {
            const res = await fetch('/api/transactions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(transactions)
            });

            if (res.ok) {
                if (window.showToast) {
                  showToast('Expense saved successfully!', 'success');
                } else {
                  alert('Expense saved successfully!');
                }
                backdrop.style.display = 'none';
                form.reset();
                if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];

                // Calculate total spent and identify category
                const totalSpent = transactions.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
                const firstDesc = (transactions[0] && transactions[0].description) || 'Expense recorded';
                const firstCat = categories.find(c => Number(c.id) === Number(transactions[0] && transactions[0].categoryId));
                const catName = firstCat ? firstCat.name : 'Expenses';
                const formattedTotal = window.Localization ? window.Localization.formatMoney(totalSpent, 'BDT') : `৳${totalSpent.toLocaleString()}`;

                // Trigger real-time application event for the notification bell component
                const appEvent = {
                  type: 'daily',
                  category: catName,
                  title: transactions.length > 1 ? `${transactions.length} Expenses Recorded` : `Expense: ${catName}`,
                  message: `Logged ${formattedTotal} for "${firstDesc}".`,
                  amountBDT: totalSpent,
                  severity: 'info',
                  link: 'dashboard.html'
                };

                if (window.handleApplicationEvent) {
                  window.handleApplicationEvent(appEvent);
                } else {
                  window.dispatchEvent(new CustomEvent('applicationEvent', { detail: appEvent }));
                }

                // Check category budget caps and trigger Over Budget alerts if spending cap is exceeded
                const affectedCatIds = [...new Set(transactions.map(t => Number(t.categoryId)).filter(Boolean))];
                if (window.checkAndTriggerBudgetAlert) {
                  await window.checkAndTriggerBudgetAlert(affectedCatIds);
                } else {
                  try {
                    const catRes = await fetch('/api/categories', { headers: { 'Authorization': `Bearer ${token}` } });
                    if (catRes.ok) {
                      const updatedCategories = await catRes.json();
                      categories = updatedCategories.map(c => ({
                        id: c.id,
                        name: c.name,
                        icon: c.icon || '📌',
                        color: c.color || '#f59e0b',
                        cap: parseFloat(c.cap) || 0,
                        spent: parseFloat(c.spent) || 0
                      }));
                      window.categoriesData = categories;

                      for (const catId of affectedCatIds) {
                        const cat = updatedCategories.find(c => Number(c.id) === catId);
                        if (cat) {
                          const spent = parseFloat(cat.spent) || 0;
                          const cap = parseFloat(cat.cap) || 0;
                          const percent = cap > 0 ? Math.round((spent / cap) * 100) : 0;
                          if (cap > 0 && (spent > cap || percent >= 100)) {
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
                        }
                      }
                    }
                  } catch (err) {
                    console.error('Error verifying budget caps after expense creation:', err);
                  }
                }

                window.dispatchEvent(new CustomEvent('transactionCreated', { detail: transactions }));

                // Dynamically refresh active page content without manual reload or navigation
                if (typeof fetchDashboardData === 'function') {
                  fetchDashboardData().then(() => {
                    if (typeof renderOverviewMetrics === 'function') renderOverviewMetrics();
                    if (typeof renderWalletsList === 'function') renderWalletsList();
                    if (typeof renderBudgetCategories === 'function') renderBudgetCategories();
                    if (typeof renderTransactionsTable === 'function') renderTransactionsTable();
                  });
                }
                if (typeof fetchWalletsData === 'function') {
                  fetchWalletsData().then(() => {
                    if (typeof renderWallets === 'function') renderWallets();
                  });
                }
                if (typeof fetchBudgetsData === 'function') {
                  fetchBudgetsData().then(() => {
                    if (typeof renderBudgetsUI === 'function') renderBudgetsUI();
                  });
                }
                if (typeof fetchTransactions === 'function') {
                  fetchTransactions();
                }
                if (typeof fetchVaults === 'function') {
                  fetchVaults().then(() => {
                    if (typeof renderVaults === 'function') renderVaults();
                  });
                }
                if (typeof fetchCharityData === 'function') {
                  fetchCharityData().then(() => {
                    if (typeof updateCharityUI === 'function') updateCharityUI();
                  });
                }
            } else {
                let errorMsg = 'Failed to save expense. Please check inputs.';
                try {
                  const errorData = await res.json();
                  if (errorData && errorData.message) {
                    errorMsg = errorData.message;
                  }
                } catch (ignored) {}
                if (window.showToast) {
                  showToast(errorMsg, 'error');
                } else {
                  alert(errorMsg);
                }
            }
        } catch (e) {
            console.error('Error saving transaction:', e);
            if (window.showToast) {
              showToast('Failed to save expense due to error.', 'error');
            } else {
              alert('Failed to save expense due to error.');
            }
        }
      });
    }
  }

  // Listen to system-wide category update events
  window.addEventListener('categoryCreated', async () => {
    await refreshExpenseModalCategories();
  });
  window.addEventListener('categoriesUpdated', async () => {
    await refreshExpenseModalCategories();
  });
  window.addEventListener('categoryAdded', async () => {
    await refreshExpenseModalCategories();
  });

  // Run setup when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', async () => {
        await fetchRequiredData();
        setupModal();
        if (window.Localization) window.Localization.applyToDOM();
    });
  } else {
    fetchRequiredData().then(() => {
      setupModal();
      if (window.Localization) window.Localization.applyToDOM();
    });
  }

  // Listen for global localization changes
  window.addEventListener('localizationChanged', () => {
    if (window.Localization) window.Localization.applyToDOM();
  });
})();