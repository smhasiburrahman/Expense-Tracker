// =========================================================================
// DEMO STATE DATA (Acting as backend database)
// =========================================================================

let categoriesData = [
  { category: 'Food & Dining', icon: 'fa-utensils', color: '#f59e0b', spent: 8200, cap: 12000, progress: 68, status: 'On Track', statusClass: 'badge-on-track' },
  { category: 'Transport', icon: 'fa-car', color: '#8b5cf6', spent: 3100, cap: 4000, progress: 78, status: 'On Track', statusClass: 'badge-on-track' },
  { category: 'Groceries', icon: 'fa-cart-shopping', color: '#10b981', spent: 4800, cap: 5000, progress: 96, status: 'Warning', statusClass: 'badge-warning' },
  { category: 'Entertainment', icon: 'fa-film', color: '#ec4899', spent: 1200, cap: 2000, progress: 60, status: 'On Track', statusClass: 'badge-on-track' },
  { category: 'Utilities', icon: 'fa-bolt', color: '#a855f7', spent: 2800, cap: 3500, progress: 80, status: 'Warning', statusClass: 'badge-warning' },
  { category: 'Shopping', icon: 'fa-bag-shopping', color: '#ef4444', spent: 5600, cap: 6000, progress: 93, status: 'Warning', statusClass: 'badge-warning' }
];

let recurringData = [
  { name: 'Monthly Rent', icon: 'fa-house', amount: 18000, freq: 'Monthly', freqClass: 'badge-blue', date: 'Aug 1, 2025' },
  { name: 'Internet — Grameenphone', icon: 'fa-wifi', amount: 700, freq: 'Monthly', freqClass: 'badge-blue', date: 'Aug 5, 2025' },
  { name: 'Netflix Subscription', icon: 'fa-film', amount: 650, freq: 'Monthly', freqClass: 'badge-blue', date: 'Aug 20, 2025' },
  { name: 'Mobile Recharge', icon: 'fa-phone', amount: 300, freq: 'Weekly', freqClass: 'badge-purple', date: 'Jul 28, 2025' }
];

// Active modal selections
let selectedCatIcon = 'fa-utensils';
let selectedCatColor = '#f59e0b';
let selectedRecurIcon = 'fa-house';

// =========================================================================
// API CLIENT FUNCTION (Uncomment when backend is ready)
// =========================================================================
async function fetchBudgetsData() {
  /*
  // -----------------------------------------------------------------------
  // TODO: BACKEND API CONNECTION
  // -----------------------------------------------------------------------
  try {
    const res = await fetch('/api/budgets');
    return await res.json();
  } catch(e) {
    console.error("API error:", e);
  }
  */

  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ categories: categoriesData, recurring: recurringData });
    }, 40);
  });
}

// =========================================================================
// RENDER UI FUNCTIONS
// =========================================================================

function renderBudgetsUI() {
  // Render Categories Table
  const budgetTbody = document.getElementById('budgetsTableBody');
  if (budgetTbody) {
    budgetTbody.innerHTML = categoriesData.map((b, index) => `
      <tr>
        <td>
          <span class="table-cat" style="color: ${b.color};">
            <i class="fa-solid ${b.icon}"></i> ${b.category}
          </span>
        </td>
        <td><strong>৳${b.spent.toLocaleString()}</strong></td>
        <td>
          <span class="budget-input-pill">৳ ${b.cap.toLocaleString()} <i class="fa-solid fa-sort"></i></span>
        </td>
        <td>
          <div style="font-weight: 700; font-size: 0.78rem; margin-bottom: 3px; color: ${b.progress > 85 ? '#ea580c' : '#10b981'}">${b.progress}%</div>
          <div style="width: 120px; height: 5px; background: #f1f5f9; border-radius: 3px; overflow: hidden;">
            <div style="width: ${b.progress}%; height: 100%; background: ${b.progress > 85 ? '#ea580c' : '#10b981'};"></div>
          </div>
        </td>
        <td><span class="budget-badge ${b.statusClass}">${b.status}</span></td>
        <td>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 0.8rem; color: #64748b;">Soft</span>
            <label class="toggle-switch">
              <input type="checkbox" checked>
              <span class="slider"></span>
            </label>
          </div>
        </td>
        <td>
          <div class="action-icons">
            <i class="fa-solid fa-trash" onclick="deleteCategory(${index})" title="Delete"></i>
          </div>
        </td>
      </tr>
    `).join('');
  }

  // Render Recurring Table
  const recurTbody = document.getElementById('recurringTableBody');
  if (recurTbody) {
    recurTbody.innerHTML = recurringData.map((r, index) => `
      <tr>
        <td><i class="fa-solid ${r.icon}" style="margin-right: 8px; color: #64748b;"></i> <strong>${r.name}</strong></td>
        <td><strong>৳${r.amount.toLocaleString()}</strong></td>
        <td><span class="budget-badge ${r.freqClass}">${r.freq}</span></td>
        <td style="color: #64748b;">${r.date}</td>
        <td>
          <div class="action-icons">
            <i class="fa-solid fa-trash" onclick="deleteRecurring(${index})" title="Delete"></i>
          </div>
        </td>
      </tr>
    `).join('');
  }
}

// Delete helper functions
window.deleteCategory = function(index) {
  if (confirm("Delete this budget category?")) {
    categoriesData.splice(index, 1);
    renderBudgetsUI();
  }
};

window.deleteRecurring = function(index) {
  if (confirm("Delete this recurring payment?")) {
    recurringData.splice(index, 1);
    renderBudgetsUI();
  }
};

