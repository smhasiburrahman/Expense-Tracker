// Analytics Engine for Financial Bestie

let currentFilter = 'monthly';
let currentStartDate = '';
let currentEndDate = '';
let currentAnalyticsData = null;

let donutChartInstance = null;
let trendChartInstance = null;

document.addEventListener('DOMContentLoaded', async () => {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = 'index.html';
    return;
  }

  // Setup Logout
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = 'index.html';
    });
  }

  // Setup Filter Tabs (Weekly, Monthly, Custom Range)
  const filterTabs = document.querySelectorAll('#analyticsFilterTabs .seg-btn');
  const customRangePicker = document.getElementById('customRangePicker');
  const customStartDateInput = document.getElementById('customStartDate');
  const customEndDateInput = document.getElementById('customEndDate');
  const applyCustomRangeBtn = document.getElementById('applyCustomRangeBtn');

  filterTabs.forEach(btn => {
    btn.addEventListener('click', () => {
      filterTabs.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const filterType = btn.getAttribute('data-filter');
      currentFilter = filterType;

      if (filterType === 'custom') {
        customRangePicker.style.display = 'inline-flex';
        if (!customStartDateInput.value && currentAnalyticsData) {
          customStartDateInput.value = currentAnalyticsData.startDate;
          customEndDateInput.value = currentAnalyticsData.endDate;
        }
        if (customStartDateInput.value && customEndDateInput.value) {
          currentStartDate = customStartDateInput.value;
          currentEndDate = customEndDateInput.value;
          loadAnalytics('custom', currentStartDate, currentEndDate);
        } else {
          customStartDateInput.focus();
        }
      } else {
        customRangePicker.style.display = 'none';
        loadAnalytics(filterType);
      }
    });
  });

  function applyCustomDateFilter() {
    const start = customStartDateInput.value;
    const end = customEndDateInput.value;
    if (!start || !end) {
      alert('Please select both a start date and an end date.');
      return;
    }
    if (start > end) {
      alert('Start date cannot be after end date.');
      return;
    }
    currentStartDate = start;
    currentEndDate = end;
    loadAnalytics('custom', start, end);
  }

  // Apply Custom Range Button
  if (applyCustomRangeBtn) {
    applyCustomRangeBtn.addEventListener('click', applyCustomDateFilter);
  }

  // Also support Enter key & change event on inputs
  [customStartDateInput, customEndDateInput].forEach(input => {
    if (input) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          applyCustomDateFilter();
        }
      });
      input.addEventListener('change', () => {
        const start = customStartDateInput.value;
        const end = customEndDateInput.value;
        if (start && end && start <= end) {
          currentStartDate = start;
          currentEndDate = end;
          loadAnalytics('custom', start, end);
        }
      });
    }
  });

  // Topbar Date Selector toggles custom range
  const topbarDateSelector = document.getElementById('topbarDateSelector');
  if (topbarDateSelector) {
    topbarDateSelector.addEventListener('click', () => {
      const customTab = document.querySelector('#analyticsFilterTabs [data-filter="custom"]');
      if (customTab) {
        customTab.click();
      }
    });
  }

  // Setup Export Buttons (Topbar export remains a purely visual UI placeholder)
  const filterExportBtn = document.getElementById('filterExportBtn');
  if (filterExportBtn) filterExportBtn.addEventListener('click', exportAnalyticsReport);

  // Initial Data Load
  await loadAnalytics('monthly');
});

// Load Analytics from API
async function loadAnalytics(filter, start, end) {
  const token = localStorage.getItem('token');
  const dateRangeText = document.getElementById('dateRangeText');
  const applyBtn = document.getElementById('applyCustomRangeBtn');

  if (dateRangeText) dateRangeText.textContent = 'Updating...';
  if (applyBtn && filter === 'custom') {
    applyBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Applying...';
    applyBtn.disabled = true;
  }

  try {
    let url = `/api/analytics?filter=${encodeURIComponent(filter || 'monthly')}`;
    if (start && end) {
      url += `&startDate=${encodeURIComponent(start)}&endDate=${encodeURIComponent(end)}`;
    }

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

    currentAnalyticsData = await res.json();
    renderAnalytics(currentAnalyticsData);
  } catch (err) {
    console.error('Failed to load analytics:', err);
    if (dateRangeText) dateRangeText.textContent = 'Error loading analytics';
  } finally {
    if (applyBtn) {
      applyBtn.innerHTML = '<i class="fa-solid fa-check"></i> Apply';
      applyBtn.disabled = false;
    }
  }
}

