let walletsData = [];
let walletTransactions = []; // We will leave this empty for now until Transactions API is built

let selectedIcon = 'fa-money-bill-1';
let selectedColor = '#10b981';

async function fetchWalletsData() {
  const token = localStorage.getItem('token');
  if(!token) {
    window.location.href = 'index.html';
    return;
  }
  
  try {
    const [res, txRes] = await Promise.all([
        fetch('/api/wallets', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/transactions', { headers: { 'Authorization': `Bearer ${token}` } })
    ]);

    if (res.ok) {
        const data = await res.json();
        // map data to required format
        walletsData = data.map(w => ({
            id: w.id,
            name: w.name,
            balance: w.currentBalance,
            icon: w.icon,
            color: w.colorHex,
            heights: [40, 80, 60, 90] // dummy for now
        }));
    }
    
    if (txRes.ok) {
        const txData = await txRes.json();
        walletTransactions = txData;
    }
  } catch(e) {
    console.error("API error:", e);
  }
}

function renderWallets() {
  const container = document.getElementById('walletCardsContainer');
  if (!container) return;

  const cardsHtml = walletsData.map((w, index) => `
    <div class="wallet-box">
      <div class="wallet-card-head">
        <div class="wallet-icon" style="background-color: ${w.color}22; color: ${w.color};">
          <i class="fa-solid ${w.icon}"></i>
        </div>
        <button type="button" class="btn-edit-wallet-card" onclick="openWalletModalForEdit(${index})" title="Edit Wallet">
          <i class="fa-solid fa-pen"></i>
        </button>
      </div>

      <span class="wallet-box-name">${w.name}</span>
      <h3 class="wallet-box-amount">${window.Localization ? window.Localization.formatMoney(w.balance, 'BDT') : `৳${w.balance.toLocaleString()}`}</h3>

      <div class="wallet-bar-chart">
        ${w.heights.map(h => `<span style="height: ${h}%; background: ${w.color}; opacity: 0.65;"></span>`).join('')}
      </div>
    </div>
  `).join('');

  const addCardHtml = `
    <div class="wallet-box add-wallet-dashed" id="openAddWalletModalBtn">
      <div class="plus-icon"><i class="fa-solid fa-plus"></i></div>
      <span>Add Wallet</span>
    </div>
  `;

  container.innerHTML = cardsHtml + addCardHtml;
  document.getElementById('openAddWalletModalBtn').addEventListener('click', openWalletModalForAdd);
}

function renderTransactions() {
  const tbody = document.getElementById('walletTransactionsBody');
  if (!tbody) return;

  if (walletTransactions.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #64748b; padding: 2rem;">No transactions yet.</td></tr>`;
      return;
  }

  tbody.innerHTML = walletTransactions.map(t => {
      const catName = t.category ? t.category.name : 'Transfer';
      const catIcon = t.category ? t.category.icon : '💸';
      const catColor = t.category ? t.category.colorHex : '#94a3b8';
      const isExpense = t.transactionType === 'EXPENSE';
      const prefix = isExpense ? '-' : '+';
      const amountStr = `${prefix}${window.Localization ? window.Localization.formatMoney(t.convertedAmount || 0, 'BDT') : `৳${(t.convertedAmount || 0).toLocaleString()}`}`;
      const amountColor = isExpense ? 'amount-minus' : '';
      const formattedDate = window.Localization ? window.Localization.formatDate(t.transactionDate) : (t.transactionDate || '');
      
      return `
        <tr>
          <td><span class="table-cat" style="color: ${catColor}; background-color: ${catColor}22;">${catIcon && catIcon.startsWith('fa-') ? `<i class="fa-solid ${catIcon}"></i>` : catIcon} ${catName}</span></td>
          <td><strong>${t.description || 'No description'}</strong></td>
          <td><span class="wallet-badge">${t.wallet ? t.wallet.name : '-'}</span></td>
          <td class="${amountColor}">${amountStr}</td>
          <td class="date-col">${formattedDate}</td>
          <td>
            <div style="display: flex; gap: 10px;">
              <button onclick="editTransaction(${t.id})" style="background: none; border: none; color: #3b82f6; cursor: pointer;"><i class="fa-solid fa-pen"></i></button>
              <button onclick="deleteTransaction(${t.id})" style="background: none; border: none; color: #ef4444; cursor: pointer;"><i class="fa-solid fa-trash"></i></button>
            </div>
          </td>
        </tr>
      `;
  }).join('');
}

window.deleteTransaction = async function(id) {
    const tx = walletTransactions.find(t => t.id === id);
    const desc = tx ? `"${tx.description || 'Transaction'}"` : 'this transaction';
    const amount = tx ? (window.Localization ? window.Localization.formatMoney(tx.convertedAmount || tx.originalAmount || 0, 'BDT') : `৳${parseFloat(tx.convertedAmount || 0).toLocaleString()}`) : '';
    const wallet = tx && tx.wallet ? `wallet "${tx.wallet.name}"` : 'your wallet';

    const confirmed = confirm(
        `Are you sure you want to delete ${desc} (${amount})?\n\n` +
        `This will completely remove it from the system and:\n` +
        `• Refund ${amount} back to ${wallet}\n` +
        `• Update category spending and budget progress\n` +
        `• Recalculate your dashboard and analytics\n` +
        `• Remove it from transaction history`
    );

    if (confirmed) {
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
                await fetchWalletsData(); // re-fetch transactions and wallets
                renderWallets();
                renderTransactions();
            } else if (res.status === 401) {
                alert('Your session has expired. Please log in again.');
                localStorage.removeItem('token');
                localStorage.removeItem('currentUser');
                localStorage.removeItem('user');
                window.location.href = 'index.html';
            } else if (res.status === 403) {
                alert('Permission denied: You do not have permission to delete this transaction.');
                await fetchWalletsData();
                renderWallets();
                renderTransactions();
            } else {
                let errorMsg = 'Failed to delete transaction.';
                try {
                    const errData = await res.json();
                    if (errData && errData.message) errorMsg = errData.message;
                } catch (_) {}
                alert(errorMsg);
            }
        } catch (e) {
            console.error(e);
            alert('A network error occurred while deleting transaction.');
        }
    }
};

