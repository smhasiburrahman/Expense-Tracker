// =========================================================================
// CHARITY TRACKER - REAL BACKEND LOGIC
// =========================================================================

let charityData = {
  monthlyTarget: 5000,
  history: []
};

let wallets = [];
let selectedCategory = 'Mosque';
let editSelectedCategory = 'Mosque';

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function fetchCharityData() {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = 'index.html';
    return;
  }

  try {
    // 1. Fetch user to get charityTarget
    const userRes = await fetch('/api/users/me', { headers: { 'Authorization': `Bearer ${token}` } });
    if (userRes.ok) {
      const userData = await userRes.json();
      charityData.monthlyTarget = userData.charityTarget || 0;
    }

    // 2. Fetch wallets
    const walletRes = await fetch('/api/wallets', { headers: { 'Authorization': `Bearer ${token}` } });
    if (walletRes.ok) {
      wallets = await walletRes.json();
    }

    // 3. Fetch transactions
    const txRes = await fetch('/api/transactions', { headers: { 'Authorization': `Bearer ${token}` } });
    if (txRes.ok) {
      const allTx = await txRes.json();
      charityData.history = allTx
        .filter(t => t.transactionType === 'SADAQA_CONTRIBUTION')
        .map(t => ({
          id: t.id,
          desc: t.description || 'Charity contribution',
          cat: t.sourceNote || (t.category ? t.category.name : 'Mosque'),
          wallet: t.wallet ? t.wallet.name : 'Wallet',
          walletId: t.wallet ? t.wallet.id : null,
          amount: parseFloat(t.convertedAmount != null ? t.convertedAmount : (t.originalAmount || 0)),
          date: t.transactionDate,
          sourceNote: t.sourceNote
        }));
    }
  } catch (e) {
    console.error("API error:", e);
  }
}