// Render Analytics Page
function renderAnalytics(data) {
  if (!data) return;

  // 1. User Profile Details
  if (data.user) {
    const nameEl = document.getElementById('userName');
    const emailEl = document.getElementById('userEmail');
    const avatarEl = document.getElementById('userAvatar');
    if (nameEl) nameEl.textContent = data.user.name || 'User';
    if (emailEl) emailEl.textContent = data.user.email || '';
    if (avatarEl) avatarEl.textContent = data.user.avatarInitial || 'U';
  }

  // 2. Date Range Header & Inputs
  const dateRangeText = document.getElementById('dateRangeText');
  const formattedRange = (window.Localization && data.startDate && data.endDate) 
    ? window.Localization.formatDateRange(data.startDate, data.endDate) 
    : data.dateRange;
  if (dateRangeText) dateRangeText.textContent = formattedRange;

  const customStartDateInput = document.getElementById('customStartDate');
  const customEndDateInput = document.getElementById('customEndDate');
  const isEditingDates = document.activeElement === customStartDateInput || document.activeElement === customEndDateInput;
  if (!isEditingDates) {
    if (customStartDateInput && data.startDate) customStartDateInput.value = data.startDate;
    if (customEndDateInput && data.endDate) customEndDateInput.value = data.endDate;
  }

  // 3. Spending by Category (Donut Chart & Breakdown)
  const categoryTitle = document.getElementById('categoryTitle');
  const categorySubtitle = document.getElementById('categorySubtitle');
  const donutWrapper = document.getElementById('donutChartWrapper');
  const emptyState = document.getElementById('categoryEmptyState');
  const breakdownContainer = document.getElementById('categoryBreakdownContainer');

  const totalExpense = parseFloat(data.donutOverview?.totalAmount || 0);
  const categories = data.donutOverview?.categories || [];

  if (categoryTitle) categoryTitle.textContent = data.donutOverview?.title || 'Spending by Category';
  if (categorySubtitle) {
    const formattedTotal = window.Localization ? window.Localization.formatMoney(totalExpense, 'BDT') : `৳${totalExpense.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    categorySubtitle.textContent = `${formattedRange} · ${formattedTotal} total`;
  }

  if (categories.length === 0 || totalExpense === 0) {
    if (donutWrapper) donutWrapper.style.display = 'none';
    if (emptyState) emptyState.style.display = 'block';
    if (breakdownContainer) breakdownContainer.innerHTML = '';
    if (donutChartInstance) {
      donutChartInstance.destroy();
      donutChartInstance = null;
    }
  } else {
    if (donutWrapper) donutWrapper.style.display = 'block';
    if (emptyState) emptyState.style.display = 'none';

    // Render Breakdown List
    if (breakdownContainer) {
      breakdownContainer.innerHTML = categories.map(cat => {
        const catAmt = parseFloat(cat.amount || 0);
        const formattedAmt = window.Localization ? window.Localization.formatMoney(catAmt, 'BDT') : `৳${catAmt.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
        return `
          <div class="breakdown-item">
            <div class="breakdown-left">
              <span class="dot" style="background-color: ${cat.color}"></span>
              <span>${escapeHtml(cat.name)}</span>
            </div>
            <div class="breakdown-right">
              <span>${cat.percent}%</span>
              <strong>${formattedAmt}</strong>
            </div>
          </div>
        `;
      }).join('');
    }

    // Render or Update Donut Chart
    const canvas = document.getElementById('categoryDonutChart');
    if (canvas) {
      if (donutChartInstance) donutChartInstance.destroy();

      donutChartInstance = new Chart(canvas, {
        type: 'doughnut',
        data: {
          labels: categories.map(c => c.name),
          datasets: [{
            data: categories.map(c => parseFloat(c.amount || 0)),
            backgroundColor: categories.map(c => c.color),
            borderWidth: 2,
            borderColor: '#ffffff',
            hoverOffset: 6
          }]
        },
        options: {
          cutout: '72%',
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: function (ctx) {
                  const val = ctx.raw || 0;
                  const pct = totalExpense > 0 ? Math.round((val / totalExpense) * 100) : 0;
                  const formatted = window.Localization ? window.Localization.formatMoney(val, 'BDT') : `৳${val.toLocaleString()}`;
                  return ` ${formatted} (${pct}%)`;
                }
              }
            }
          }
        }
      });
    }
  }

  // 4. Monthly Spending Trend Bar Chart
  const trendTitle = document.getElementById('trendTitle');
  const trendSubtitle = document.getElementById('trendSubtitle');
  if (trendTitle) trendTitle.textContent = data.trendOverview?.title || 'Monthly Spending Trend';
  if (trendSubtitle) trendSubtitle.textContent = data.trendOverview?.subtitle || 'Last 6 Months · by category';

  const trendCanvas = document.getElementById('monthlyTrendChart');
  if (trendCanvas && data.trendOverview) {
    if (trendChartInstance) trendChartInstance.destroy();

    trendChartInstance = new Chart(trendCanvas, {
      type: 'bar',
      data: {
        labels: data.trendOverview.labels || [],
        datasets: (data.trendOverview.datasets || []).map(ds => ({
          label: ds.label,
          data: (ds.data || []).map(v => window.Localization ? window.Localization.convert(v, 'BDT') : v),
          backgroundColor: ds.backgroundColor,
          borderRadius: 6,
          barPercentage: 0.65
        }))
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            grid: { display: false },
            ticks: { font: { family: 'Inter', size: 11 } }
          },
          y: {
            beginAtZero: true,
            suggestedMax: 500,
            ticks: {
              precision: 0,
              font: { family: 'Inter', size: 11 },
              callback: function (val) {
                const sym = window.Localization ? window.Localization.getCurrencySymbol() : '৳';
                if (Math.abs(val) >= 1000) return sym + (val / 1000).toFixed(0) + 'k';
                return sym + Math.round(val);
              }
            },
            grid: { color: '#f1f5f9' }
          }
        },
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              boxWidth: 12,
              padding: 16,
              font: { family: 'Inter', size: 12 }
            }
          },
          tooltip: {
            callbacks: {
              label: function (ctx) {
                const sym = window.Localization ? window.Localization.getCurrencySymbol() : '৳';
                const val = ctx.raw || 0;
                const formatted = window.Localization 
                  ? window.Localization.formatMoney(val, window.Localization.getCurrencyCode(), { noConvert: true }) 
                  : `${sym}${val.toLocaleString()}`;
                return ` ${ctx.dataset.label}: ${formatted}`;
              }
            }
          }
        }
      }
    });
  }

  // 5. Dynamic AI Insights Cards
  const insightsContainer = document.getElementById('insightsContainer');
  if (insightsContainer && data.insights) {
    function formatInsightDesc(desc) {
      if (!desc) return '';
      return desc.replace(/৳([\d,]+(\.\d+)?)/g, (match, numStr) => {
        const num = parseFloat(numStr.replace(/,/g, ''));
        return window.Localization ? window.Localization.formatMoney(num, 'BDT', { decimals: 0 }) : match;
      });
    }

    insightsContainer.innerHTML = data.insights.map(item => `
      <div class="insight-card">
        <div>
          <div class="insight-icon-wrap" style="background: ${item.iconBg || '#d1fae5'}; color: ${item.iconColor || '#10b981'};">
            <i class="fa-solid ${item.icon}"></i>
          </div>
          <h4>${escapeHtml(item.title)}</h4>
          <p>${escapeHtml(formatInsightDesc(item.desc))}</p>
        </div>
        <div class="insight-actions">
          <button class="btn-insight" style="background: ${item.btnColor || '#10b981'};" onclick="handleInsightAction('${item.actionUrl || ''}', '${escapeHtml(item.title)}')">
            ${escapeHtml(item.btnText || 'Explore')}
          </button>
          <button class="btn-close-insight" onclick="dismissInsight(this)" title="Dismiss">&times;</button>
        </div>
      </div>
    `).join('');
  }
}

