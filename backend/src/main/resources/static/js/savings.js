let savingsData = {
  vaults: [],
  history: [] // For this MVP we will mock history locally since we aren't fetching transactions
};

let wallets = [];

let selectedNewVaultEmoji = '🎯';

async function fetchSavingsFromAPI() {
  const token = localStorage.getItem('token');
  if(!token) {
    window.location.href = 'index.html';
    return;
  }
  
  try {
    const res = await fetch('/api/savings', { headers: { 'Authorization': `Bearer ${token}` } });
    if (res.ok) {
        const data = await res.json();
        savingsData.vaults = data.map(v => {
            const percent = v.targetAmount > 0 ? Math.round((v.initialSavings / v.targetAmount) * 100) : 0;
            return {
                id: v.id,
                title: v.name,
                targetDate: v.targetDate ? `Target by ${v.targetDate}` : 'Ongoing Target',
                current: v.initialSavings || 0,
                goal: v.targetAmount || 0,
                percent: Math.min(percent, 100),
                icon: v.emoji || '🎯',
                color: v.colorHex || '#10b981',
                badgeClass: percent >= 100 ? 'green' : 'orange',
                achieved: percent >= 100
            }
        });
    }

    const walletRes = await fetch('/api/wallets', { headers: { 'Authorization': `Bearer ${token}` } });
    if (walletRes.ok) {
        wallets = await walletRes.json();
    }

    const txRes = await fetch('/api/transactions', { headers: { 'Authorization': `Bearer ${token}` } });
    if (txRes.ok) {
        const allTx = await txRes.json();
        savingsData.history = allTx
            .filter(t => t.transactionType === 'VAULT_CONTRIBUTION')
            .map(t => ({
                id: t.id,
                vaultId: t.vault ? t.vault.id : null,
                walletId: t.wallet ? t.wallet.id : null,
                vault: t.vault ? t.vault.name : 'Unknown Vault',
                amount: t.convertedAmount,
                wallet: t.wallet ? t.wallet.name : 'Unknown Wallet',
                date: t.transactionDate
            }));
    }
  } catch(e) {
    console.error("API error:", e);
  }
}

function renderSavingsUI() {
  const totalSaved = savingsData.vaults.reduce((acc, v) => acc + v.current, 0);
  const totalTarget = savingsData.vaults.reduce((acc, v) => acc + v.goal, 0);
  const overallPercent = totalTarget > 0 ? Math.min(Math.round((totalSaved / totalTarget) * 100), 100) : 0;

  document.getElementById('totalSavedAmount').textContent = `৳${totalSaved.toLocaleString()}`;
  document.getElementById('activeVaultsCount').textContent = `across ${savingsData.vaults.length} active vaults`;
  document.getElementById('overallPercent').textContent = `${overallPercent}%`;
  document.getElementById('overallFill').style.width = `${overallPercent}%`;
  document.getElementById('targetTotalText').textContent = `of ৳${totalTarget.toLocaleString()} target`;

  const container = document.getElementById('vaultsContainer');
  if (container) {
    const cardsHtml = savingsData.vaults.map((v, index) => `
      <div class="vault-card">
        <div class="vault-top">
          <span class="vault-icon-box">${v.icon}</span>
          <span class="vault-badge ${v.badgeClass}">${v.percent}%</span>
        </div>
        <h4>${v.title}</h4>
        <p class="vault-target-date">${v.targetDate}</p>

        <div class="vault-figures">
          <span>৳${v.current.toLocaleString()}</span>
          <span class="goal-text">৳${v.goal.toLocaleString()}</span>
        </div>
        <div class="vault-progress-bar">
          <div class="vault-fill" style="width: ${v.percent}%; background: ${v.color};"></div>
        </div>

        ${v.achieved 
          ? '<div class="btn-vault-achieved"><i class="fa-solid fa-check"></i> Goal Achieved!</div>' 
          : `<button class="btn-vault-action" onclick="openAddFundsModal(${index})">Add Funds</button>`
        }
      </div>
    `).join('');

    const newVaultBoxHtml = `
      <div class="add-vault-box" id="openNewVaultModalBtn">
        <div class="plus-circle"><i class="fa-solid fa-plus"></i></div>
        <span>New Vault</span>
      </div>
    `;

    container.innerHTML = cardsHtml + newVaultBoxHtml;
    document.getElementById('openNewVaultModalBtn').addEventListener('click', openNewVaultModal);
  }

  const historyTbody = document.getElementById('fundingHistoryBody');
  if (historyTbody) {
    if (savingsData.history.length === 0) {
      historyTbody.innerHTML = `
        <tr>
          <td colspan="5" class="empty-state-cell">
            <div class="empty-icon"><i class="fa-solid fa-chart-line"></i></div>
            <p>No funding activity yet — add funds to a vault to see history.</p>
          </td>
        </tr>
      `;
    } else {
      historyTbody.innerHTML = savingsData.history.map(item => `
        <tr>
          <td><strong>${item.vault}</strong></td>
          <td style="color: #10b981; font-weight: 700;">+৳${item.amount.toLocaleString()}</td>
          <td><span style="color: #2563eb; font-weight: 600;">${item.wallet}</span></td>
          <td style="color: #94a3b8; font-size: 0.8rem;">${item.date}</td>
          <td>
            <div style="display: flex; gap: 10px;">
              <button onclick="editTransaction(${item.id})" style="background: none; border: none; color: #3b82f6; cursor: pointer;"><i class="fa-solid fa-pen"></i></button>
              <button onclick="deleteTransaction(${item.id})" style="background: none; border: none; color: #ef4444; cursor: pointer;"><i class="fa-solid fa-trash"></i></button>
            </div>
          </td>
        </tr>
      `).join('');
    }
  }
}

