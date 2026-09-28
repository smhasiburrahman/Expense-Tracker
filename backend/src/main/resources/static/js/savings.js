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
                date: t.transactionDate,
                description: t.description || '',
                sourceNote: t.sourceNote || ''
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

  document.getElementById('totalSavedAmount').textContent = window.Localization ? window.Localization.formatMoney(totalSaved, 'BDT') : `৳${totalSaved.toLocaleString()}`;
  document.getElementById('activeVaultsCount').textContent = `across ${savingsData.vaults.length} active vaults`;
  document.getElementById('overallPercent').textContent = `${overallPercent}%`;
  document.getElementById('overallFill').style.width = `${overallPercent}%`;
  document.getElementById('targetTotalText').textContent = `of ${window.Localization ? window.Localization.formatMoney(totalTarget, 'BDT') : `৳${totalTarget.toLocaleString()}`} target`;

  const container = document.getElementById('vaultsContainer');
  if (container) {
    const cardsHtml = savingsData.vaults.map((v, index) => `
      <div class="vault-card">
        <div class="vault-top">
          <span class="vault-icon-box">${v.icon}</span>
          <span class="vault-badge ${v.badgeClass}">${v.percent}%</span>
        </div>
        <h4>${v.title}</h4>
        <p class="vault-target-date">${v.targetDate ? (window.Localization ? window.Localization.formatDate(v.targetDate) : v.targetDate) : ''}</p>

        <div class="vault-figures">
          <span>${window.Localization ? window.Localization.formatMoney(v.current, 'BDT') : `৳${v.current.toLocaleString()}`}</span>
          <span class="goal-text">${window.Localization ? window.Localization.formatMoney(v.goal, 'BDT') : `৳${v.goal.toLocaleString()}`}</span>
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
          <td style="color: #10b981; font-weight: 700;">+${window.Localization ? window.Localization.formatMoney(item.amount, 'BDT') : `৳${item.amount.toLocaleString()}`}</td>
          <td><span style="color: #2563eb; font-weight: 600;">${item.wallet}</span></td>
          <td style="color: #94a3b8; font-size: 0.8rem;">${window.Localization ? window.Localization.formatDate(item.date) : item.date}</td>
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

function parseCleanAmount(val) {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const cleaned = String(val).replace(/[^0-9.-]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

const addFundsBackdrop = document.getElementById('addFundsModalBackdrop');
const newVaultBackdrop = document.getElementById('newVaultModalBackdrop');

window.openAddFundsModal = function(index) {
  const v = savingsData.vaults[index];
  document.getElementById('addFundsVaultIndex').value = index;
  document.getElementById('addFundsVaultTitle').textContent = `Deposit to ${v.title}`;
  document.getElementById('depositAmountInput').value = '';
  
  const walletSelect = document.getElementById('depositWalletSelect');
  walletSelect.innerHTML = wallets.map(w => {
    const balNum = parseCleanAmount(w.currentBalance);
    const balFormatted = window.Localization ? window.Localization.formatMoney(balNum, 'BDT') : `৳${balNum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    return `<option value="${w.id}" data-balance="${balNum}">${w.name} (${balFormatted})</option>`;
  }).join('');

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
                if (window.showToast) showToast("Funding deleted successfully! Refunded to wallet.", "success");
                else alert("Funding deleted successfully!");
                await fetchSavingsFromAPI();
                renderSavingsUI();
            } else {
                if (window.showToast) showToast("Failed to delete funding.", "error");
                else alert("Failed to delete funding.");
            }
        } catch (e) {
            console.error(e);
            if (window.showToast) showToast("Network error while deleting funding.", "error");
        }
    }
};

window.openEditTxModal = function() {
  const modal = document.getElementById('editTxModal');
  if (modal) modal.classList.add('active');
};

window.closeEditTxModal = function() {
  const modal = document.getElementById('editTxModal');
  if (modal) modal.classList.remove('active');
};

