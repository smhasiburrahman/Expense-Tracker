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
      <h3 class="wallet-box-amount">৳${w.balance.toLocaleString()}</h3>

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
      const amountStr = `${isExpense ? '-' : '+'}৳${(t.convertedAmount || 0).toLocaleString()}`;
      const amountColor = isExpense ? 'amount-minus' : '';
      
      return `
        <tr>
          <td><span class="table-cat" style="color: ${catColor}; background-color: ${catColor}22;">${catIcon && catIcon.startsWith('fa-') ? `<i class="fa-solid ${catIcon}"></i>` : catIcon} ${catName}</span></td>
          <td><strong>${t.description || 'No description'}</strong></td>
          <td><span class="wallet-badge">${t.wallet ? t.wallet.name : '-'}</span></td>
          <td class="${amountColor}">${amountStr}</td>
          <td class="date-col">${t.transactionDate}</td>
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
    if (confirm("Are you sure you want to delete this transaction? The amount will be refunded to your wallet.")) {
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`/api/transactions/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                alert("Transaction deleted successfully!");
                await fetchWalletsData(); // re-fetch transactions and wallets
                renderWallets();
                renderTransactions();
            } else {
                alert("Failed to delete transaction.");
            }
        } catch (e) {
            console.error(e);
        }
    }
};

window.editTransaction = function(id) {
    const tx = walletTransactions.find(t => t.id === id);
    if (!tx) return;
    
    document.getElementById('editTxId').value = tx.id;
    document.getElementById('editTxWalletId').value = tx.wallet ? tx.wallet.id : '';
    document.getElementById('editTxCategoryId').value = tx.category ? tx.category.id : '';
    document.getElementById('editTxAmount').value = tx.originalAmount || tx.convertedAmount;
    document.getElementById('editTxDesc').value = tx.description || '';
    document.getElementById('editTxDate').value = tx.transactionDate;
    
    document.getElementById('editTxModal').style.display = 'flex';
};

document.getElementById('editTxForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('editTxId').value;
    const req = {
        amount: Number(document.getElementById('editTxAmount').value),
        description: document.getElementById('editTxDesc').value,
        transactionDate: document.getElementById('editTxDate').value,
        walletId: Number(document.getElementById('editTxWalletId').value) || null,
        categoryId: Number(document.getElementById('editTxCategoryId').value) || null
    };

    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`/api/transactions/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(req)
        });
        if (res.ok) {
            alert('Transaction updated successfully!');
            document.getElementById('editTxModal').style.display = 'none';
            await fetchWalletsData();
            renderWallets();
            renderTransactions();
        } else {
            alert('Failed to update transaction.');
        }
    } catch(err) {
        console.error(err);
    }
});

function updateModalPreview() {
  const nameVal = document.getElementById('walletNameInput').value.trim() || 'Wallet Name';
  const balanceVal = Number(document.getElementById('walletBalanceInput').value) || 0;

  document.getElementById('previewName').textContent = nameVal;
  document.getElementById('previewBalance').textContent = `৳${balanceVal.toLocaleString()}`;

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