window.editTransaction = async function(id) {
    const token = localStorage.getItem('token');
    try {
        const [walletsRes, catsRes, txRes] = await Promise.all([
            fetch('/api/wallets', { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch('/api/categories', { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch(`/api/transactions/${id}`, { headers: { 'Authorization': `Bearer ${token}` } })
        ]);

        const wallets = await walletsRes.json();
        const categories = await catsRes.json();
        const tx = await txRes.json();

        const walletSelect = document.getElementById('editTxWalletSelect');
        const formatAmount = amt => window.Localization ? window.Localization.formatMoney(amt, 'BDT') : `৳${(amt || 0).toLocaleString()}`;
        walletSelect.innerHTML = (wallets || []).map(w => `<option value="${w.id}" ${w.id === tx.walletId ? 'selected' : ''}>${w.name} (${formatAmount(parseFloat(w.currentBalance || 0))})</option>`).join('');

        const catSelect = document.getElementById('editTxCategorySelect');
        catSelect.innerHTML = '<option value="">-- No Category --</option>' + (categories || []).map(c => `<option value="${c.id}" ${c.id === tx.categoryId ? 'selected' : ''}>${c.name}</option>`).join('');

        const currentCur = window.Localization ? window.Localization.getCurrencyCode() : 'BDT';
        const convertedAmt = window.Localization ? window.Localization.convert(parseFloat(tx.amount || tx.convertedAmount || 0), 'BDT', currentCur) : parseFloat(tx.amount || 0);

        document.getElementById('editTxId').value = tx.id;
        document.getElementById('editTxType').value = tx.transactionType || 'EXPENSE';
        document.getElementById('editTxAmount').value = currentCur === 'JPY' ? Math.round(convertedAmt) : convertedAmt.toFixed(2);
        document.getElementById('editTxDesc').value = tx.description || '';
        document.getElementById('editTxDate').value = tx.transactionDate;
        document.getElementById('editTxNote').value = tx.sourceNote || '';
        
        if (window.Localization) window.Localization.applyToDOM();

        document.getElementById('editTxModal').style.display = 'flex';
    } catch (err) {
        console.error('Failed to load transaction for edit:', err);
        alert('Failed to load transaction details.');
    }
};

document.getElementById('editTxForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('editTxId').value;
    const token = localStorage.getItem('token');

    const enteredAmount = Number(document.getElementById('editTxAmount').value);
    const currentCur = window.Localization ? window.Localization.getCurrencyCode() : 'BDT';
    const amountInBDT = window.Localization ? window.Localization.convert(enteredAmount, currentCur, 'BDT') : enteredAmount;

    const req = {
        amount: amountInBDT,
        description: document.getElementById('editTxDesc').value,
        walletId: Number(document.getElementById('editTxWalletSelect').value) || null,
        categoryId: Number(document.getElementById('editTxCategorySelect').value) || null,
        transactionDate: document.getElementById('editTxDate').value,
        sourceNote: document.getElementById('editTxNote').value,
        transactionType: document.getElementById('editTxType').value || 'EXPENSE'
    };

    const saveBtn = document.getElementById('saveWalletTxBtn');
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
    }

    try {
        const res = await fetch(`/api/transactions/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(req)
        });
        if (res.ok) {
            document.getElementById('editTxModal').style.display = 'none';
            await fetchWalletsData();
            renderWallets();
            renderTransactions();

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
                        console.error('Error verifying budget cap after transaction update:', err);
                    }
                }
            }
        } else {
            const errText = await res.text();
            alert('Failed to update transaction: ' + (errText || 'Server error'));
        }
    } catch(err) {
        console.error(err);
        alert('An error occurred while updating the transaction.');
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<i class="fa-solid fa-check"></i> Save Changes';
        }
    }
});

function updateModalPreview() {
  const nameVal = document.getElementById('walletNameInput').value.trim() || 'Wallet Name';
  const balanceVal = Number(document.getElementById('walletBalanceInput').value) || 0;
  const sym = window.Localization ? window.Localization.getCurrencySymbol() : '৳';

  document.getElementById('previewName').textContent = nameVal;
  document.getElementById('previewBalance').textContent = `${sym}${balanceVal.toLocaleString()}`;

  const iconWrap = document.getElementById('previewIconWrap');
  iconWrap.style.backgroundColor = `${selectedColor}22`;
  iconWrap.style.color = selectedColor;

  const iconEl = document.getElementById('previewIcon');
  iconEl.className = `fa-solid ${selectedIcon}`;
}

const modalBackdrop = document.getElementById('walletModalBackdrop');

function openModal() {
  modalBackdrop.classList.add('open');
}

function closeModal() {
  modalBackdrop.classList.remove('open');
}

window.openWalletModalForAdd = function() {
  document.getElementById('modalHeadingTitle').textContent = 'Add Wallet';
  document.getElementById('editWalletIndex').value = '-1';
  document.getElementById('walletNameInput').value = '';
  document.getElementById('walletBalanceInput').value = '';

  selectedIcon = 'fa-wallet';
  selectedColor = '#10b981';

  resetActivePills();
  updateModalPreview();
  openModal();
};

window.openWalletModalForEdit = function(index) {
  const w = walletsData[index];
  document.getElementById('modalHeadingTitle').textContent = 'Edit Wallet';
  document.getElementById('editWalletIndex').value = index;
  document.getElementById('walletNameInput').value = w.name;
  document.getElementById('walletBalanceInput').value = w.balance;

  selectedIcon = w.icon;
  selectedColor = w.color;

  resetActivePills();
  updateModalPreview();
  openModal();
};

function resetActivePills() {
  document.querySelectorAll('.icon-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-icon') === selectedIcon);
  });
  document.querySelectorAll('.color-swatch').forEach(swatch => {
    swatch.classList.toggle('active', swatch.getAttribute('data-color') === selectedColor);
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  await fetchWalletsData();
  renderWallets();
  renderTransactions();

  document.getElementById('closeWalletModalBtn').addEventListener('click', closeModal);
  document.getElementById('cancelWalletModalBtn').addEventListener('click', closeModal);
  modalBackdrop.addEventListener('click', (e) => {
    if (e.target === modalBackdrop) closeModal();
  });

  document.getElementById('walletNameInput').addEventListener('input', updateModalPreview);
  document.getElementById('walletBalanceInput').addEventListener('input', updateModalPreview);

  document.querySelectorAll('.icon-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.icon-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedIcon = btn.getAttribute('data-icon');
      updateModalPreview();
    });
  });

  document.querySelectorAll('.color-swatch').forEach(swatch => {
    swatch.addEventListener('click', () => {
      document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
      swatch.classList.add('active');
      selectedColor = swatch.getAttribute('data-color');
      updateModalPreview();
    });
  });

  document.getElementById('walletForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const editIndex = parseInt(document.getElementById('editWalletIndex').value);
    const name = document.getElementById('walletNameInput').value.trim();
    const balance = Number(document.getElementById('walletBalanceInput').value);

    if (!name) return;

    const token = localStorage.getItem('token');
    const payload = {
        name: name,
        openingBalance: balance,
        icon: selectedIcon,
        colorHex: selectedColor
    };

    if (editIndex >= 0) {
      const walletId = walletsData[editIndex].id;
      await fetch(`/api/wallets/${walletId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify(payload)
      });
    } else {
      await fetch('/api/wallets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify(payload)
      });
    }

    closeModal();
    await fetchWalletsData();
    renderWallets();
  });

  document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('token');
    window.location.href = 'index.html';
  });
});

// Listen for global localization changes
window.addEventListener('localizationChanged', () => {
  renderWallets();
  renderTransactions();
  if (window.Localization) window.Localization.applyToDOM();
});