window.editTransaction = async function(id) {
  const token = localStorage.getItem('token');
  try {
    const [walletsRes, vaultsRes, txRes] = await Promise.all([
      fetch('/api/wallets', { headers: { 'Authorization': `Bearer ${token}` } }),
      fetch('/api/savings', { headers: { 'Authorization': `Bearer ${token}` } }),
      fetch(`/api/transactions/${id}`, { headers: { 'Authorization': `Bearer ${token}` } })
    ]);

    const walletList = walletsRes.ok ? await walletsRes.json() : wallets;
    const vaultList = vaultsRes.ok ? await vaultsRes.json() : [];
    let tx = null;
    if (txRes.ok) {
      tx = await txRes.json();
    } else {
      const fallback = savingsData.history.find(t => t.id === id);
      if (fallback) {
        tx = {
          id: fallback.id,
          amount: fallback.amount,
          walletId: fallback.walletId,
          vaultId: fallback.vaultId,
          transactionDate: fallback.date,
          description: fallback.description || `Deposit to ${fallback.vault || 'Vault'}`,
          sourceNote: fallback.sourceNote || ''
        };
      }
    }

    if (!tx) {
      if (window.showToast) showToast('Could not load funding details.', 'error');
      return;
    }

    const formatAmount = amt => window.Localization ? window.Localization.formatMoney(amt, 'BDT') : `৳${(amt || 0).toLocaleString()}`;

    // Populate Source Wallet dropdown
    const walletSelect = document.getElementById('editTxWallet');
    if (walletSelect) {
      walletSelect.innerHTML = (walletList || []).map(w => 
        `<option value="${w.id}" ${Number(w.id) === Number(tx.walletId) ? 'selected' : ''}>${w.name} (${formatAmount(parseFloat(w.currentBalance || 0))})</option>`
      ).join('');
    }

    // Populate Target Vault dropdown
    const vaultSelect = document.getElementById('editTxVault');
    if (vaultSelect) {
      vaultSelect.innerHTML = (vaultList || []).map(v => 
        `<option value="${v.id}" ${Number(v.id) === Number(tx.vaultId) ? 'selected' : ''}>${v.emoji ? v.emoji + ' ' : ''}${v.name} (${formatAmount(parseFloat(v.initialSavings || 0))})</option>`
      ).join('');
    }

    // Currency conversion if needed
    const currentCur = window.Localization ? window.Localization.getCurrencyCode() : 'BDT';
    const rawAmt = parseFloat(tx.amount || 0);
    const convertedAmt = window.Localization ? window.Localization.convert(rawAmt, 'BDT', currentCur) : rawAmt;

    document.getElementById('editTxId').value = tx.id;
    document.getElementById('editTxAmount').value = currentCur === 'JPY' ? Math.round(convertedAmt) : convertedAmt.toFixed(2);
    document.getElementById('editTxDesc').value = tx.description || ('Deposit to ' + (tx.vaultName || 'Vault'));
    document.getElementById('editTxDate').value = tx.transactionDate || new Date().toISOString().split('T')[0];
    document.getElementById('editTxNote').value = tx.sourceNote || '';

    openEditTxModal();
  } catch (err) {
    console.error('Failed to load funding details for edit:', err);
    if (window.showToast) showToast('Failed to load funding details.', 'error');
  }
};

function closeNewVaultModal() {
  newVaultBackdrop.classList.remove('open');
}