// Action Handler for AI Insights
window.handleInsightAction = function (actionUrl, title) {
  if (actionUrl) {
    window.location.href = actionUrl;
  } else {
    alert(`AI Insight: ${title}\nCheck the Budgets and Dashboard pages for detailed management.`);
  }
};

// Dismiss Insight Card locally
window.dismissInsight = function (btn) {
  const card = btn.closest('.insight-card');
  if (card) {
    card.style.opacity = '0';
    card.style.transform = 'scale(0.95)';
    card.style.transition = 'all 0.2s ease';
    setTimeout(() => card.remove(), 200);
  }
};

// Export Analytics Report to CSV
function exportAnalyticsReport() {
  if (!currentAnalyticsData) {
    alert('No analytics data available to export.');
    return;
  }

  const d = currentAnalyticsData;
  const categories = d.donutOverview?.categories || [];
  const transactions = d.transactions || [];
  const insights = d.insights || [];

  const formatCell = (val) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const lines = [];

  // Report Header
  lines.push(['FINANCIAL BESTIE - ANALYTICS REPORT'].map(formatCell).join(','));
  lines.push(['Filter Mode', d.filter ? d.filter.toUpperCase() : 'MONTHLY'].map(formatCell).join(','));
  lines.push(['Date Range', d.dateRange].map(formatCell).join(','));
  lines.push(['Total Period Expenses (BDT)', d.donutOverview?.totalAmount || 0].map(formatCell).join(','));
  lines.push(['Generated At', new Date().toLocaleString()].map(formatCell).join(','));
  lines.push([]);

  // Section 1: Category Breakdown
  lines.push(['--- SPENDING BY CATEGORY ---'].map(formatCell).join(','));
  lines.push(['Category', 'Amount (BDT)', 'Percentage'].map(formatCell).join(','));
  if (categories.length === 0) {
    lines.push(['No expense data recorded in this period', 0, '0%'].map(formatCell).join(','));
  } else {
    categories.forEach(c => {
      lines.push([c.name, c.amount, `${c.percent}%`].map(formatCell).join(','));
    });
  }
  lines.push([]);

  // Section 2: Detailed Transactions
  lines.push(['--- DETAILED TRANSACTIONS IN PERIOD ---'].map(formatCell).join(','));
  lines.push(['Transaction ID', 'Date', 'Description', 'Category', 'Wallet', 'Amount (BDT)', 'Type'].map(formatCell).join(','));
  if (transactions.length === 0) {
    lines.push(['-', '-', 'No transactions in this period', '-', '-', 0, '-'].map(formatCell).join(','));
  } else {
    transactions.forEach(t => {
      lines.push([t.id, t.date, t.description, t.category, t.wallet, t.amount, t.type].map(formatCell).join(','));
    });
  }
  lines.push([]);

  // Section 3: AI Insights
  lines.push(['--- AI INSIGHTS ---'].map(formatCell).join(','));
  lines.push(['Insight Type', 'Analysis & Recommendation'].map(formatCell).join(','));
  insights.forEach(i => {
    lines.push([i.title, i.desc].map(formatCell).join(','));
  });

  const csvContent = lines.map(row => row.join ? row.join(',') : row).join('\r\n');

  // Trigger Browser Download with UTF-8 BOM
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const filename = `analytics_report_${d.startDate}_to_${d.endDate}.csv`;
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Utility: HTML Escaper
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
  if (currentAnalyticsData) {
    renderAnalytics(currentAnalyticsData);
    if (window.Localization) window.Localization.applyToDOM();
  }
});