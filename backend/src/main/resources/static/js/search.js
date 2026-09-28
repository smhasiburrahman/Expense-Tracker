// Universal Search Engine for Financial Bestie

let currentSearchResponse = {
  transactions: [],
  categories: [],
  wallets: [],
  totalMatches: 0,
  query: ''
};

let activeTab = 'all';
let debounceTimeout = null;

// Modal helper
function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.add('active');
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove('active');
}

// Global closeModal for onclick in HTML
window.closeModal = closeModal;

document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = 'index.html';
    return;
  }

  // Hook Logout
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      if (window.AuthContext && typeof window.AuthContext.logout === 'function') {
        window.AuthContext.logout();
      } else {
        localStorage.removeItem('token');
        localStorage.removeItem('currentUser');
        localStorage.removeItem('user');
        window.location.href = 'index.html';
      }
    });
  }

  // Elements
  const searchInput = document.getElementById('searchInput');
  const clearSearchBtn = document.getElementById('clearSearchBtn');
  const emptyClearBtn = document.getElementById('emptyClearBtn');

  // Tab buttons
  const tabButtons = document.querySelectorAll('.search-tab-btn');
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      tabButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeTab = btn.getAttribute('data-tab');
      renderResults();
    });
  });

  // Modal backdrop click to close
  document.querySelectorAll('.detail-modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.classList.remove('active');
      }
    });
  });

  // Escape key to close modals
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.detail-modal-overlay.active').forEach(overlay => {
        overlay.classList.remove('active');
      });
    }
  });

  // Search input handler with debouncing
  searchInput.addEventListener('input', (e) => {
    const val = e.target.value;
    clearSearchBtn.style.display = val.length > 0 ? 'flex' : 'none';
    
    if (debounceTimeout) clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => {
      fetchSearchResults(val);
    }, 200);
  });

  clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    clearSearchBtn.style.display = 'none';
    fetchSearchResults('');
    searchInput.focus();
  });

  if (emptyClearBtn) {
    emptyClearBtn.addEventListener('click', () => {
      searchInput.value = '';
      clearSearchBtn.style.display = 'none';
      fetchSearchResults('');
    });
  }

  // Initial load
  fetchSearchResults('');
});

// Fetch search results from Backend
async function fetchSearchResults(query) {
  const token = localStorage.getItem('token');
  const resultsCount = document.getElementById('resultsCount');
  if (resultsCount) resultsCount.textContent = 'Searching...';

  try {
    const url = `/api/search?q=${encodeURIComponent(query || '')}`;
    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (res.status === 401 || res.status === 403) {
      window.location.href = 'index.html';
      return;
    }

    if (!res.ok) {
      throw new Error(`Server returned ${res.status}`);
    }

    currentSearchResponse = await res.json();
    renderResults();
  } catch (err) {
    console.error('Search request failed:', err);
    if (resultsCount) resultsCount.textContent = 'Failed to load search results.';
  }
}

