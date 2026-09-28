// ==========================================================================
// 1. DATA STORE (Populated from APIs)
// ==========================================================================

let dashboardSummary = null;
let dashboardWallets = [];
let dashboardTransactions = [];

async function fetchDashboardData() {
  const token = localStorage.getItem('token');
  if(!token) {
    window.location.href = 'index.html';
    return;
  }
  
  try {
    const [summaryRes, walletsRes, txRes] = await Promise.all([
      fetch('/api/dashboard/summary', { headers: { 'Authorization': `Bearer ${token}` } }),
      fetch('/api/wallets', { headers: { 'Authorization': `Bearer ${token}` } }),
      fetch('/api/transactions', { headers: { 'Authorization': `Bearer ${token}` } })
    ]);

    if (summaryRes.ok) dashboardSummary = await summaryRes.json();
    if (walletsRes.ok) dashboardWallets = await walletsRes.json();
    
    if (txRes.ok) {
        const allTx = await txRes.json();
        // Take top 6 recent transactions for dashboard
        dashboardTransactions = allTx.slice(0, 6);
    }
  } catch(e) {
    console.error("API error:", e);
  }
}

// ==========================================================================
// 2. DOM RENDER LOGIC
// ==========================================================================

document.addEventListener('DOMContentLoaded', async () => {
  await fetchDashboardData();
  renderOverviewMetrics();
  renderWalletsList();
  renderBudgetCategories();
  renderTransactionsTable();
  setupEventListeners();
});

// Render top summary metrics
function renderOverviewMetrics() {
  const container = document.getElementById('metricsContainer');
  if (!container || !dashboardSummary) return;

  const limit = dashboardSummary.monthlyIncome > 0 ? dashboardSummary.monthlyIncome : 30000;
  const spent = dashboardSummary.monthlyExpenses;
  const dailyProgress = Math.min(Math.round((spent / limit) * 100), 100);

  const formatAmount = amt => window.Localization ? window.Localization.formatMoney(amt, 'BDT') : `৳${(amt || 0).toLocaleString()}`;

  // Build the 4 cards based on actual data
  const metrics = [
    {
      type: 'teal',
      label: 'MONTHLY EXPENSES',
      amount: formatAmount(spent),
      subLabel: 'spent this month',
      progress: dailyProgress,
      footer: `${formatAmount(spent)} spent of ${formatAmount(limit)} limit`
    },
    {
      type: 'white',
      label: 'TOTAL BALANCE',
      amount: formatAmount(dashboardSummary.totalBalance),
      subLabel: 'across all wallets',
      trendText: 'Live balance',
      trendType: 'success',
      iconTag: 'fa-arrow-trend-up',
      tagClass: 'green-tag'
    },
    {
      type: 'white',
      label: 'REMAINING BUDGET',
      amount: formatAmount(dashboardSummary.remainingBudget),
      subLabel: `of ${formatAmount(dashboardSummary.monthlyIncome)} income`,
      progress: 100 - dailyProgress,
      progressClass: 'green-fill',
      iconTag: 'fa-circle-dot',
      tagClass: 'green-tag'
    },
    {
      type: 'white',
      label: 'TOTAL SAVINGS',
      amount: formatAmount(dashboardSummary.totalSavings),
      subLabel: 'in vaults',
      trendText: 'On track this month',
      trendType: 'success',
      iconTag: 'fa-piggy-bank',
      tagClass: 'green-tag'
    }
  ];

  container.innerHTML = metrics.map(item => {
    if (item.type === 'teal') {
      return `
        <div class="metric-card teal-card">
          <span class="card-label">${item.label}</span>
          <h2 class="amount">${item.amount}</h2>
          <p class="sub-label">${item.subLabel}</p>
          <div class="progress-bar-wrap">
            <div class="progress-bar-fill" style="width: ${item.progress}%;"></div>
          </div>
          <p class="progress-footer">${item.footer}</p>
        </div>
      `;
    }

    return `
      <div class="metric-card white-card">
        <div class="card-top">
          <span class="card-label">${item.label}</span>
          <div class="icon-tag ${item.tagClass}">
            <i class="fa-solid ${item.iconTag}"></i>
          </div>
        </div>
        <h2 class="amount black-text">${item.amount}</h2>
        <p class="sub-label black-text">${item.subLabel}</p>
        ${item.progress !== undefined ? `
          <div class="progress-bar-wrap dark-wrap">
            <div class="progress-bar-fill ${item.progressClass}" style="width: ${item.progress}%;"></div>
          </div>
        ` : ''}
        ${item.trendText ? `
          <p class="trend-text ${item.trendType}">
            <i class="fa-solid ${item.trendType === 'danger' ? 'fa-arrow-trend-down' : 'fa-arrow-trend-up'}"></i>
            ${item.trendText}
          </p>
        ` : ''}
      </div>
    `;
  }).join('');
}

