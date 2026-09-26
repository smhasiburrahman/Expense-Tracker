// ==========================================================================
// 1. MOCK DATA STORE
// ==========================================================================

const dashboardMetrics = [
  {
    type: 'teal',
    label: 'DAILY ALLOWANCE',
    amount: '৳820',
    subLabel: 'remaining today',
    progress: 37,
    footer: '৳480 spent of ৳1,300 limit'
  },
  {
    type: 'white',
    label: 'TOTAL SPENT',
    amount: '৳25,700',
    subLabel: 'this month',
    trendText: '8% more than last month',
    trendType: 'danger',
    iconTag: 'fa-arrow-trend-down',
    tagClass: 'red-tag'
  },
  {
    type: 'white',
    label: 'REMAINING BUDGET',
    amount: '৳6,800',
    subLabel: 'of ৳32,500 budget',
    progress: 79,
    progressClass: 'green-fill',
    iconTag: 'fa-circle-dot',
    tagClass: 'green-tag'
  },
  {
    type: 'white',
    label: 'TOTAL SAVINGS',
    amount: '৳1,06,700',
    subLabel: 'across 4 vaults',
    trendText: 'On track this month',
    trendType: 'success',
    iconTag: 'fa-piggy-bank',
    tagClass: 'green-tag'
  }
];

const dashboardWallets = [
  { name: 'Cash', balance: '৳2,340', icon: 'fa-money-bill-1', bg: 'green-bg', barClass: 'green-bars' },
  { name: 'bKash', balance: '৳8,750', icon: 'fa-mobile-screen', bg: 'pink-bg', barClass: 'pink-bars' },
  { name: 'Rocket', balance: '৳1,200', icon: 'fa-bolt', bg: 'purple-bg', barClass: 'purple-bars' },
  { name: 'BRAC Bank', balance: '৳45,680', icon: 'fa-building-columns', bg: 'blue-bg', barClass: 'blue-bars' }
];

const totalBalanceAmount = '৳57,970';

const dashboardCategories = [
  { name: 'Food & Dining', spent: '৳8,200', limit: '৳12,000', percent: 68, icon: 'fa-utensils', iconColor: 'yellow', fill: 'fill-teal', alert: false },
  { name: 'Transport', spent: '৳3,100', limit: '৳4,000', percent: 78, icon: 'fa-car', iconColor: 'purple', fill: 'fill-teal', alert: false },
  { name: 'Groceries', spent: '৳4,800', limit: '৳5,000', percent: 96, icon: 'fa-cart-shopping', iconColor: 'green', fill: 'fill-orange', alert: true },
  { name: 'Entertainment', spent: '৳1,200', limit: '৳2,000', percent: 60, icon: 'fa-film', iconColor: 'pink', fill: 'fill-teal', alert: false },
  { name: 'Utilities', spent: '৳2,800', limit: '৳3,500', percent: 80, icon: 'fa-bolt', iconColor: 'light-purple', fill: 'fill-orange', alert: true },
  { name: 'Shopping', spent: '৳5,600', limit: '৳6,000', percent: 93, icon: 'fa-bag-shopping', iconColor: 'red', fill: 'fill-orange', alert: true }
];

const dashboardTransactions = [
  { cat: 'Food & Dining', icon: 'fa-utensils', color: 'yellow', desc: 'Shawarma Palace, Bashundhara', wallet: 'bKash', amount: '-৳350', date: 'Today, 2:30 PM' },
  { cat: 'Transport', icon: 'fa-car', color: 'purple', desc: 'Uber — Gulshan to Dhanmondi', wallet: 'Cash', amount: '-৳180', date: 'Today, 11:15 AM' },
  { cat: 'Shopping', icon: 'fa-bag-shopping', color: 'red', desc: 'Daraz — Running Shoes', wallet: 'BRAC Bank', amount: '-৳2,100', date: 'Yesterday' },
  { cat: 'Food & Dining', icon: 'fa-mug-hot', color: 'orange', desc: "Gloria Jean's Coffee, Banani", wallet: 'bKash', amount: '-৳320', date: 'Yesterday' },
  { cat: 'Utilities', icon: 'fa-bolt', color: 'light-purple', desc: 'DESCO Electric Bill — July', wallet: 'BRAC Bank', amount: '-৳1,800', date: 'Jul 22' },
  { cat: 'Groceries', icon: 'fa-cart-shopping', color: 'green', desc: 'Shwapno Superstore, Mirpur', wallet: 'Cash', amount: '-৳1,200', date: 'Jul 22' }
];

