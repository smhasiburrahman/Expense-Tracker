let categoriesData = [];
let recurringData = [];
let walletsData = [];

// Active modal selections
let selectedCatIcon = 'fa-utensils';
let selectedCatColor = '#f59e0b';
let selectedRecurIcon = 'fa-house';

async function fetchBudgetsData() {
  const token = localStorage.getItem('token');
  if(!token) {
    window.location.href = 'index.html';
    return;
  }

  try {
    const [catRes, recRes, walRes] = await Promise.all([
      fetch('/api/categories', { headers: { 'Authorization': `Bearer ${token}` } }),
      fetch('/api/recurring', { headers: { 'Authorization': `Bearer ${token}` } }),
      fetch('/api/wallets', { headers: { 'Authorization': `Bearer ${token}` } })
    ]);
    
    if(catRes.ok) {
      categoriesData = await catRes.json();
      window.categoriesData = categoriesData;
    }
    if(recRes.ok) recurringData = await recRes.json();
    if(walRes.ok) {
      walletsData = await walRes.json();
      window.walletsData = walletsData;
    }

  } catch(e) {
    console.error("API error:", e);
  }
}

function renderBudgetsUI() {
  // Render Categories Table
  const budgetTbody = document.getElementById('budgetsTableBody');
  if (budgetTbody) {
    budgetTbody.innerHTML = categoriesData.map(b => {
      const isHard = b.limitType === 'HARD';
      const isOver = b.spent > b.cap && b.cap > 0;
      const progColor = isOver ? '#ef4444' : (b.progress >= 80 ? '#ea580c' : '#10b981');
      const progressPercent = Math.min(b.progress, 100);

      return `
      <tr>
        <td>
          <span class="table-cat" style="color: ${b.color};">
            <i class="fa-solid ${b.icon}"></i> ${b.name}
          </span>
        </td>
        <td><strong>${window.Localization ? window.Localization.formatMoney(b.spent, 'BDT') : `৳${b.spent.toLocaleString()}`}</strong></td>
        <td>
          <span class="budget-input-pill">${window.Localization ? window.Localization.formatMoney(b.cap, 'BDT') : `৳ ${b.cap.toLocaleString()}`}</span>
        </td>
        <td>
          <div style="font-weight: 700; font-size: 0.78rem; margin-bottom: 3px; color: ${progColor};">${b.progress}%</div>
          <div style="width: 120px; height: 5px; background: #f1f5f9; border-radius: 3px; overflow: hidden;">
            <div style="width: ${progressPercent}%; height: 100%; background: ${progColor};"></div>
          </div>
        </td>
        <td><span class="budget-badge ${b.statusClass}">${b.status}</span></td>
        <td>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="limit-pill-tag ${isHard ? 'hard' : 'soft'}">${isHard ? 'Hard' : 'Soft'}</span>
            <label class="toggle-switch" title="Toggle Soft / Hard Limit (Current: ${isHard ? 'Hard limit - blocks new expenses exceeding cap' : 'Soft limit - allows spending past cap'})">
              <input type="checkbox" ${isHard ? 'checked' : ''} onchange="toggleLimitType(${b.id}, this.checked)">
              <span class="slider" style="${isHard ? 'background-color: #ef4444;' : ''}"></span>
            </label>
          </div>
        </td>
        <td>
          <div class="action-icons">
            <i class="fa-solid fa-trash" onclick="deleteCategory(${b.id})" title="Delete"></i>
          </div>
        </td>
      </tr>
    `;
    }).join('');
  }

  // Render Recurring Table
  const recurTbody = document.getElementById('recurringTableBody');
  if (recurTbody) {
    recurTbody.innerHTML = recurringData.map(r => `
      <tr>
        <td><i class="fa-solid ${r.icon}" style="margin-right: 8px; color: #64748b;"></i> <strong>${r.name}</strong></td>
        <td><strong>${window.Localization ? window.Localization.formatMoney(r.amount, 'BDT') : `৳${r.amount.toLocaleString()}`}</strong></td>
        <td><span class="budget-badge ${r.freqClass}">${r.freq}</span></td>
        <td style="color: #64748b;">${window.Localization ? window.Localization.formatDate(r.date) : r.date}</td>
        <td>
          <div class="action-icons">
            <i class="fa-solid fa-trash" onclick="deleteRecurring(${r.id})" title="Delete"></i>
          </div>
        </td>
      </tr>
    `).join('');
  }

  // Populate wallets in recurring modal
  const walletSelect = document.getElementById('recurWalletSelect');
  if (walletSelect) {
    walletSelect.innerHTML = walletsData.map(w => `<option value="${w.id}">${w.name}</option>`).join('');
  }
}