function updateCharityUI() {
  // Calculate total given this month dynamically
  const totalGiven = charityData.history.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);

  // Calculate percentage
  const percent = charityData.monthlyTarget > 0 ? Math.min(Math.round((totalGiven / charityData.monthlyTarget) * 100), 100) : 0;

  // Update banner numbers
  document.getElementById('sadaqaGivenAmount').textContent = window.Localization ? window.Localization.formatMoney(totalGiven, 'BDT') : `৳${totalGiven.toLocaleString()}`;
  document.getElementById('sadaqaTargetAmount').textContent = window.Localization ? window.Localization.formatMoney(charityData.monthlyTarget, 'BDT') : `৳${charityData.monthlyTarget.toLocaleString()}`;
  document.getElementById('sadaqaProgressText').textContent = `${percent}%`;
  document.getElementById('sadaqaProgressFill').style.width = `${percent}%`;
  document.getElementById('entriesCount').textContent = `${charityData.history.length} entries`;

  // Update Wallet Dropdown in Log Modal
  const walletSelect = document.getElementById('sadaqaWalletSelect');
  if (walletSelect) {
    walletSelect.innerHTML = wallets.map(w => `<option value="${w.id}">${escapeHtml(w.name)} (${window.Localization ? window.Localization.formatMoney(w.currentBalance, 'BDT') : `৳${Number(w.currentBalance).toLocaleString()}`})</option>`).join('');
  }

  // Update Wallet Dropdown in Edit Modal if it exists
  const editWalletSelect = document.getElementById('editCharityWalletSelect');
  if (editWalletSelect && editWalletSelect.options.length > 0) {
    const curVal = editWalletSelect.value;
    editWalletSelect.innerHTML = wallets.map(w => `<option value="${w.id}" ${String(w.id) === String(curVal) ? 'selected' : ''}>${escapeHtml(w.name)} (${window.Localization ? window.Localization.formatMoney(w.currentBalance, 'BDT') : `৳${Number(w.currentBalance).toLocaleString()}`})</option>`).join('');
  }

  // Re-render table list with Edit button beside the Delete trash icon
  const tbody = document.getElementById('sadaqaTableBody');
  if (tbody) {
    tbody.innerHTML = charityData.history.map((item) => `
      <tr>
        <td>
          <span class="heart-icon"><i class="fa-solid fa-heart"></i></span>
          <strong>${escapeHtml(item.desc)}</strong>
        </td>
        <td><span class="tag-badge">${escapeHtml(item.cat)}</span></td>
        <td><span style="color: #2563eb; font-weight: 600;">${escapeHtml(item.wallet)}</span></td>
        <td class="amount-sadaqa">${window.Localization ? window.Localization.formatMoney(item.amount, 'BDT') : `৳${item.amount.toLocaleString()}`}</td>
        <td class="date-col">${item.date ? (window.Localization ? window.Localization.formatDate(item.date) : item.date) : 'N/A'}</td>
        <td style="white-space: nowrap; text-align: right;">
          <div class="action-btn-group">
            <button type="button" class="action-edit" onclick="openEditCharityModal(${item.id})" title="Edit Contribution">
              <i class="fa-solid fa-pen-to-square"></i> Edit
            </button>
            <button type="button" class="action-delete" onclick="deleteCharity(${item.id})" title="Delete Contribution">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  }
}

// Open Edit Charity Modal
window.openEditCharityModal = async function(id) {
  const token = localStorage.getItem('token');
  if (!token) return;

  try {
    const [txRes, walletRes] = await Promise.all([
      fetch(`/api/transactions/${id}`, { headers: { 'Authorization': `Bearer ${token}` } }),
      fetch('/api/wallets', { headers: { 'Authorization': `Bearer ${token}` } })
    ]);

    if (!txRes.ok) {
      if (window.showToast) showToast('Failed to load transaction details.', 'error');
      else alert('Failed to load transaction details.');
      return;
    }

    const tx = await txRes.json();
    if (walletRes.ok) {
      wallets = await walletRes.json();
    }

    document.getElementById('editCharityId').value = tx.id;

    const currentCur = window.Localization ? window.Localization.getCurrencyCode() : 'BDT';
    const amountVal = parseFloat(tx.amount != null ? tx.amount : (tx.convertedAmount || 0));
    const convertedAmt = window.Localization ? window.Localization.convert(amountVal, 'BDT', currentCur) : amountVal;
    document.getElementById('editCharityAmountInput').value = currentCur === 'JPY' ? Math.round(convertedAmt) : convertedAmt;

    document.getElementById('editCharityDescInput').value = tx.description || '';
    document.getElementById('editCharityDateInput').value = tx.transactionDate || '';

    const editWalletSelect = document.getElementById('editCharityWalletSelect');
    if (editWalletSelect) {
      editWalletSelect.innerHTML = wallets.map(w => 
        `<option value="${w.id}" ${w.id === tx.walletId ? 'selected' : ''}>${escapeHtml(w.name)} (${window.Localization ? window.Localization.formatMoney(w.currentBalance, 'BDT') : `৳${Number(w.currentBalance).toLocaleString()}`})</option>`
      ).join('');
    }

    // Set Category Pill
    editSelectedCategory = tx.sourceNote || (tx.categoryName ? tx.categoryName : 'Mosque');
    let matchedPill = false;
    document.querySelectorAll('.edit-cat-pill').forEach(pill => {
      if (pill.getAttribute('data-cat').toLowerCase() === editSelectedCategory.toLowerCase()) {
        pill.classList.add('active');
        editSelectedCategory = pill.getAttribute('data-cat');
        matchedPill = true;
      } else {
        pill.classList.remove('active');
      }
    });
    if (!matchedPill) {
      const defaultPill = document.querySelector('.edit-cat-pill[data-cat="Mosque"]');
      if (defaultPill) defaultPill.classList.add('active');
      editSelectedCategory = 'Mosque';
    }

    const editModal = document.getElementById('editCharityModalBackdrop');
    if (editModal) editModal.classList.add('open');
  } catch (err) {
    console.error('Error opening edit charity modal:', err);
    if (window.showToast) showToast('Failed to load charity details.', 'error');
    else alert('Failed to load charity details.');
  }
};

// Delete an entry
window.deleteCharity = async function (id) {
  const item = (charityData.history || []).find(e => e.id === id);
  const desc = item ? `"${item.desc || 'Charity contribution'}"` : 'this record';
  const amount = item ? (window.Localization ? window.Localization.formatMoney(parseFloat(item.amount || 0), 'BDT') : `৳${parseFloat(item.amount || 0).toLocaleString()}`) : '';
  const wallet = item && item.wallet ? `wallet "${item.wallet}"` : 'your wallet';

  const confirmed = confirm(
    `Are you sure you want to delete ${desc} (${amount})?\n\n` +
    `This will completely remove it from the system and:\n` +
    `• Refund ${amount} back to ${wallet}\n` +
    `• Update your charity progress and stats\n` +
    `• Recalculate your dashboard and analytics\n` +
    `• Remove it from giving history`
  );

  if (confirmed) {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`/api/transactions/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        if (window.showToast) {
          showToast('Charity contribution deleted and wallet refunded successfully.', 'success');
        } else {
          alert('Charity contribution deleted and wallet refunded successfully.');
        }
        await fetchCharityData();
        updateCharityUI();
      } else {
        if (window.showToast) showToast('Failed to delete charity record.', 'error');
        else alert('Failed to delete charity record.');
      }
    } catch (e) {
      console.error(e);
      if (window.showToast) showToast('Network error while deleting charity record.', 'error');
      else alert('Network error while deleting charity record.');
    }
  }
};