// ==========================================================================
// 2. DOM RENDER LOGIC
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
  renderOverviewMetrics();
  renderWalletsList();
  renderBudgetCategories();
  renderTransactionsTable();
  setupEventListeners();
});

// Render top summary metrics
function renderOverviewMetrics() {
  const container = document.getElementById('metricsContainer');
  if (!container) return;

  container.innerHTML = dashboardMetrics.map(item => {
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
        <h2 class="amount">${item.amount}</h2>
        <p class="sub-label">${item.subLabel}</p>
        ${item.progress !== undefined ? `
          <div class="progress-bar-wrap light-bg">
            <div class="progress-bar-fill ${item.progressClass}" style="width: ${item.progress}%;"></div>
          </div>
        ` : `
          <div class="trend trend-${item.trendType}">
            <i class="fa-solid ${item.trendType === 'danger' ? 'fa-chart-column' : 'fa-arrow-trend-up'}"></i> ${item.trendText}
          </div>
        `}
      </div>
    `;
  }).join('');
}

// Render wallet list
function renderWalletsList() {
  const container = document.getElementById('dashboardWalletsContainer');
  if (!container) return;

  const walletItemsHtml = dashboardWallets.map(w => `
    <div class="wallet-item">
      <div class="wallet-left">
        <div class="wallet-icon ${w.bg}">
          <i class="fa-solid ${w.icon}"></i>
        </div>
        <div>
          <h4>${w.name}</h4>
          <p>Available balance</p>
        </div>
      </div>
      <div class="wallet-right">
        <div class="wallet-amount">${w.balance}</div>
        <div class="mini-bars ${w.barClass}">
          <span></span><span></span><span></span><span></span>
        </div>
      </div>
    </div>
  `).join('');

  const totalHtml = `
    <div class="wallet-item total-balance-row">
      <span class="total-label">Total Balance</span>
      <span class="total-amount">${totalBalanceAmount}</span>
    </div>
  `;

  container.innerHTML = walletItemsHtml + totalHtml;
}

// Render budget categories
function renderBudgetCategories() {
  const container = document.getElementById('dashboardCategoriesContainer');
  if (!container) return;

  container.innerHTML = dashboardCategories.map(cat => `
    <div class="category-item">
      <div class="cat-top">
        <div class="cat-left">
          <span class="cat-icon ${cat.iconColor}"><i class="fa-solid ${cat.icon}"></i></span>
          <span class="cat-name">
            ${cat.name} ${cat.alert ? '<i class="fa-solid fa-circle-exclamation alert-icon"></i>' : ''}
          </span>
        </div>
        <div class="cat-right">
          <strong>${cat.percent}%</strong>
          <span class="cat-spent">${cat.spent}/${cat.limit}</span>
        </div>
      </div>
      <div class="cat-progress">
        <div class="cat-fill ${cat.fill}" style="width: ${cat.percent}%;"></div>
      </div>
    </div>
  `).join('');
}

// Render recent transactions table
function renderTransactionsTable() {
  const tbody = document.getElementById('transactionBody');
  if (!tbody) return;

  tbody.innerHTML = dashboardTransactions.map(t => `
    <tr>
      <td><span class="table-cat ${t.color}"><i class="fa-solid ${t.icon}"></i> ${t.cat}</span></td>
      <td><strong>${t.desc}</strong></td>
      <td><span class="wallet-badge">${t.wallet}</span></td>
      <td class="amount-minus">${t.amount}</td>
      <td class="date-col">${t.date}</td>
    </tr>
  `).join('');
}

// Expose table refresh globally for external scripts
window.renderTransactionsTable = renderTransactionsTable;
window.dashboardTransactions = dashboardTransactions;

// ==========================================================================
// 3. EVENT LISTENERS
// ==========================================================================

function setupEventListeners() {
  // Handle user logout
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      window.location.href = 'index.html';
    });
  }

  // Handle data export
  const exportBtn = document.getElementById('exportBtn');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      alert('Export data functionality triggered.');
    });
  }
}