// Toggle Limit Type (Soft <-> Hard)
window.toggleLimitType = async function(id, isHard) {
  const token = localStorage.getItem('token');
  const newType = isHard ? 'HARD' : 'SOFT';
  try {
    const res = await fetch(`/api/categories/${id}/limit-type`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ limitType: newType })
    });

    if (res.ok) {
      const cat = categoriesData.find(c => Number(c.id) === Number(id));
      const catName = cat ? cat.name : 'Category';
      if (cat) cat.limitType = newType;

      const toastMsg = newType === 'HARD'
        ? `"${catName}" is now set to Hard Limit (strictly blocks expenses over budget).`
        : `"${catName}" is now set to Soft Limit (allows spending past budget).`;

      if (window.showToast) {
        showToast(toastMsg, newType === 'HARD' ? 'info' : 'success');
      }

      await fetchBudgetsData();
      renderBudgetsUI();
      window.dispatchEvent(new CustomEvent('categoriesUpdated', { detail: { categories: categoriesData } }));
      if (typeof window.refreshExpenseModalCategories === 'function') {
        await window.refreshExpenseModalCategories();
      }
    } else {
      if (window.showToast) showToast('Failed to update Limit Type', 'error');
      await fetchBudgetsData();
      renderBudgetsUI();
    }
  } catch (err) {
    console.error('Error toggling limit type:', err);
    if (window.showToast) showToast('Network error updating Limit Type', 'error');
    await fetchBudgetsData();
    renderBudgetsUI();
  }
};

