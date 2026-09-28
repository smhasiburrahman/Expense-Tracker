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
    
    if(catRes.ok) categoriesData = await catRes.json();
    if(recRes.ok) recurringData = await recRes.json();
    if(walRes.ok) walletsData = await walRes.json();

  } catch(e) {
    console.error("API error:", e);
  }
}

function renderBudgetsUI() {
  // Render Categories Table
  const budgetTbody = document.getElementById('budgetsTableBody');
  if (budgetTbody) {
    budgetTbody.innerHTML = categoriesData.map(b => `
      <tr>
        <td>
          <span class="table-cat" style="color: ${b.color};">
            <i class="fa-solid ${b.icon}"></i> ${b.name}
          </span>
        </td>
        <td><strong>৳${b.spent.toLocaleString()}</strong></td>
        <td>
          <span class="budget-input-pill">৳ ${b.cap.toLocaleString()}</span>
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
            <i class="fa-solid fa-trash" onclick="deleteCategory(${b.id})" title="Delete"></i>
          </div>
        </td>
      </tr>
    `).join('');
  }

  // Render Recurring Table
  const recurTbody = document.getElementById('recurringTableBody');
  if (recurTbody) {
    recurTbody.innerHTML = recurringData.map(r => `
      <tr>
        <td><i class="fa-solid ${r.icon}" style="margin-right: 8px; color: #64748b;"></i> <strong>${r.name}</strong></td>
        <td><strong>৳${r.amount.toLocaleString()}</strong></td>
        <td><span class="budget-badge ${r.freqClass}">${r.freq}</span></td>
        <td style="color: #64748b;">${r.date}</td>
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

// Delete helper functions
window.deleteCategory = async function(id) {
  if (confirm("Delete this budget category?")) {
    const token = localStorage.getItem('token');
    await fetch(`/api/categories/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
    await fetchBudgetsData();
    renderBudgetsUI();
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

    if (nameVal && capVal > 0) {
      const token = localStorage.getItem('token');
      await fetch('/api/categories', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name: nameVal, monthlyBudgetCap: capVal, icon: selectedCatIcon, colorHex: selectedCatColor }) 
      });
      catModal.classList.remove('open');
      await fetchBudgetsData();
      renderBudgetsUI();
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