function renderWalletsList() {
  const container = document.getElementById('dashboardWalletsContainer');
  const balElem = document.getElementById('totalBalanceHeader');
  if (!container || !dashboardSummary) return;

  const formatAmount = amt => window.Localization ? window.Localization.formatMoney(amt, 'BDT') : `৳${(amt || 0).toLocaleString()}`;

  if (balElem) {
      balElem.textContent = formatAmount(dashboardSummary.totalBalance || 0);
  }
  
  if(dashboardWallets.length === 0) {
      container.innerHTML = '<p style="color:#64748b;font-size:0.85rem;text-align:center;padding:1rem;">No wallets found.</p>';
      return;
  }

  const bgClasses = ['green-bg', 'pink-bg', 'purple-bg', 'blue-bg'];
  const barClasses = ['green-bars', 'pink-bars', 'purple-bars', 'blue-bars'];

  container.innerHTML = dashboardWallets.map((w, i) => {
    const bgClass = bgClasses[i % bgClasses.length];
    const barClass = barClasses[i % barClasses.length];
    
    return `
      <div class="wallet-item">
        <div class="wallet-icon ${bgClass}">
          <i class="fa-solid ${w.icon && w.icon.includes('fa-') ? w.icon : 'fa-wallet'}"></i>
        </div>
        <div class="wallet-details">
          <h4>${w.name}</h4>
          <p>${formatAmount(w.currentBalance || 0)}</p>
        </div>
        <div class="wallet-mini-chart ${barClass}">
          <span></span><span></span><span></span><span></span>
        </div>
      </div>
    `;
  }).join('');
}

function renderBudgetCategories() {
  const container = document.getElementById('dashboardCategoriesContainer');
  if (!container || !dashboardSummary) return;

  const formatAmount = amt => window.Localization ? window.Localization.formatMoney(amt, 'BDT') : `৳${(amt || 0).toLocaleString()}`;
  const categories = dashboardSummary.categorySpending || [];
  
  if(categories.length === 0) {
      container.innerHTML = '<p style="color:#64748b;font-size:0.85rem;text-align:center;padding:1rem;">No expenses this month.</p>';
      return;
  }

  container.innerHTML = categories.map(cat => {
    const limit = cat.budgetLimit || null;
    const progress = limit ? Math.min((cat.spent / limit) * 100, 100) : 100;
    const isOverBudget = limit && cat.spent > limit * 0.9;
    
    return `
      <div>
        <div class="cat-top">
          <div class="cat-left">
            <span class="cat-icon" style="color: ${cat.colorHex};">
              ${cat.categoryIcon && cat.categoryIcon.startsWith('fa-') ? `<i class="fa-solid ${cat.categoryIcon}"></i>` : (cat.categoryIcon || '📌')}
            </span>
            <span class="cat-name">${cat.categoryName}</span>
            ${isOverBudget ? '<i class="fa-solid fa-circle-exclamation alert-icon"></i>' : ''}
          </div>
          <div class="cat-right">
            <span style="font-weight: 700;">${formatAmount(cat.spent || 0)}</span>
            ${limit ? `<span class="cat-spent">/ ${formatAmount(limit)}</span>` : ''}
          </div>
        </div>
        <div class="cat-progress">
          <div style="width: ${progress}%; height: 100%; background-color: ${cat.colorHex}; opacity: 0.8; border-radius: 4px;"></div>
        </div>
      </div>
    `;
  }).join('');
}