// Update preview box inside Category Modal
function updateCategoryPreview() {
  const name = document.getElementById('catNameInput').value.trim() || 'Category Name';
  const cap = Number(document.getElementById('catCapInput').value) || 0;

  document.getElementById('catPreviewName').textContent = name;
  document.getElementById('catPreviewCap').textContent = `Budget cap: ৳${cap.toLocaleString()}`;

  const iconWrap = document.getElementById('catPreviewIconWrap');
  iconWrap.style.backgroundColor = `${selectedCatColor}22`;
  iconWrap.style.color = selectedCatColor;

  const iconEl = document.getElementById('catPreviewIcon');
  iconEl.className = `fa-solid ${selectedCatIcon}`;
}

// =========================================================================
// EVENT LISTENERS & MODAL CONTROLS
// =========================================================================

document.addEventListener('DOMContentLoaded', async () => {
  await fetchBudgetsData();
  renderBudgetsUI();

  // Modal Backdrops
  const catModal = document.getElementById('addCategoryModalBackdrop');
  const recurModal = document.getElementById('addRecurringModalBackdrop');

  // Open & Close Buttons
  document.getElementById('openAddCategoryModal').addEventListener('click', () => {
    document.getElementById('catNameInput').value = '';
    document.getElementById('catCapInput').value = '';
    updateCategoryPreview();
    catModal.classList.add('open');
  });

  document.getElementById('closeCatModalBtn').addEventListener('click', () => catModal.classList.remove('open'));
  document.getElementById('cancelCatModalBtn').addEventListener('click', () => catModal.classList.remove('open'));
  catModal.addEventListener('click', (e) => {
    if (e.target === catModal) catModal.classList.remove('open');
  });

  document.getElementById('openAddRecurringModal').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('recurNameInput').value = '';
    document.getElementById('recurAmountInput').value = '';
    document.getElementById('recurDateInput').value = new Date().toISOString().split('T')[0];
    recurModal.classList.add('open');
  });

  document.getElementById('closeRecurModalBtn').addEventListener('click', () => recurModal.classList.remove('open'));
  document.getElementById('cancelRecurModalBtn').addEventListener('click', () => recurModal.classList.remove('open'));
  recurModal.addEventListener('click', (e) => {
    if (e.target === recurModal) recurModal.classList.remove('open');
  });

  // Real-time Preview Typing Handlers
  document.getElementById('catNameInput').addEventListener('input', updateCategoryPreview);
  document.getElementById('catCapInput').addEventListener('input', updateCategoryPreview);

  // Category Modal: Icon selection
  document.querySelectorAll('.icon-selector-grid-cat .icon-pill-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.icon-selector-grid-cat .icon-pill-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedCatIcon = btn.getAttribute('data-icon');
      updateCategoryPreview();
    });
  });

  // Category Modal: Color selection
  document.querySelectorAll('.color-palette .color-swatch').forEach(swatch => {
    swatch.addEventListener('click', () => {
      document.querySelectorAll('.color-palette .color-swatch').forEach(s => s.classList.remove('active'));
      swatch.classList.add('active');
      selectedCatColor = swatch.getAttribute('data-color');
      updateCategoryPreview();
    });
  });

  // Recurring Modal: Icon selection
  document.querySelectorAll('.icon-selector-grid-recur .icon-pill-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.icon-selector-grid-recur .icon-pill-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedRecurIcon = btn.getAttribute('data-icon');
    });
  });

  // Form 1 Submit: Add Category
  document.getElementById('addCategoryForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const nameVal = document.getElementById('catNameInput').value.trim();
    const capVal = Number(document.getElementById('catCapInput').value);

    if (nameVal && capVal > 0) {
      // -------------------------------------------------------------------
      // API CALL (Uncomment for backend)
      // -------------------------------------------------------------------
      /*
      // await fetch('/api/categories', { method: 'POST', body: JSON.stringify({ name: nameVal, cap: capVal, icon: selectedCatIcon, color: selectedCatColor }) });
      */

      categoriesData.push({
        category: nameVal,
        icon: selectedCatIcon,
        color: selectedCatColor,
        spent: 0,
        cap: capVal,
        progress: 0,
        status: 'On Track',
        statusClass: 'badge-on-track'
      });

      catModal.classList.remove('open');
      renderBudgetsUI();
    }
  });

  // Form 2 Submit: Add Recurring Transaction
  document.getElementById('addRecurringForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const nameVal = document.getElementById('recurNameInput').value.trim();
    const amountVal = Number(document.getElementById('recurAmountInput').value);
    const freqVal = document.getElementById('recurFreqSelect').value;
    const dateVal = document.getElementById('recurDateInput').value;

    if (nameVal && amountVal > 0) {
      // -------------------------------------------------------------------
      // API CALL (Uncomment for backend)
      // -------------------------------------------------------------------
      /*
      // await fetch('/api/recurring', { method: 'POST', body: JSON.stringify({ name: nameVal, amount: amountVal, frequency: freqVal, date: dateVal, icon: selectedRecurIcon }) });
      */

      recurringData.push({
        name: nameVal,
        icon: selectedRecurIcon,
        amount: amountVal,
        freq: freqVal,
        freqClass: freqVal === 'Monthly' ? 'badge-blue' : 'badge-purple',
        date: dateVal || 'Next Month'
      });

      recurModal.classList.remove('open');
      renderBudgetsUI();
    }
  });

  // Logout listener
  document.getElementById('logoutBtn').addEventListener('click', () => {
    window.location.href = 'index.html';
  });

 
});