document.addEventListener('DOMContentLoaded', async () => {
  await fetchSavingsFromAPI();
  renderSavingsUI();

  // Overlay click to close Edit Funding Modal
  const editModalOverlay = document.getElementById('editTxModal');
  if (editModalOverlay) {
    editModalOverlay.addEventListener('click', (e) => {
      if (e.target === editModalOverlay) closeEditTxModal();
    });
  }

  // Handle Edit Funding Form Submit
  const editTxForm = document.getElementById('editTxForm');
  if (editTxForm) {
    editTxForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const saveBtn = document.getElementById('saveEditTxBtn');
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
      }

      const id = document.getElementById('editTxId').value;
      const token = localStorage.getItem('token');

      const enteredAmount = parseFloat(document.getElementById('editTxAmount').value);
      const currentCur = window.Localization ? window.Localization.getCurrencyCode() : 'BDT';
      const amountInBDT = window.Localization ? window.Localization.convert(enteredAmount, currentCur, 'BDT') : enteredAmount;

      const selectedWalletId = parseInt(document.getElementById('editTxWallet').value, 10);
      const selectedVaultId = parseInt(document.getElementById('editTxVault').value, 10);
      const descVal = document.getElementById('editTxDesc').value.trim();
      const dateVal = document.getElementById('editTxDate').value;
      const noteVal = document.getElementById('editTxNote').value.trim();

      const req = {
        amount: amountInBDT,
        description: descVal,
        walletId: selectedWalletId,
        vaultId: selectedVaultId,
        transactionDate: dateVal,
        sourceNote: noteVal,
        transactionType: 'VAULT_CONTRIBUTION'
      };

      try {
        const res = await fetch(`/api/transactions/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify(req)
        });

        if (res.ok) {
          closeEditTxModal();
          if (window.showToast) showToast('Funding updated successfully!', 'success');
          else alert('Funding updated successfully!');

          await fetchSavingsFromAPI();
          renderSavingsUI();

          // Refresh notification bell / savings goal milestone event
          if (req.vaultId) {
            try {
              const vaultRes = await fetch('/api/savings', { headers: { 'Authorization': `Bearer ${token}` } });
              if (vaultRes.ok) {
                const vaults = await vaultRes.json();
                const targetVault = vaults.find(v => Number(v.id) === Number(req.vaultId));
                if (targetVault) {
                  const currentTotal = parseFloat(targetVault.initialSavings) || 0;
                  const targetCap = parseFloat(targetVault.targetAmount) || 0;
                  const percent = targetCap > 0 ? Math.min(100, Math.round((currentTotal / targetCap) * 100)) : 100;
                  const formattedDeposit = window.Localization ? window.Localization.formatMoney(req.amount, 'BDT') : `৳${req.amount.toLocaleString()}`;
                  const appEvent = {
                    type: 'saving',
                    title: 'Savings Goal Updated',
                    message: `Updated deposit of ${formattedDeposit} to "${targetVault.name}". Goal is now ${percent}% complete!`,
                    rawMessage: `Updated deposit of ${formattedDeposit} to "${targetVault.name}". Goal is now ${percent}% complete!`,
                    amountBDT: currentTotal,
                    depositAmount: req.amount,
                    capBDT: targetCap,
                    percent: percent,
                    category: targetVault.name,
                    severity: 'success',
                    link: 'savings.html'
                  };
                  if (window.handleApplicationEvent) {
                    window.handleApplicationEvent(appEvent);
                  } else {
                    window.dispatchEvent(new CustomEvent('applicationEvent', { detail: appEvent }));
                  }
                }
              }
            } catch (err) {
              console.error('Error refreshing savings notification after edit:', err);
            }
          }

          // Trigger cross-page event updates
          window.dispatchEvent(new CustomEvent('transactionUpdated', { detail: req }));
        } else {
          let errorMsg = 'Failed to update funding.';
          try {
            const errData = await res.json();
            if (errData && errData.message) errorMsg = errData.message;
          } catch (ignored) {}
          if (window.showToast) showToast(errorMsg, 'error');
          else alert(errorMsg);
        }
      } catch (err) {
        console.error('Error updating funding:', err);
        if (window.showToast) showToast('Network error while updating funding.', 'error');
      } finally {
        if (saveBtn) {
          saveBtn.disabled = false;
          saveBtn.innerHTML = '<i class="fa-solid fa-check"></i> Save Changes';
        }
      }
    });
  }

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
    const vaultIdx = parseInt(document.getElementById('addFundsVaultIndex').value, 10);
    const rawAmount = document.getElementById('depositAmountInput').value;
    const amountVal = parseCleanAmount(rawAmount);
    const walletId = document.getElementById('depositWalletSelect').value;

    if (isNaN(vaultIdx) || vaultIdx < 0 || !savingsData.vaults[vaultIdx]) {
      if (window.showToast) showToast('Please select a valid savings vault.', 'error');
      else alert('Please select a valid savings vault.');
      return;
    }

    if (amountVal <= 0) {
      if (window.showToast) showToast('Please enter a valid deposit amount greater than 0.', 'warning');
      else alert('Please enter a valid deposit amount greater than 0.');
      return;
    }

    if (!walletId) {
      if (window.showToast) showToast('Please select a wallet to transfer funds from.', 'warning');
      else alert('Please select a wallet to transfer funds from.');
      return;
    }

    // Retrieve available balance from selected wallet and strip formatting
    const selectedWallet = wallets.find(w => String(w.id) === String(walletId));
    let availableBalance = 0;
    if (selectedWallet && selectedWallet.currentBalance !== undefined) {
      availableBalance = parseCleanAmount(selectedWallet.currentBalance);
    } else {
      const walletSelect = document.getElementById('depositWalletSelect');
      const opt = walletSelect.options[walletSelect.selectedIndex];
      if (opt && opt.dataset && opt.dataset.balance !== undefined) {
        availableBalance = parseCleanAmount(opt.dataset.balance);
      } else if (opt) {
        const match = opt.text.match(/\(([^)]+)\)/);
        availableBalance = parseCleanAmount(match ? match[1] : opt.text);
      }
    }

    // Numerical validation comparing deposit amount against available wallet balance
    if (amountVal > availableBalance) {
      const formattedBalance = window.Localization 
        ? window.Localization.formatMoney(availableBalance, 'BDT') 
        : `৳${availableBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      const formattedDeposit = window.Localization
        ? window.Localization.formatMoney(amountVal, 'BDT')
        : `৳${amountVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      const errMsg = `Insufficient funds: Selected wallet only has ${formattedBalance}, which is less than the deposit of ${formattedDeposit}.`;
      if (window.showToast) showToast(errMsg, 'error');
      else alert(errMsg);
      return;
    }

    const targetVault = savingsData.vaults[vaultIdx];
    const token = localStorage.getItem('token');
    
    try {
      const res = await fetch(`/api/savings/${targetVault.id}/deposit`, { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ amount: amountVal, walletId: Number(walletId) }) 
      });

      if (res.ok) {
          const formattedDeposit = window.Localization ? window.Localization.formatMoney(amountVal, 'BDT') : `৳${amountVal.toLocaleString()}`;
          if (window.showToast) showToast(`Successfully deposited ${formattedDeposit} to "${targetVault.title}"!`, 'success');
          else alert(`Successfully deposited ${formattedDeposit} to "${targetVault.title}"!`);

          closeAddFundsModal();
          await fetchSavingsFromAPI();
          renderSavingsUI();

          // Dispatch real-time application event for the notification bell component with accurate progress calculation
          const refreshedVault = savingsData.vaults.find(v => v.id === targetVault.id);
          const currentTotal = refreshedVault ? Number(refreshedVault.current) : ((Number(targetVault.current) || 0) + amountVal);
          const targetCap = refreshedVault ? Number(refreshedVault.goal) : Number(targetVault.goal || targetVault.targetAmount || targetVault.target || 0);
          const percent = targetCap > 0 ? Math.min(100, Math.round((currentTotal / targetCap) * 100)) : 0;
          const appEvent = {
            type: 'savings',
            title: `Vault Deposit: ${targetVault.title}`,
            message: `Deposited ${formattedDeposit} to "${targetVault.title}". Goal is now ${percent}% complete!`,
            amountBDT: currentTotal,
            depositAmount: amountVal,
            capBDT: targetCap,
            percent: percent,
            category: targetVault.title,
            severity: 'success',
            link: 'savings.html'
          };
          if (window.handleApplicationEvent) {
            window.handleApplicationEvent(appEvent);
          } else {
            window.dispatchEvent(new CustomEvent('applicationEvent', { detail: appEvent }));
          }
      } else {
          let errorMsg = 'Failed to deposit funds. Check wallet balance.';
          try {
            const errData = await res.json();
            if (errData && errData.message) errorMsg = errData.message;
          } catch (_) {}
          if (window.showToast) showToast(errorMsg, 'error');
          else alert(errorMsg);
      }
    } catch (err) {
      console.error(err);
      if (window.showToast) showToast('A network error occurred while depositing funds.', 'error');
      else alert('A network error occurred while depositing funds.');
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

// Listen for global localization changes
window.addEventListener('localizationChanged', () => {
  renderSavingsUI();
  if (window.Localization) window.Localization.applyToDOM();
});