// Render all search results
function renderResults() {
  const query = (document.getElementById('searchInput')?.value || '').trim();

  const txs = currentSearchResponse.transactions || [];
  const cats = currentSearchResponse.categories || [];
  const wallets = currentSearchResponse.wallets || [];

  // Update Tab Counts
  document.getElementById('countTransactions').textContent = txs.length;
  document.getElementById('countCategories').textContent = cats.length;
  document.getElementById('countWallets').textContent = wallets.length;
  document.getElementById('countAll').textContent = txs.length + cats.length + wallets.length;

  document.getElementById('sectionCountTransactions').textContent = txs.length;
  document.getElementById('sectionCountCategories').textContent = cats.length;
  document.getElementById('sectionCountWallets').textContent = wallets.length;

  // Sections visibility based on active tab and count
  const walletsSection = document.getElementById('walletsSection');
  const categoriesSection = document.getElementById('categoriesSection');
  const transactionsSection = document.getElementById('transactionsSection');
  const emptySearchState = document.getElementById('emptySearchState');
  const searchMeta = document.getElementById('searchMeta');
  const resultsTotalContainer = document.getElementById('resultsTotalContainer');

  const showWallets = (activeTab === 'all' || activeTab === 'wallets') && wallets.length > 0;
  const showCats = (activeTab === 'all' || activeTab === 'categories') && cats.length > 0;
  const showTxs = (activeTab === 'all' || activeTab === 'transactions') && txs.length > 0;

  walletsSection.style.display = showWallets ? 'block' : 'none';
  categoriesSection.style.display = showCats ? 'block' : 'none';
  transactionsSection.style.display = showTxs ? 'block' : 'none';

  // Calculate total transaction sum
  const txSum = txs.reduce((acc, t) => acc + (parseFloat(t.amount) || 0), 0);
  if (resultsTotalContainer) {
    if (txs.length > 0) {
      resultsTotalContainer.style.display = 'inline';
      document.getElementById('resultsTotal').textContent = window.Localization 
        ? window.Localization.formatMoney(txSum, 'BDT') 
        : `৳${txSum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    } else {
      resultsTotalContainer.style.display = 'none';
    }
  }

  // Empty state check
  let hasAnyResult = false;
  if (activeTab === 'all') hasAnyResult = (txs.length + cats.length + wallets.length) > 0;
  else if (activeTab === 'transactions') hasAnyResult = txs.length > 0;
  else if (activeTab === 'categories') hasAnyResult = cats.length > 0;
  else if (activeTab === 'wallets') hasAnyResult = wallets.length > 0;

  if (!hasAnyResult) {
    emptySearchState.style.display = 'block';
    const emptyDesc = document.getElementById('emptySearchDesc');
    if (query) {
      emptyDesc.innerHTML = `We couldn't find any results matching "<strong>${escapeHtml(query)}</strong>" in the selected tab.`;
    } else {
      emptyDesc.textContent = 'No matching records found with the applied filters.';
    }
    document.getElementById('resultsCount').textContent = '0 results found';
  } else {
    emptySearchState.style.display = 'none';
    let totalVisible = 0;
    if (activeTab === 'all') totalVisible = txs.length + cats.length + wallets.length;
    else if (activeTab === 'transactions') totalVisible = txs.length;
    else if (activeTab === 'categories') totalVisible = cats.length;
    else if (activeTab === 'wallets') totalVisible = wallets.length;

    document.getElementById('resultsCount').textContent = query
      ? `${totalVisible} matching result${totalVisible === 1 ? '' : 's'} for "${query}"`
      : `${totalVisible} record${totalVisible === 1 ? '' : 's'} found`;
  }

  // Render Section Contents
  if (showWallets) renderWalletsGrid(wallets);
  if (showCats) renderCategoriesGrid(cats);
  if (showTxs) renderTransactionsTable(txs);
}