function renderTransactionsTable() {
  const tbody = document.getElementById('transactionBody');
  if (!tbody) return;

  if(dashboardTransactions.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#64748b;padding:1.5rem;">No recent transactions</td></tr>';
      return;
  }

  const formatAmount = amt => window.Localization ? window.Localization.formatMoney(amt, 'BDT') : `৳${(amt || 0).toLocaleString()}`;

  tbody.innerHTML = dashboardTransactions.map(tx => {
    const catName = tx.category ? tx.category.name : (tx.transactionType === 'SADAQA_CONTRIBUTION' ? 'Charity / Sadaqa' : (tx.transactionType === 'VAULT_CONTRIBUTION' ? 'Savings Vault' : 'General'));
    const catIcon = tx.category ? tx.category.icon : (tx.transactionType === 'SADAQA_CONTRIBUTION' ? 'fa-heart' : (tx.transactionType === 'VAULT_CONTRIBUTION' ? 'fa-piggy-bank' : 'fa-receipt'));
    const catColor = tx.category ? tx.category.colorHex : (tx.transactionType === 'SADAQA_CONTRIBUTION' ? '#ea580c' : (tx.transactionType === 'VAULT_CONTRIBUTION' ? '#10b981' : '#64748b'));
    const isExpense = tx.transactionType === 'EXPENSE';
    const prefix = isExpense ? '-' : (tx.transactionType === 'SADAQA_CONTRIBUTION' ? '❤️ ' : '🛡️ ');
    const amountStr = `${prefix}${formatAmount(tx.convertedAmount || tx.originalAmount || 0)}`;
    const amountColor = tx.transactionType === 'SADAQA_CONTRIBUTION' ? '#ea580c' : (isExpense ? '#dc2626' : '#10b981');
    const formattedDate = window.Localization ? window.Localization.formatDate(tx.transactionDate) : (tx.transactionDate || '');

    return `
      <tr>
        <td>
          <span class="table-cat" style="color: ${catColor}; background-color: ${catColor}18; display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 6px; font-weight: 500;">
            <i class="fa-solid ${catIcon && catIcon.startsWith('fa-') ? catIcon : 'fa-' + catIcon}"></i> ${catName}
          </span>
        </td>
        <td><strong>${tx.description || 'No description'}</strong></td>
        <td><span class="wallet-badge">${tx.wallet ? tx.wallet.name : '-'}</span></td>
        <td style="color: ${amountColor}; font-weight: 700;">${amountStr}</td>
        <td class="date-col">${formattedDate}</td>
        <td style="text-align: right;">
          <div style="display: inline-flex; align-items: center; gap: 6px; justify-content: flex-end;">
            <button type="button" class="btn-edit-tx" style="background: #eff6ff; border: 1px solid #bfdbfe; color: #2563eb; border-radius: 6px; padding: 5px 10px; font-size: 0.78rem; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; transition: all 0.15s ease;" onclick="openEditTransactionModalFromDashboard(${tx.id})" title="Edit Transaction">
              <i class="fa-solid fa-pen-to-square"></i> Edit
            </button>
            <button type="button" class="btn-delete-tx" style="background: #fef2f2; border: 1px solid #fecaca; color: #dc2626; border-radius: 6px; padding: 5px 10px; font-size: 0.78rem; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; transition: all 0.15s ease;" onclick="deleteTransactionFromDashboard(${tx.id})" title="Delete Transaction">
              <i class="fa-regular fa-trash-can"></i> Delete
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

window.openEditTransactionModalFromDashboard = async function(id) {
  const token = localStorage.getItem('token');
  const modal = document.getElementById('editTxModal');
  if (!modal) return;

  try {
    const [walletsRes, catsRes, txRes] = await Promise.all([
      fetch('/api/wallets', { headers: { 'Authorization': `Bearer ${token}` } }),
      fetch('/api/categories', { headers: { 'Authorization': `Bearer ${token}` } }),
      fetch(`/api/transactions/${id}`, { headers: { 'Authorization': `Bearer ${token}` } })
    ]);

    const wallets = await walletsRes.json();
    const categories = await catsRes.json();
    const tx = await txRes.json();

    const walletSelect = document.getElementById('dashEditTxWallet');
    const formatAmount = amt => window.Localization ? window.Localization.formatMoney(amt, 'BDT') : `৳${(amt || 0).toLocaleString()}`;
    walletSelect.innerHTML = (wallets || []).map(w => `<option value="${w.id}" ${w.id === tx.walletId ? 'selected' : ''}>${w.name} (${formatAmount(parseFloat(w.currentBalance || 0))})</option>`).join('');

    const catSelect = document.getElementById('dashEditTxCategory');
    catSelect.innerHTML = '<option value="">-- No Category --</option>' + (categories || []).map(c => `<option value="${c.id}" ${c.id === tx.categoryId ? 'selected' : ''}>${c.name}</option>`).join('');

    const currentCur = window.Localization ? window.Localization.getCurrencyCode() : 'BDT';
    const convertedAmt = window.Localization ? window.Localization.convert(parseFloat(tx.amount || tx.convertedAmount || 0), 'BDT', currentCur) : parseFloat(tx.amount || 0);

    document.getElementById('dashEditTxId').value = tx.id;
    document.getElementById('dashEditTxType').value = tx.transactionType || 'EXPENSE';
    document.getElementById('dashEditTxAmount').value = currentCur === 'JPY' ? Math.round(convertedAmt) : convertedAmt.toFixed(2);
    document.getElementById('dashEditTxDesc').value = tx.description || '';
    document.getElementById('dashEditTxDate').value = tx.transactionDate || '';
    document.getElementById('dashEditTxNote').value = tx.sourceNote || '';

    if (window.Localization) window.Localization.applyToDOM();

    modal.style.display = 'flex';
  } catch (err) {
    console.error('Failed to load transaction for editing:', err);
    alert('Failed to load transaction details.');
  }
};

window.closeDashboardEditModal = function() {
  const modal = document.getElementById('editTxModal');
  if (modal) modal.style.display = 'none';
};

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('dashboardEditTxForm');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('dashEditTxId').value;
      const token = localStorage.getItem('token');

      const enteredAmount = parseFloat(document.getElementById('dashEditTxAmount').value);
      const currentCur = window.Localization ? window.Localization.getCurrencyCode() : 'BDT';
      const amountInBDT = window.Localization ? window.Localization.convert(enteredAmount, currentCur, 'BDT') : enteredAmount;

      const req = {
        amount: amountInBDT,
        description: document.getElementById('dashEditTxDesc').value,
        walletId: parseInt(document.getElementById('dashEditTxWallet').value, 10),
        categoryId: document.getElementById('dashEditTxCategory').value ? parseInt(document.getElementById('dashEditTxCategory').value, 10) : null,
        transactionDate: document.getElementById('dashEditTxDate').value,
        sourceNote: document.getElementById('dashEditTxNote').value,
        transactionType: document.getElementById('dashEditTxType').value || 'EXPENSE'
      };

      const saveBtn = document.getElementById('saveDashEditTxBtn');
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
          closeDashboardEditModal();
          await fetchDashboardData();

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
                console.error('Error verifying budget cap after dashboard transaction edit:', err);
              }
            }
          }
        } else {
          const errText = await res.text();
          alert('Failed to update transaction: ' + (errText || 'Server error'));
        }
      } catch (err) {
        console.error('Failed to update transaction:', err);
        alert('An error occurred while updating the transaction.');
      } finally {
        if (saveBtn) {
          saveBtn.disabled = false;
          saveBtn.innerHTML = '<i class="fa-solid fa-check"></i> Save Changes';
        }
      }
    });
  }
});

window.deleteTransactionFromDashboard = async function(id) {
  const tx = (dashboardTransactions || []).find(t => t.id === id);
  const desc = tx ? `"${tx.description || 'Transaction'}"` : 'this transaction';
  const formatAmount = amt => window.Localization ? window.Localization.formatMoney(amt, 'BDT') : `৳${(amt || 0).toLocaleString()}`;
  const amount = tx ? formatAmount(parseFloat(tx.convertedAmount || 0)) : '';
  const wallet = tx && tx.wallet ? `wallet "${tx.wallet.name}"` : 'your wallet';

  const confirmed = confirm(
    `Are you sure you want to delete ${desc} (${amount})?\n\n` +
    `This will completely remove it from the system and:\n` +
    `• Refund ${amount} back to ${wallet}\n` +
    `• Update category spending and budget progress\n` +
    `• Recalculate your dashboard and analytics\n` +
    `• Remove it from transaction history`
  );

  if (!confirmed) return;

  const token = localStorage.getItem('token');
  if (!token) {
    alert('Your session has expired. Please log in again.');
    window.location.href = 'index.html';
    return;
  }

  try {
    const res = await fetch(`/api/transactions/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (res.ok || res.status === 404) {
      await fetchDashboardData();
    } else if (res.status === 401) {
      alert('Your session has expired. Please log in again.');
      localStorage.removeItem('token');
      localStorage.removeItem('currentUser');
      localStorage.removeItem('user');
      window.location.href = 'index.html';
    } else if (res.status === 403) {
      alert('Permission denied: You do not have permission to delete this transaction.');
      await fetchDashboardData();
    } else {
      let errorMsg = 'Failed to delete transaction.';
      try {
        const errJson = await res.json();
        if (errJson && errJson.message) errorMsg = errJson.message;
      } catch (_) {}
      alert(errorMsg);
    }
  } catch (err) {
    console.error('Delete failed:', err);
    alert('An error occurred while deleting the transaction. Please check your network connection.');
  }
};

// Listen for global localization changes
window.addEventListener('localizationChanged', () => {
  if (dashboardSummary) {
    renderOverviewMetrics();
    renderWalletsList();
    renderBudgetCategories();
    renderTransactionsTable();
    if (window.Localization) window.Localization.applyToDOM();
  }
});

// ==========================================================================
// 3. EVENT LISTENERS
// ==========================================================================

function setupEventListeners() {
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      localStorage.removeItem('token');
      window.location.href = 'index.html';
    });
  }
}