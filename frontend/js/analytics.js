// =========================================================================
// API CLIENT FUNCTION (Fetch Mock Data)
// =========================================================================
async function fetchAnalyticsData() {
  /*
  // API: Replace with real endpoint later
  // const res = await fetch('/api/analytics');
  // return await res.json();
  */

  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        user: {
          name: "Rahim Uddin",
          email: "rahim@example.com",
          avatarInitial: "R"
        },
        dateRange: "Jul 1 — Jul 25, 2025",
        donutOverview: {
          title: "Spending by Category",
          subtitle: "July 2025 · ৳25,700 total",
          categories: [
            { name: 'Food & Dining', percent: 32, amount: 8200, color: '#f59e0b' },
            { name: 'Shopping', percent: 22, amount: 5600, color: '#ef4444' },
            { name: 'Groceries', percent: 19, amount: 4800, color: '#10b981' },
            { name: 'Transport', percent: 12, amount: 3100, color: '#3b82f6' },
            { name: 'Utilities', percent: 11, amount: 2800, color: '#8b5cf6' },
            { name: 'Entertainment', percent: 5, amount: 1200, color: '#ec4899' }
          ]
        },
        trendOverview: {
          title: "Monthly Spending Trend",
          subtitle: "Feb — Jul 2025 · by category",
          labels: ['Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
          datasets: [
            { label: 'Food & Dining', data: [7500, 8500, 7000, 10000, 8000, 8500], backgroundColor: '#f59e0b' },
            { label: 'Transport', data: [3000, 3500, 3200, 4500, 3800, 3900], backgroundColor: '#3b82f6' },
            { label: 'Shopping', data: [4500, 6000, 4000, 6800, 5200, 6100], backgroundColor: '#ef4444' },
            { label: 'Others', data: [3800, 3200, 4200, 3000, 4000, 3700], backgroundColor: '#cbd5e1' }
          ]
        },
        insights: [
          {
            title: 'Spending Anomaly',
            desc: 'Shopping is at 93% — 3 days before month end.',
            icon: 'fa-triangle-exclamation',
            btnText: 'Review',
            btnColor: '#ea580c',
            iconBg: '#ffedd5',
            iconColor: '#ea580c'
          },
          {
            title: 'Budget Forecast',
            desc: 'At current rate, Food budget will overshoot by ৳1,800.',
            icon: 'fa-chart-line',
            btnText: 'Adjust Budget',
            btnColor: '#ef4444',
            iconBg: '#fee2e2',
            iconColor: '#ef4444'
          },
          {
            title: 'Subscription Audit',
            desc: '3 recurring charges total ৳1,850/mo — review unused ones.',
            icon: 'fa-credit-card',
            btnText: 'Review',
            btnColor: '#2563eb',
            iconBg: '#dbeafe',
            iconColor: '#2563eb'
          },
          {
            title: 'Price Benchmarking',
            desc: 'Your avg coffee spend is 28% above similar users.',
            icon: 'fa-wand-magic-sparkles',
            btnText: 'See Tips',
            btnColor: '#10b981',
            iconBg: '#d1fae5',
            iconColor: '#10b981'
          }
        ]
      });
    }, 50);
  });
}

// =========================================================================
// DOM RENDER LOGIC
// =========================================================================
document.addEventListener('DOMContentLoaded', async () => {
  // Fetch dummy data
  const data = await fetchAnalyticsData();

  // Bind user details
  document.getElementById('userName').textContent = data.user.name;
  document.getElementById('userEmail').textContent = data.user.email;
  document.getElementById('userAvatar').textContent = data.user.avatarInitial;
  document.getElementById('dateRangeText').textContent = data.dateRange;

  // Bind section headers
  document.getElementById('categoryTitle').textContent = data.donutOverview.title;
  document.getElementById('categorySubtitle').textContent = data.donutOverview.subtitle;
  document.getElementById('trendTitle').textContent = data.trendOverview.title;
  document.getElementById('trendSubtitle').textContent = data.trendOverview.subtitle;

  // Render category breakdown list
  const listContainer = document.getElementById('categoryBreakdownContainer');
  listContainer.innerHTML = data.donutOverview.categories.map(cat => `
    <div class="breakdown-item">
      <div class="breakdown-left">
        <span class="dot" style="background-color: ${cat.color}"></span>
        <span>${cat.name}</span>
      </div>
      <div class="breakdown-right">
        <span>${cat.percent}%</span>
        <strong>৳${cat.amount.toLocaleString()}</strong>
      </div>
    </div>
  `).join('');

  // Render AI insights cards
  const insightsContainer = document.getElementById('insightsContainer');
  insightsContainer.innerHTML = data.insights.map(item => `
    <div class="insight-card">
      <div>
        <div class="insight-icon-wrap" style="background: ${item.iconBg}; color: ${item.iconColor};">
          <i class="fa-solid ${item.icon}"></i>
        </div>
        <h4>${item.title}</h4>
        <p>${item.desc}</p>
      </div>
      <div class="insight-actions">
        <button class="btn-insight" style="background: ${item.btnColor};">${item.btnText}</button>
        <button class="btn-close-insight">&times;</button>
      </div>
    </div>
  `).join('');

  // Initialize Donut Chart
  new Chart(document.getElementById('categoryDonutChart'), {
    type: 'doughnut',
    data: {
      labels: data.donutOverview.categories.map(c => c.name),
      datasets: [{
        data: data.donutOverview.categories.map(c => c.amount),
        backgroundColor: data.donutOverview.categories.map(c => c.color),
        borderWidth: 0,
        hoverOffset: 4
      }]
    },
    options: {
      cutout: '72%',
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } }
    }
  });

  // Initialize Bar Chart
  new Chart(document.getElementById('monthlyTrendChart'), {
    type: 'bar',
    data: {
      labels: data.trendOverview.labels,
      datasets: data.trendOverview.datasets.map(ds => ({
        ...ds,
        borderRadius: 4
      }))
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { grid: { display: false } },
        y: { 
          ticks: { callback: v => '৳' + v / 1000 + 'k' },
          grid: { color: '#f1f5f9' }
        }
      },
      plugins: { 
        legend: { position: 'bottom', labels: { boxWidth: 12 } } 
      }
    }
  });

  // Logout listener
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      window.location.href = 'index.html';
    });
  }


});