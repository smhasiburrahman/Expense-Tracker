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

  const formatAmount = amt => `৳${(amt || 0).toLocaleString()}`;

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

  if (balElem) {
      balElem.textContent = `৳${(dashboardSummary.totalBalance || 0).toLocaleString()}`;
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
          <p>৳${(w.currentBalance || 0).toLocaleString()}</p>
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
            <span style="font-weight: 700;">৳${(cat.spent || 0).toLocaleString()}</span>
            ${limit ? `<span class="cat-spent">/ ৳${limit.toLocaleString()}</span>` : ''}
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
      tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#64748b;">No recent transactions</td></tr>';
      return;
  }

  tbody.innerHTML = dashboardTransactions.map(tx => {
    const catName = tx.category ? tx.category.name : 'Transfer';
    const catIcon = tx.category ? tx.category.icon : '💸';
    const catColor = tx.category ? tx.category.colorHex : '#94a3b8';
    const isExpense = tx.transactionType === 'EXPENSE';
    const amountStr = `${isExpense ? '-' : '+'}৳${(tx.convertedAmount || 0).toLocaleString()}`;
    const amountColor = isExpense ? '#0f172a' : '#10b981';

    return `
      <tr>
        <td>
          <span class="table-cat" style="color: ${catColor}; background-color: ${catColor}22;">
            ${catIcon && catIcon.startsWith('fa-') ? `<i class="fa-solid ${catIcon}"></i>` : catIcon} ${catName}
          </span>
        </td>
        <td><strong>${tx.description || 'No description'}</strong></td>
        <td><span class="wallet-badge">${tx.wallet ? tx.wallet.name : '-'}</span></td>
        <td class="${isExpense ? 'amount-minus' : ''}" style="color: ${amountColor}; font-weight: 600;">${amountStr}</td>
        <td class="date-col">${tx.transactionDate}</td>
      </tr>
    `;
  }).join('');
}

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