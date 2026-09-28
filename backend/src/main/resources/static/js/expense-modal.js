// Global self-contained Add Expense modal script
(function () {
  // Category list
  const categories = [
    { name: 'Food & Dining', icon: '🍴' },
    { name: 'Transport', icon: '🚗' },
    { name: 'Groceries', icon: '🛒' },
    { name: 'Shopping', icon: '🛍️' },
    { name: 'Utilities', icon: '⚡' },
    { name: 'Entertainment', icon: '🎬' }
  ];

  // Wallet list
  const wallets = [
    { name: 'bKash', icon: '📱' },
    { name: 'Cash', icon: '💵' },
    { name: 'Rocket', icon: '⚡' },
    { name: 'BRAC Bank', icon: '🏦' }
  ];

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
                  <input type="number" class="g-amount-input" placeholder="0" required min="1" />
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

  // Populate options for select elements
  function fillSelect(el, items) {
    if (!el) return;
    el.innerHTML = items.map(item => `
      <option value="${item.name}">${item.icon} ${item.name}</option>
    `).join('');
  }

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

        const firstRow = rowsWrapper.querySelector('.g-row-item');
        if (firstRow) {
          fillSelect(firstRow.querySelector('.g-cat-select'), categories);
          fillSelect(firstRow.querySelector('.g-wallet-select'), wallets);
        }

        backdrop.style.display = 'flex';
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
        newRow.innerHTML = `
          <div class="g-amount-cat-box">
            <span class="g-cur-symbol">৳</span>
            <input type="number" class="g-amount-input" placeholder="0" required min="1" />
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

        fillSelect(newRow.querySelector('.g-cat-select'), categories);
        fillSelect(newRow.querySelector('.g-wallet-select'), wallets);

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
          const amount = parseFloat(row.querySelector('.g-amount-input').value);
          const categoryId = row.querySelector('.g-cat-select').value;
          const desc = row.querySelector('.g-desc-input').value;
          const walletId = row.querySelector('.g-wallet-select').value;

          transactions.push({
            transactionType: 'EXPENSE',
            amount: amount,
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
                alert('Expense saved successfully!');
                backdrop.style.display = 'none';
                form.reset();
                if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];
                
                // Refresh page or trigger a global event to update UI
                window.location.reload();
            } else {
                alert('Failed to save expense');
            }
        } catch (e) {
            console.error('Error saving transaction:', e);
            alert('Failed to save expense due to error.');
        }
      });
    }
  }

  // Fetch wallets and categories dynamically
  async function fetchRequiredData() {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const [walletRes, catRes] = await Promise.all([
        fetch('/api/wallets', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/categories', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      if (walletRes.ok) {
        const walletData = await walletRes.json();
        wallets.length = 0; // Clear array
        walletData.forEach(w => wallets.push({ id: w.id, name: w.name, icon: w.icon || '📱' }));
      }
      
      if (catRes.ok) {
        const catData = await catRes.json();
        categories.length = 0; // Clear array
        catData.forEach(c => categories.push({ id: c.id, name: c.name, icon: c.icon || '📌' }));
      }
    } catch (e) {
      console.error('Error fetching wallets/categories for modal:', e);
    }
  }

  // Populate options for select elements
  function fillSelect(el, items) {
    if (!el) return;
    el.innerHTML = items.map(item => {
      let iconText = item.icon;
      if (iconText && iconText.startsWith('fa-')) {
          iconText = ''; // Standard <option> tags cannot render HTML/FontAwesome classes
      }
      return `<option value="${item.id}">${iconText ? iconText + ' ' : ''}${item.name}</option>`;
    }).join('');
  }

  // Run setup when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', async () => {
        await fetchRequiredData();
        setupModal();
    });
  } else {
    fetchRequiredData().then(setupModal);
  }
})();