// Render Wallets
function renderWalletsGrid(wallets) {
  const container = document.getElementById('walletsGrid');
  if (!container) return;

  container.innerHTML = wallets.map(w => {
    const iconColor = w.colorHex || '#2563eb';
    const iconClass = w.icon ? (w.icon.startsWith('fa-') ? w.icon : `fa-${w.icon}`) : 'fa-wallet';
    const balance = parseFloat(w.currentBalance || 0);
    const formattedBal = window.Localization ? window.Localization.formatMoney(balance, 'BDT') : `৳${balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const formattedOpening = window.Localization ? window.Localization.formatMoney(parseFloat(w.openingBalance || 0), 'BDT') : `৳${parseFloat(w.openingBalance || 0).toLocaleString()}`;

    return `
      <div class="search-wallet-card" onclick="openWalletModal(${w.id})">
        <div class="search-wallet-icon" style="background-color: ${iconColor}18; color: ${iconColor};">
          <i class="fa-solid ${iconClass}"></i>
        </div>
        <div class="search-wallet-info">
          <div class="search-wallet-name">${escapeHtml(w.name)}</div>
          <div class="search-wallet-balance">${formattedBal}</div>
          <div style="font-size: 0.78rem; color: #94a3b8; margin-top: 2px;">
            Opening: ${formattedOpening}
          </div>
        </div>
        <div class="search-wallet-action" title="View Wallet Details">
          <i class="fa-solid fa-arrow-up-right-from-square"></i>
        </div>
      </div>
    `;
  }).join('');
}

// Render Categories
function renderCategoriesGrid(categories) {
  const container = document.getElementById('categoriesGrid');
  if (!container) return;

  container.innerHTML = categories.map(c => {
    const catColor = c.colorHex || '#10b981';
    const iconClass = c.icon ? (c.icon.startsWith('fa-') ? c.icon : `fa-${c.icon}`) : 'fa-layer-group';
    const cap = parseFloat(c.monthlyBudgetCap || 0);
    const spent = parseFloat(c.spent || 0);
    const progress = Math.min(c.progress || 0, 100);
    const statusClass = c.statusClass || (progress >= 80 ? 'badge-warning' : 'badge-on-track');
    const statusText = c.status || (progress >= 80 ? 'Warning' : 'On Track');
    const formattedCap = window.Localization ? window.Localization.formatMoney(cap, 'BDT') : `৳${cap.toLocaleString()}`;
    const formattedSpent = window.Localization ? window.Localization.formatMoney(spent, 'BDT') : `৳${spent.toLocaleString()}`;

    return `
      <div class="search-cat-card" onclick="openCategoryModal(${c.id})">
        <div class="search-cat-head">
          <div class="search-cat-icon-name">
            <div class="search-cat-icon" style="background-color: ${catColor}18; color: ${catColor};">
              <i class="fa-solid ${iconClass}"></i>
            </div>
            <div>
              <div class="search-cat-name">${escapeHtml(c.name)}</div>
              <div style="font-size: 0.78rem; color: #94a3b8;">Cap: ${formattedCap}</div>
            </div>
          </div>
          <span class="${statusClass}">${statusText}</span>
        </div>

        <div class="search-cat-metrics">
          <span>Spent: <strong>${formattedSpent}</strong></span>
          <span>${progress}%</span>
        </div>

        <div class="search-cat-progress">
          <div class="search-cat-progress-fill" style="width: ${progress}%; background-color: ${progress >= 100 ? '#dc2626' : (progress >= 80 ? '#d97706' : catColor)};"></div>
        </div>
      </div>
    `;
  }).join('');
}

// Render Transactions Table
function renderTransactionsTable(transactions) {
  const tbody = document.getElementById('searchResultsBody');
  if (!tbody) return;

  tbody.innerHTML = transactions.map(t => {
    const catColor = t.categoryColor || '#64748b';
    const catIcon = t.categoryIcon ? (t.categoryIcon.startsWith('fa-') ? t.categoryIcon : `fa-${t.categoryIcon}`) : 'fa-receipt';
    const walletColor = t.walletColor || '#2563eb';
    const amount = parseFloat(t.amount || 0);

    let amountPrefix = '-';
    if (t.transactionType === 'VAULT_CONTRIBUTION') {
      amountPrefix = '🛡️ ';
    } else if (t.transactionType === 'SADAQA_CONTRIBUTION') {
      amountPrefix = '❤️ ';
    }

    const formattedAmount = window.Localization 
      ? `${amountPrefix}${window.Localization.formatMoney(amount, 'BDT')}` 
      : `${amountPrefix}৳${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const formattedDate = t.date ? (window.Localization ? window.Localization.formatDate(t.date) : t.date) : 'N/A';

    return `
      <tr class="clickable-row" onclick="openTransactionModal(${t.id})">
        <td style="padding: 12px 18px;">
          <span style="display: inline-flex; align-items: center; gap: 8px; font-weight: 500; font-size: 0.88rem;">
            <i class="fa-solid ${catIcon}" style="color: ${catColor}; width: 16px;"></i>
            ${escapeHtml(t.categoryName || 'General')}
          </span>
        </td>
        <td style="padding: 12px 18px;">
          <strong style="color: #0f172a; font-size: 0.9rem;">${escapeHtml(t.description || 'Transaction')}</strong>
        </td>
        <td style="padding: 12px 18px;">
          <span style="display: inline-flex; align-items: center; gap: 6px; background: #f1f5f9; padding: 4px 10px; border-radius: 6px; font-size: 0.82rem; font-weight: 500; color: #334155;">
            <span style="width: 8px; height: 8px; border-radius: 50%; background: ${walletColor}; display: inline-block;"></span>
            ${escapeHtml(t.walletName || 'Wallet')}
          </span>
        </td>
        <td style="padding: 12px 18px; font-weight: 700; color: ${t.transactionType === 'SADAQA_CONTRIBUTION' ? '#ea580c' : '#dc2626'}; font-size: 0.92rem;">
          ${formattedAmount}
        </td>
        <td style="padding: 12px 18px; color: #64748b; font-size: 0.85rem;">
          ${formattedDate}
        </td>
        <td style="padding: 12px 18px; text-align: right;">
          <div style="display: inline-flex; align-items: center; gap: 6px; justify-content: flex-end;">
            <button type="button" class="btn-edit-tx" style="background: #eff6ff; border: 1px solid #bfdbfe; color: #2563eb; border-radius: 6px; padding: 5px 10px; font-size: 0.78rem; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; transition: all 0.15s ease;" onclick="event.stopPropagation(); openEditTransactionModal(${t.id})" title="Edit Transaction">
              <i class="fa-solid fa-pen-to-square"></i> Edit
            </button>
            <button type="button" class="btn-secondary" style="padding: 5px 12px; font-size: 0.78rem;" onclick="event.stopPropagation(); openTransactionModal(${t.id})">
              Details
            </button>
            <button type="button" class="btn-delete-tx" style="background: #fef2f2; border: 1px solid #fecaca; color: #dc2626; border-radius: 6px; padding: 5px 10px; font-size: 0.78rem; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 5px; transition: all 0.15s ease;" onclick="event.stopPropagation(); deleteTransactionWithConfirmation(${t.id})" title="Delete Transaction">
              <i class="fa-regular fa-trash-can"></i> Delete
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// Modal Interaction Handlers
window.openTransactionModal = function(id) {
  const tx = (currentSearchResponse.transactions || []).find(t => t.id === id);
  if (!tx) return;

  const amount = parseFloat(tx.amount || 0);
  let amountPrefix = '-';
  if (tx.transactionType === 'SADAQA_CONTRIBUTION') {
    amountPrefix = '❤️ ';
  } else if (tx.transactionType === 'VAULT_CONTRIBUTION') {
    amountPrefix = '🛡️ ';
  }
  const formattedAmt = window.Localization ? window.Localization.formatMoney(amount, 'BDT') : `৳${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  document.getElementById('modalTxAmount').textContent = `${amountPrefix}${formattedAmt}`;
  document.getElementById('modalTxDesc').textContent = tx.description || 'No description';
  document.getElementById('modalTxType').textContent = formatTxType(tx.transactionType);
  const isVault = (tx.transactionType === 'VAULT_CONTRIBUTION' || Boolean(tx.vaultId));
  if (isVault) {
    document.getElementById('modalTxCategory').innerHTML = `<i class="fa-solid fa-piggy-bank" style="color: #10b981"></i> Savings Vault: <strong>${escapeHtml(tx.vaultName || 'Vault')}</strong>`;
  } else {
    document.getElementById('modalTxCategory').innerHTML = `<i class="fa-solid fa-${tx.categoryIcon || 'receipt'}" style="color: ${tx.categoryColor || '#14806c'}"></i> ${escapeHtml(tx.categoryName || 'General')}`;
  }
  document.getElementById('modalTxWallet').innerHTML = `<i class="fa-solid fa-wallet" style="color: ${tx.walletColor || '#2563eb'}"></i> ${escapeHtml(tx.walletName || 'Default Wallet')}`;
  document.getElementById('modalTxDate').textContent = tx.date || 'N/A';
  document.getElementById('modalTxMethod').textContent = tx.entryMethod || 'MANUAL';

  const noteRow = document.getElementById('modalTxNoteRow');
  if (tx.sourceNote) {
    noteRow.style.display = 'flex';
    document.getElementById('modalTxNote').textContent = tx.sourceNote;
  } else {
    noteRow.style.display = 'none';
  }

  const editBtn = document.getElementById('modalEditTxBtn');
  if (editBtn) {
    editBtn.onclick = () => {
      closeModal('txDetailModal');
      openEditTransactionModal(id);
    };
  }

  const deleteBtn = document.getElementById('modalDeleteTxBtn');
  if (deleteBtn) {
    deleteBtn.onclick = () => deleteTransactionWithConfirmation(id);
  }

  openModal('txDetailModal');
};

// Open Edit Transaction Modal on Search Page
window.openEditTransactionModal = async function(id) {
  const token = localStorage.getItem('token');
  try {
    const [walletsRes, catsRes, vaultsRes, txRes] = await Promise.all([
      fetch('/api/wallets', { headers: { 'Authorization': `Bearer ${token}` } }),
      fetch('/api/categories', { headers: { 'Authorization': `Bearer ${token}` } }),
      fetch('/api/savings', { headers: { 'Authorization': `Bearer ${token}` } }),
      fetch(`/api/transactions/${id}`, { headers: { 'Authorization': `Bearer ${token}` } })
    ]);

    const wallets = await walletsRes.json();
    const categories = await catsRes.json();
    const vaults = await vaultsRes.json();
    const tx = await txRes.json();

    const walletSelect = document.getElementById('searchEditTxWallet');
    const formatAmount = amt => window.Localization ? window.Localization.formatMoney(amt, 'BDT') : `৳${(amt || 0).toLocaleString()}`;
    walletSelect.innerHTML = (wallets || []).map(w => `<option value="${w.id}" ${w.id === tx.walletId ? 'selected' : ''}>${w.name} (${formatAmount(parseFloat(w.currentBalance || 0))})</option>`).join('');

    const catSelect = document.getElementById('searchEditTxCategory');
    catSelect.innerHTML = '<option value="">-- No Category --</option>' + (categories || []).map(c => `<option value="${c.id}" ${c.id === tx.categoryId ? 'selected' : ''}>${c.name}</option>`).join('');

    // Check if vault transaction
    const isVaultTx = (tx.transactionType === 'VAULT_CONTRIBUTION' || Boolean(tx.vaultId));
    const catContainer = document.getElementById('searchEditTxCategoryContainer');
    const vaultContainer = document.getElementById('searchEditTxVaultContainer');
    const vaultSelect = document.getElementById('searchEditTxVault');
    const vaultIdInput = document.getElementById('searchEditTxVaultId');

    // Identify target vault ID if not directly set
    let targetVaultId = tx.vaultId;
    if (!targetVaultId && isVaultTx && vaults && vaults.length > 0) {
      const desc = (tx.description || '').toLowerCase();
      const matched = vaults.find(v => desc.includes(v.name.toLowerCase()) || desc.endsWith('to ' + v.name.toLowerCase()));
      if (matched) targetVaultId = matched.id;
      else if (tx.vaultName) {
        const byName = vaults.find(v => v.name.toLowerCase() === tx.vaultName.toLowerCase());
        if (byName) targetVaultId = byName.id;
      }
    }

    if (vaultIdInput) vaultIdInput.value = targetVaultId || '';

    if (vaultSelect) {
      vaultSelect.innerHTML = (vaults || []).map(v => 
        `<option value="${v.id}" ${Number(v.id) === Number(targetVaultId) ? 'selected' : ''}>${v.emoji ? v.emoji + ' ' : ''}${v.name} (${formatAmount(parseFloat(v.initialSavings || 0))})</option>`
      ).join('');
    }

    if (isVaultTx) {
      if (catContainer) catContainer.style.display = 'none';
      if (vaultContainer) vaultContainer.style.display = 'block';
    } else {
      if (catContainer) catContainer.style.display = 'block';
      if (vaultContainer) vaultContainer.style.display = 'none';
    }

    const currentCur = window.Localization ? window.Localization.getCurrencyCode() : 'BDT';
    const convertedAmt = window.Localization ? window.Localization.convert(parseFloat(tx.amount || 0), 'BDT', currentCur) : parseFloat(tx.amount || 0);

    document.getElementById('searchEditTxId').value = tx.id;
    document.getElementById('searchEditTxType').value = tx.transactionType || (isVaultTx ? 'VAULT_CONTRIBUTION' : 'EXPENSE');
    document.getElementById('searchEditTxAmount').value = currentCur === 'JPY' ? Math.round(convertedAmt) : convertedAmt.toFixed(2);
    document.getElementById('searchEditTxDesc').value = tx.description || '';
    document.getElementById('searchEditTxDate').value = tx.transactionDate || '';
    document.getElementById('searchEditTxNote').value = tx.sourceNote || '';

    if (window.Localization) window.Localization.applyToDOM();

    openModal('searchEditTxModal');
  } catch (err) {
    console.error('Failed to load transaction for edit:', err);
    if (window.showToast) showToast('Failed to load transaction details.', 'error');
    else alert('Failed to load transaction details.');
  }
};

// Handle Search Edit Form Submit
document.addEventListener('DOMContentLoaded', () => {
  const searchEditForm = document.getElementById('searchEditTxForm');
  if (searchEditForm) {
    searchEditForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('searchEditTxId').value;
      const token = localStorage.getItem('token');

      const enteredAmount = parseFloat(document.getElementById('searchEditTxAmount').value);
      const currentCur = window.Localization ? window.Localization.getCurrencyCode() : 'BDT';
      const amountInBDT = window.Localization ? window.Localization.convert(enteredAmount, currentCur, 'BDT') : enteredAmount;

      const isVaultTx = (document.getElementById('searchEditTxType').value === 'VAULT_CONTRIBUTION' || Boolean(document.getElementById('searchEditTxVaultId').value));
      const selectedVaultId = document.getElementById('searchEditTxVault')?.value || document.getElementById('searchEditTxVaultId')?.value;

      const req = {
        amount: amountInBDT,
        description: document.getElementById('searchEditTxDesc').value,
        walletId: parseInt(document.getElementById('searchEditTxWallet').value, 10),
        categoryId: (!isVaultTx && document.getElementById('searchEditTxCategory').value) ? parseInt(document.getElementById('searchEditTxCategory').value, 10) : null,
        vaultId: (isVaultTx && selectedVaultId) ? parseInt(selectedVaultId, 10) : null,
        transactionDate: document.getElementById('searchEditTxDate').value,
        sourceNote: document.getElementById('searchEditTxNote').value,
        transactionType: document.getElementById('searchEditTxType').value || (isVaultTx ? 'VAULT_CONTRIBUTION' : 'EXPENSE')
      };

      const saveBtn = document.getElementById('saveSearchEditTxBtn');
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
      }

      try {
        const res = await fetch(`/api/transactions/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(req)
        });

        if (res.ok) {
          closeModal('searchEditTxModal');
          if (window.showToast) showToast('Transaction updated successfully!', 'success');
          const query = document.getElementById('searchInput')?.value || '';
          await fetchSearchResults(query);

          // If vault transaction, dispatch update notification event
          if (req.vaultId) {
            try {
              const vaultRes = await fetch('/api/savings', { headers: { 'Authorization': `Bearer ${token}` } });
              if (vaultRes.ok) {
                const vaults = await vaultRes.json();
                const targetVault = vaults.find(v => Number(v.id) === Number(req.vaultId));
                if (targetVault) {
                  const currentTotal = parseFloat(targetVault.initialSavings) || 0;
                  const targetCap = parseFloat(targetVault.targetAmount) || 0;
                  const percent = targetCap > 0 ? Math.min(100, Math.round((currentTotal / targetCap) * 100)) : 100;
                  const formattedDeposit = window.Localization ? window.Localization.formatMoney(req.amount, 'BDT') : `৳${req.amount.toLocaleString()}`;
                  const appEvent = {
                    type: 'saving',
                    title: 'Savings Goal Updated',
                    message: `Updated deposit of ${formattedDeposit} to "${targetVault.name}". Goal is now ${percent}% complete!`,
                    rawMessage: `Updated deposit of ${formattedDeposit} to "${targetVault.name}". Goal is now ${percent}% complete!`,
                    amountBDT: currentTotal,
                    depositAmount: req.amount,
                    capBDT: targetCap,
                    percent: percent,
                    category: targetVault.name,
                    severity: 'success',
                    link: 'savings.html'
                  };
                  if (window.handleApplicationEvent) {
                    window.handleApplicationEvent(appEvent);
                  } else {
                    window.dispatchEvent(new CustomEvent('applicationEvent', { detail: appEvent }));
                  }
                }
              }
            } catch (err) {
              console.error('Error refreshing savings notification after edit:', err);
            }
          }

          // Check if updated category exceeds budget cap
          if (req.categoryId && (!req.transactionType || req.transactionType === 'EXPENSE')) {
            if (window.checkAndTriggerBudgetAlert) {
              await window.checkAndTriggerBudgetAlert(req.categoryId);
            } else {
              try {
                const catRes = await fetch('/api/categories', { headers: { 'Authorization': `Bearer ${token}` } });
                if (catRes.ok) {
                  const cats = await catRes.json();
                  const cat = cats.find(c => Number(c.id) === Number(req.categoryId));
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
              } catch (err) {
                console.error('Error verifying budget cap after search transaction edit:', err);
              }
            }
          }
        } else {
          let msg = 'Failed to update transaction';
          try {
            const errData = await res.json();
            if (errData && errData.message) {
              msg = errData.message;
            }
          } catch (e) {
            try {
              const errText = await res.text();
              if (errText) msg = errText;
            } catch (ignored) {}
          }
          if (window.showToast) showToast(msg, 'error');
          else alert(msg);
        }
      } catch (err) {
        console.error('Failed to update transaction:', err);
        if (window.showToast) showToast('An error occurred while updating the transaction.', 'error');
        else alert('An error occurred while updating the transaction.');
      } finally {
        if (saveBtn) {
          saveBtn.disabled = false;
          saveBtn.innerHTML = '<i class="fa-solid fa-check"></i> Save Changes';
        }
      }
    });
  }
});

// Global Delete Transaction Handler with Full Effect Reversal Confirmation
window.deleteTransactionWithConfirmation = async function(id) {
  const numId = Number(id);
  if (!numId || isNaN(numId)) {
    console.error('Invalid transaction ID for deletion:', id);
    if (window.showToast) showToast('Invalid transaction ID.', 'error');
    else alert('Invalid transaction ID.');
    return;
  }

  const tx = (currentSearchResponse.transactions || []).find(t => Number(t.id) === numId);
  const desc = tx ? `"${tx.description}"` : 'this transaction';
  const amount = tx ? (window.Localization ? window.Localization.formatMoney(parseFloat(tx.amount || 0), 'BDT') : `৳${parseFloat(tx.amount || 0).toLocaleString()}`) : '';
  const wallet = tx && tx.walletName ? `wallet "${tx.walletName}"` : 'your wallet';

  const confirmed = confirm(
    `Are you sure you want to delete ${desc} (${amount})?\n\n` +
    `This will completely remove it from the system and:\n` +
    `• Refund ${amount} back to ${wallet}\n` +
    `• Update category spending and budget progress\n` +
    `• Recalculate your dashboard and analytics\n` +
    `• Remove it from transaction history and search results`
  );

  if (!confirmed) return;

  const token = localStorage.getItem('token');
  if (!token) {
    if (window.showToast) showToast('Your session has expired. Please log in again.', 'warning');
    else alert('Your session has expired. Please log in again.');
    setTimeout(() => { window.location.href = 'index.html'; }, 1000);
    return;
  }

  try {
    const res = await fetch(`/api/transactions/${numId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (res.ok) {
      closeModal('txDetailModal');
      if (window.showToast) showToast('Transaction deleted and balance refunded successfully.', 'success');
      
      // Dispatch real-time application event for the notification bell component
      const appEvent = {
        type: 'daily',
        title: 'Transaction Deleted',
        message: `Transaction record #${numId} was removed and wallet balance was refunded.`,
        severity: 'info',
        link: 'search.html'
      };
      if (window.handleApplicationEvent) {
        window.handleApplicationEvent(appEvent);
      } else {
        window.dispatchEvent(new CustomEvent('applicationEvent', { detail: appEvent }));
      }

      // Re-fetch search results to immediately reflect the refund, category update, and removal
      const query = document.getElementById('searchInput')?.value || '';
      await fetchSearchResults(query);
    } else if (res.status === 401) {
      if (window.showToast) showToast('Your session has expired. Please log in again.', 'warning');
      else alert('Your session has expired. Please log in again.');
      localStorage.removeItem('token');
      localStorage.removeItem('currentUser');
      localStorage.removeItem('user');
      setTimeout(() => { window.location.href = 'index.html'; }, 1000);
    } else if (res.status === 404) {
      closeModal('txDetailModal');
      const query = document.getElementById('searchInput')?.value || '';
      await fetchSearchResults(query);
      if (window.showToast) showToast('This transaction was already deleted or no longer exists.', 'warning');
      else alert('This transaction was already deleted or no longer exists.');
    } else if (res.status === 403) {
      closeModal('txDetailModal');
      const query = document.getElementById('searchInput')?.value || '';
      await fetchSearchResults(query);
      if (window.showToast) showToast('Permission denied: You do not have permission to delete this transaction.', 'error');
      else alert('Permission denied: You do not have permission to delete this transaction.');
    } else {
      let errorMsg = 'Failed to delete transaction. Please try again.';
      try {
        const errorData = await res.json();
        if (errorData && errorData.message) errorMsg = errorData.message;
      } catch (_) {}
      if (window.showToast) showToast(errorMsg, 'error');
      else alert(errorMsg);
    }
  } catch (err) {
    console.error('Delete transaction failed:', err);
    if (window.showToast) showToast('An error occurred while deleting the transaction. Please check your network connection.', 'error');
    else alert('An error occurred while deleting the transaction. Please check your network connection.');
  }
};

window.openCategoryModal = function(id) {
  const cat = (currentSearchResponse.categories || []).find(c => c.id === id);
  if (!cat) return;

  const cap = parseFloat(cat.monthlyBudgetCap || 0);
  const spent = parseFloat(cat.spent || 0);
  const remaining = Math.max(cap - spent, 0);
  const remainingStr = window.Localization ? window.Localization.formatMoney(remaining, 'BDT') : `৳${remaining.toLocaleString()}`;

  document.getElementById('modalCatCap').textContent = window.Localization ? window.Localization.formatMoney(cap, 'BDT') : `৳${cap.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  document.getElementById('modalCatName').innerHTML = `<i class="fa-solid fa-${cat.icon || 'layer-group'}" style="color: ${cat.colorHex || '#10b981'}"></i> ${escapeHtml(cat.name)}`;
  document.getElementById('modalCatSpent').textContent = window.Localization ? window.Localization.formatMoney(spent, 'BDT') : `৳${spent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  document.getElementById('modalCatProgress').textContent = `${cat.progress}% (${cap > 0 ? (spent >= cap ? 'Budget Exceeded' : remainingStr + ' remaining') : 'No Limit'})`;
  document.getElementById('modalCatStatus').innerHTML = `<span class="${cat.statusClass || 'badge-on-track'}">${cat.status || 'On Track'}</span>`;

  openModal('categoryDetailModal');
};

window.openWalletModal = function(id) {
  const wallet = (currentSearchResponse.wallets || []).find(w => w.id === id);
  if (!wallet) return;

  const balance = parseFloat(wallet.currentBalance || 0);
  const opening = parseFloat(wallet.openingBalance || 0);
  const curCode = window.Localization ? window.Localization.getCurrencyCode() : (wallet.currencyCode || 'BDT');
  const curSym = window.Localization ? window.Localization.getCurrencySymbol() : '৳';

  document.getElementById('modalWalletBalance').textContent = window.Localization ? window.Localization.formatMoney(balance, 'BDT') : `৳${balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  document.getElementById('modalWalletName').innerHTML = `<i class="fa-solid fa-${wallet.icon || 'wallet'}" style="color: ${wallet.colorHex || '#2563eb'}"></i> ${escapeHtml(wallet.name)}`;
  document.getElementById('modalWalletOpening').textContent = window.Localization ? window.Localization.formatMoney(opening, 'BDT') : `৳${opening.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  document.getElementById('modalWalletCurrency').textContent = `${curCode} (${curSym})`;

  openModal('walletDetailModal');
};

function formatTxType(type) {
  if (type === 'SADAQA_CONTRIBUTION') return 'Charity / Sadaqa';
  if (type === 'VAULT_CONTRIBUTION') return 'Savings Vault Deposit';
  return 'Expense';
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Listen for global localization changes
window.addEventListener('localizationChanged', () => {
  const query = document.getElementById('searchInput')?.value || '';
  if (currentSearchResponse) {
    applyFiltersAndRender(currentSearchResponse, query);
  }
  if (window.Localization) window.Localization.applyToDOM();
});