// Delete helper functions
window.deleteCategory = async function(id) {
  if (confirm("Delete this budget category?")) {
    const token = localStorage.getItem('token');
    const res = await fetch(`/api/categories/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
    if (res.ok) {
      await fetchBudgetsData();
      renderBudgetsUI();
      window.dispatchEvent(new CustomEvent('categoriesUpdated', { detail: { categories: categoriesData } }));
      if (typeof window.refreshExpenseModalCategories === 'function') {
        await window.refreshExpenseModalCategories();
      }
    }
  }
};

window.deleteRecurring = async function(id) {
  if (confirm("Delete this recurring payment?")) {
    const token = localStorage.getItem('token');
    await fetch(`/api/recurring/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
    await fetchBudgetsData();
    renderBudgetsUI();
  }
};

// Update preview box inside Category Modal
function updateCategoryPreview() {
  const name = document.getElementById('catNameInput').value.trim() || 'Category Name';
  const cap = Number(document.getElementById('catCapInput').value) || 0;
  const limitType = document.getElementById('catLimitTypeInput')?.value || 'SOFT';

  document.getElementById('catPreviewName').textContent = name;
  document.getElementById('catPreviewCap').textContent = `Budget cap: ${window.Localization ? window.Localization.formatMoney(cap, 'BDT') : `৳${cap.toLocaleString()}`} • ${limitType === 'HARD' ? 'Hard Limit' : 'Soft Limit'}`;

  const iconWrap = document.getElementById('catPreviewIconWrap');
  iconWrap.style.backgroundColor = `${selectedCatColor}22`;
  iconWrap.style.color = selectedCatColor;

  const iconEl = document.getElementById('catPreviewIcon');
  iconEl.className = `fa-solid ${selectedCatIcon}`;

  const limitBadge = document.getElementById('catPreviewLimitBadge');
  if (limitBadge) {
    limitBadge.textContent = limitType === 'HARD' ? 'Hard' : 'Soft';
    limitBadge.style.background = limitType === 'HARD' ? '#fee2e2' : '#f0fdf4';
    limitBadge.style.color = limitType === 'HARD' ? '#dc2626' : '#16a34a';
  }
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
    const limitInput = document.getElementById('catLimitTypeInput');
    if (limitInput) limitInput.value = 'SOFT';
    document.getElementById('limitOptSoft')?.classList.add('active');
    document.getElementById('limitOptHard')?.classList.remove('active');
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
    if(walletsData.length === 0) {
      alert("Please add a wallet first before creating recurring transactions.");
      return;
    }
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

  // Limit Type Selector Handlers
  document.getElementById('limitOptSoft')?.addEventListener('click', () => {
    document.getElementById('limitOptSoft').classList.add('active');
    document.getElementById('limitOptHard')?.classList.remove('active');
    const limitInput = document.getElementById('catLimitTypeInput');
    if (limitInput) limitInput.value = 'SOFT';
    updateCategoryPreview();
  });

  document.getElementById('limitOptHard')?.addEventListener('click', () => {
    document.getElementById('limitOptHard').classList.add('active');
    document.getElementById('limitOptSoft')?.classList.remove('active');
    const limitInput = document.getElementById('catLimitTypeInput');
    if (limitInput) limitInput.value = 'HARD';
    updateCategoryPreview();
  });

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
  document.getElementById('addCategoryForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const nameVal = document.getElementById('catNameInput').value.trim();
    const capVal = Number(document.getElementById('catCapInput').value);
    const limitTypeVal = document.getElementById('catLimitTypeInput')?.value || 'SOFT';

    if (nameVal && capVal > 0) {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/categories', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ 
          name: nameVal, 
          monthlyBudgetCap: capVal, 
          icon: selectedCatIcon, 
          colorHex: selectedCatColor,
          limitType: limitTypeVal
        }) 
      });
      if (res.ok) {
        const newCat = await res.json().catch(() => null);
        catModal.classList.remove('open');
        await fetchBudgetsData();
        renderBudgetsUI();

        if (window.showToast) {
          showToast(`Budget category "${nameVal}" created successfully!`, 'success');
        }

        // Notify global category listeners and trigger modal dropdown re-fetch & re-render
        window.dispatchEvent(new CustomEvent('categoryCreated', { detail: newCat }));
        window.dispatchEvent(new CustomEvent('categoriesUpdated', { detail: { newCategory: newCat, categories: categoriesData } }));
        if (typeof window.refreshExpenseModalCategories === 'function') {
          await window.refreshExpenseModalCategories();
        }
      } else {
        if (window.showToast) showToast('Failed to create budget category.', 'error');
        else alert('Failed to create budget category.');
      }
    }
  });

  // Form 2 Submit: Add Recurring Transaction
  document.getElementById('addRecurringForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const nameVal = document.getElementById('recurNameInput').value.trim();
    const amountVal = Number(document.getElementById('recurAmountInput').value);
    const freqVal = document.getElementById('recurFreqSelect').value;
    const dateVal = document.getElementById('recurDateInput').value;
    const walletId = document.getElementById('recurWalletSelect').value;

    if (nameVal && amountVal > 0) {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/recurring', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name: nameVal, amount: amountVal, frequency: freqVal, nextChargeDate: dateVal, icon: selectedRecurIcon, walletId: walletId }) 
      });
      
      if(res.ok) {
        recurModal.classList.remove('open');
        await fetchBudgetsData();
        renderBudgetsUI();
      } else {
        alert(await res.text());
      }
    }
  });

  // Logout listener
  document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('token');
    window.location.href = 'index.html';
  });
});

// Listen for global localization changes
window.addEventListener('localizationChanged', () => {
  renderBudgetsUI();
  if (window.Localization) window.Localization.applyToDOM();
});