// =========================================================================
// EVENT LISTENERS & MODAL CONTROLS
// =========================================================================

document.addEventListener('DOMContentLoaded', async () => {
  // Set default date in modal to today
  const dateInput = document.getElementById('sadaqaDateInput');
  if (dateInput) {
    const today = new Date().toISOString().split('T')[0];
    dateInput.value = today;
  }

  await fetchCharityData();
  updateCharityUI();

  // Log Modal open & close
  const logModal = document.getElementById('sadaqaModalBackdrop');
  const openBtn = document.getElementById('openLogModalBtn');
  const closeBtn = document.getElementById('closeModalBtn');
  const cancelBtn = document.getElementById('cancelModalBtn');

  function openLogModal() { logModal.classList.add('open'); }
  function closeLogModal() { logModal.classList.remove('open'); }

  if (openBtn) openBtn.addEventListener('click', openLogModal);
  if (closeBtn) closeBtn.addEventListener('click', closeLogModal);
  if (cancelBtn) cancelBtn.addEventListener('click', closeLogModal);

  if (logModal) {
    logModal.addEventListener('click', (e) => {
      if (e.target === logModal) closeLogModal();
    });
  }

  // Edit Modal open & close
  const editModal = document.getElementById('editCharityModalBackdrop');
  const closeEditBtn = document.getElementById('closeEditModalBtn');
  const cancelEditBtn = document.getElementById('cancelEditModalBtn');

  function closeEditModal() { if (editModal) editModal.classList.remove('open'); }

  if (closeEditBtn) closeEditBtn.addEventListener('click', closeEditModal);
  if (cancelEditBtn) cancelEditBtn.addEventListener('click', closeEditModal);

  if (editModal) {
    editModal.addEventListener('click', (e) => {
      if (e.target === editModal) closeEditModal();
    });
  }

  // Quick Amount Buttons click handlers
  document.querySelectorAll('.quick-btn:not(.edit-quick-btn)').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById('sadaqaAmountInput').value = btn.getAttribute('data-val');
    });
  });

  document.querySelectorAll('.edit-quick-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById('editCharityAmountInput').value = btn.getAttribute('data-val');
    });
  });

  // Category Pills selectors
  document.querySelectorAll('.cat-pill:not(.edit-cat-pill)').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.cat-pill:not(.edit-cat-pill)').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      selectedCategory = pill.getAttribute('data-cat');
    });
  });

  document.querySelectorAll('.edit-cat-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.edit-cat-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      editSelectedCategory = pill.getAttribute('data-cat');
    });
  });

  // Edit Monthly Target Action
  const editTargetBtn = document.getElementById('editTargetBtn');
  if (editTargetBtn) {
    editTargetBtn.addEventListener('click', async () => {
      const newTarget = prompt("Enter your new monthly Charity target (in BDT):", charityData.monthlyTarget);
      if (newTarget && !isNaN(newTarget) && Number(newTarget) > 0) {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/users/me/charity-target', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ target: Number(newTarget) })
        });
        if (res.ok) {
          charityData.monthlyTarget = Number(newTarget);
          updateCharityUI();
          if (window.showToast) showToast('Monthly charity target updated successfully!', 'success');
        }
      }
    });
  }

  // Form Submit: Log new Charity
  const logForm = document.getElementById('logSadaqaForm');
  if (logForm) {
    logForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const amountVal = Number(document.getElementById('sadaqaAmountInput').value);
      const descVal = document.getElementById('sadaqaDescInput').value.trim();
      const dateVal = document.getElementById('sadaqaDateInput').value;
      const walletId = document.getElementById('sadaqaWalletSelect').value;

      if (!amountVal || !descVal || !walletId) return;

      const token = localStorage.getItem('token');
      const payload = [{
        transactionType: "SADAQA_CONTRIBUTION",
        walletId: Number(walletId),
        amount: amountVal,
        description: descVal,
        sourceNote: selectedCategory,
        transactionDate: dateVal || new Date().toISOString().split('T')[0]
      }];

      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        if (window.showToast) {
          showToast('Charity contribution logged successfully!', 'success');
        } else {
          alert('Charity contribution logged successfully!');
        }
        logForm.reset();
        dateInput.value = new Date().toISOString().split('T')[0];
        closeLogModal();
        await fetchCharityData();
        updateCharityUI();

        // Dispatch real-time application event for the notification bell component
        const formattedAmt = window.Localization ? window.Localization.formatMoney(amountVal, 'BDT') : `৳${amountVal.toLocaleString()}`;
        const appEvent = {
          type: 'daily',
          title: `Charity Contribution: ${selectedCategory}`,
          message: `Logged ${formattedAmt} contribution for ${descVal}.`,
          amountBDT: amountVal,
          category: selectedCategory,
          severity: 'info',
          link: 'charity.html'
        };
        if (window.handleApplicationEvent) {
          window.handleApplicationEvent(appEvent);
        } else {
          window.dispatchEvent(new CustomEvent('applicationEvent', { detail: appEvent }));
        }
      } else {
        if (window.showToast) showToast('Failed to log charity. Please check wallet balance.', 'error');
        else alert('Failed to log charity. Please check wallet balance.');
      }
    });
  }

  // Form Submit: Edit existing Charity Contribution
  const editForm = document.getElementById('editCharityForm');
  if (editForm) {
    editForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const id = document.getElementById('editCharityId').value;
      const enteredAmount = parseFloat(document.getElementById('editCharityAmountInput').value);
      const descVal = document.getElementById('editCharityDescInput').value.trim();
      const dateVal = document.getElementById('editCharityDateInput').value;
      const walletId = document.getElementById('editCharityWalletSelect').value;

      if (!id || isNaN(enteredAmount) || enteredAmount <= 0 || !descVal || !walletId) {
        if (window.showToast) showToast('Please fill in all required fields properly.', 'warning');
        return;
      }

      const currentCur = window.Localization ? window.Localization.getCurrencyCode() : 'BDT';
      const amountInBDT = window.Localization ? window.Localization.convert(enteredAmount, currentCur, 'BDT') : enteredAmount;

      const token = localStorage.getItem('token');
      const req = {
        amount: amountInBDT,
        description: descVal,
        walletId: Number(walletId),
        transactionDate: dateVal,
        sourceNote: editSelectedCategory,
        transactionType: "SADAQA_CONTRIBUTION"
      };

      const saveBtn = document.getElementById('saveEditCharityBtn');
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
      }

      try {
        const res = await fetch(`/api/transactions/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(req)
        });

        if (res.ok) {
          closeEditModal();

          if (window.showToast) {
            showToast('Charity contribution updated successfully!', 'success');
          } else {
            alert('Charity contribution updated successfully!');
          }

          // Re-fetch everything: wallets, charity history, user target
          await fetchCharityData();
          updateCharityUI();

          // Dispatch real-time application event for the notification bell component
          const formattedAmt = window.Localization ? window.Localization.formatMoney(amountInBDT, 'BDT') : `৳${amountInBDT.toLocaleString()}`;
          const appEvent = {
            type: 'daily',
            title: `Charity Contribution Updated: ${editSelectedCategory}`,
            message: `Updated contribution of ${formattedAmt} for ${descVal}.`,
            amountBDT: amountInBDT,
            category: editSelectedCategory,
            severity: 'info',
            link: 'charity.html'
          };
          if (window.handleApplicationEvent) {
            window.handleApplicationEvent(appEvent);
          } else {
            window.dispatchEvent(new CustomEvent('applicationEvent', { detail: appEvent }));
          }
        } else {
          let errorMsg = 'Failed to update charity contribution.';
          try {
            const errData = await res.json();
            if (errData && errData.message) errorMsg = errData.message;
          } catch (_) {}
          if (window.showToast) showToast(errorMsg, 'error');
          else alert(errorMsg);
        }
      } catch (err) {
        console.error('Failed to update charity contribution:', err);
        if (window.showToast) showToast('Network error while updating charity.', 'error');
        else alert('Network error while updating charity.');
      } finally {
        if (saveBtn) {
          saveBtn.disabled = false;
          saveBtn.innerHTML = '<i class="fa-solid fa-check"></i> Save Changes';
        }
      }
    });
  }

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      localStorage.removeItem('token');
      window.location.href = 'index.html';
    });
  }
});

// Listen for global localization changes
window.addEventListener('localizationChanged', () => {
  updateCharityUI();
  if (window.Localization) window.Localization.applyToDOM();
});