const addFundsBackdrop = document.getElementById('addFundsModalBackdrop');
const newVaultBackdrop = document.getElementById('newVaultModalBackdrop');

window.openAddFundsModal = function(index) {
  const v = savingsData.vaults[index];
  document.getElementById('addFundsVaultIndex').value = index;
  document.getElementById('addFundsVaultTitle').textContent = `Deposit to ${v.title}`;
  document.getElementById('depositAmountInput').value = '';
  
  const walletSelect = document.getElementById('depositWalletSelect');
  walletSelect.innerHTML = wallets.map(w => `<option value="${w.id}">${w.name} (৳${w.currentBalance.toLocaleString()})</option>`).join('');

  addFundsBackdrop.classList.add('open');
};

function closeAddFundsModal() {
  addFundsBackdrop.classList.remove('open');
}

function openNewVaultModal() {
  document.getElementById('vaultTitleInput').value = '';
  document.getElementById('vaultTargetInput').value = '';
  document.getElementById('vaultDateInput').value = '';
  newVaultBackdrop.classList.add('open');
}

window.deleteTransaction = async function(id) {
    if (confirm("Are you sure you want to delete this funding? The amount will be refunded to your wallet and removed from the vault.")) {
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`/api/transactions/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                alert("Funding deleted successfully!");
                await fetchSavingsFromAPI();
                renderSavingsUI();
            } else {
                alert("Failed to delete funding.");
            }
        } catch (e) {
            console.error(e);
        }
    }
};

window.editTransaction = function(id) {
    const tx = savingsData.history.find(t => t.id === id);
    if (!tx) return;
    
    document.getElementById('editTxId').value = tx.id;
    document.getElementById('editTxWalletId').value = tx.walletId || '';
    document.getElementById('editTxVaultId').value = tx.vaultId || '';
    document.getElementById('editTxAmount').value = tx.amount;
    document.getElementById('editTxDate').value = tx.date;
    
    document.getElementById('editTxModal').style.display = 'flex';
};

function closeNewVaultModal() {
  newVaultBackdrop.classList.remove('open');
}

  document.addEventListener('DOMContentLoaded', async () => {
  await fetchSavingsFromAPI();
  renderSavingsUI();

  document.getElementById('editTxForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('editTxId').value;
      const req = {
          amount: Number(document.getElementById('editTxAmount').value),
          description: "Vault Funding Edit",
          transactionDate: document.getElementById('editTxDate').value,
          walletId: Number(document.getElementById('editTxWalletId').value) || null,
          vaultId: Number(document.getElementById('editTxVaultId').value) || null
      };

      const token = localStorage.getItem('token');
      try {
          const res = await fetch(`/api/transactions/${id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify(req)
          });
          if (res.ok) {
              alert('Funding updated successfully!');
              document.getElementById('editTxModal').style.display = 'none';
              await fetchSavingsFromAPI();
              renderSavingsUI();
          } else {
              alert('Failed to update funding.');
          }
      } catch(err) {
          console.error(err);
      }
  });

  document.getElementById('closeAddFundsModalBtn').addEventListener('click', closeAddFundsModal);
  document.getElementById('cancelAddFundsBtn').addEventListener('click', closeAddFundsModal);
  addFundsBackdrop.addEventListener('click', (e) => {
    if (e.target === addFundsBackdrop) closeAddFundsModal();
  });

  document.getElementById('closeNewVaultModalBtn').addEventListener('click', closeNewVaultModal);
  document.getElementById('cancelNewVaultBtn').addEventListener('click', closeNewVaultModal);
  newVaultBackdrop.addEventListener('click', (e) => {
    if (e.target === newVaultBackdrop) closeNewVaultModal();
  });

  document.querySelectorAll('.quick-pill-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById('depositAmountInput').value = btn.getAttribute('data-val');
    });
  });

  document.querySelectorAll('.emoji-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.emoji-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedNewVaultEmoji = btn.getAttribute('data-emoji');
    });
  });

  document.getElementById('addFundsForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const vaultIdx = parseInt(document.getElementById('addFundsVaultIndex').value);
    const amountVal = Number(document.getElementById('depositAmountInput').value);
    const walletId = document.getElementById('depositWalletSelect').value;

    if (vaultIdx >= 0 && amountVal > 0) {
      const targetVault = savingsData.vaults[vaultIdx];
      const token = localStorage.getItem('token');
      
      const res = await fetch(`/api/savings/${targetVault.id}/deposit`, { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ amount: amountVal, walletId: walletId }) 
      });

      if (res.ok) {
          const walletName = wallets.find(w => w.id == walletId)?.name || "Wallet";
          savingsData.history.unshift({
            vault: targetVault.title,
            amount: amountVal,
            wallet: walletName,
            date: 'Today, Just now'
          });
          
          closeAddFundsModal();
          await fetchSavingsFromAPI();
          renderSavingsUI();
      } else {
          alert('Failed to deposit funds. Check wallet balance.');
      }
    }
  });

  document.getElementById('newVaultForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const titleVal = document.getElementById('vaultTitleInput').value.trim();
    const targetVal = Number(document.getElementById('vaultTargetInput').value);
    const dateVal = document.getElementById('vaultDateInput').value;

    if (titleVal && targetVal > 0) {
      const token = localStorage.getItem('token');
      await fetch('/api/savings', { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ name: titleVal, targetAmount: targetVal, targetDate: dateVal, emoji: selectedNewVaultEmoji }) 
      });

      closeNewVaultModal();
      await fetchSavingsFromAPI();
      renderSavingsUI();
    }
  });

  document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('token');
    window.location.href = 'index.html';
  });
});