// =========================================================================
// CHARITY TRACKER - REAL BACKEND LOGIC
// =========================================================================

let charityData = {
  monthlyTarget: 5000,
  history: []
};

let wallets = [];
let selectedCategory = 'Mosque';

async function fetchCharityData() {
  const token = localStorage.getItem('token');
  if(!token) {
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
                desc: t.description,
                cat: t.category ? t.category.name : 'Mosque', 
                wallet: t.wallet ? t.wallet.name : 'Wallet',
                amount: t.convertedAmount,
                date: t.transactionDate
            }));
    }
  } catch(e) {
    console.error("API error:", e);
  }
}

function updateCharityUI() {
  // Calculate total given this month
  const totalGiven = charityData.history.reduce((sum, item) => sum + item.amount, 0);
  
  // Calculate percentage
  const percent = charityData.monthlyTarget > 0 ? Math.min(Math.round((totalGiven / charityData.monthlyTarget) * 100), 100) : 0;

  // Update banner numbers
  document.getElementById('sadaqaGivenAmount').textContent = `৳${totalGiven.toLocaleString()}`;
  document.getElementById('sadaqaTargetAmount').textContent = `৳${charityData.monthlyTarget.toLocaleString()}`;
  document.getElementById('sadaqaProgressText').textContent = `${percent}%`;
  document.getElementById('sadaqaProgressFill').style.width = `${percent}%`;
  document.getElementById('entriesCount').textContent = `${charityData.history.length} entries`;

  // Update Wallet Dropdown in Modal
  const walletSelect = document.getElementById('sadaqaWalletSelect');
  if (walletSelect) {
      walletSelect.innerHTML = wallets.map(w => `<option value="${w.id}">${w.name} (৳${w.currentBalance.toLocaleString()})</option>`).join('');
  }

  // Re-render table list
  const tbody = document.getElementById('sadaqaTableBody');
  if (tbody) {
    tbody.innerHTML = charityData.history.map((item) => `
      <tr>
        <td>
          <span class="heart-icon"><i class="fa-solid fa-heart"></i></span>
          <strong>${item.desc}</strong>
        </td>
        <td><span class="tag-badge">${item.cat}</span></td>
        <td><span style="color: #2563eb; font-weight: 600;">${item.wallet}</span></td>
        <td class="amount-sadaqa">৳${item.amount.toLocaleString()}</td>
        <td class="date-col">${item.date}</td>
        <td>
          <button type="button" class="action-delete" onclick="deleteCharity(${item.id})">
            <i class="fa-solid fa-trash"></i>
          </button>
        </td>
      </tr>
    `).join('');
  }
}

// Delete an entry
window.deleteCharity = async function(id) {
  if (confirm("Are you sure you want to remove this record? The amount will be refunded to your wallet.")) {
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`/api/transactions/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            await fetchCharityData();
            updateCharityUI();
        } else {
            alert("Failed to delete record.");
        }
    } catch (e) {
        console.error(e);
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

  // Modal open & close
  const modal = document.getElementById('sadaqaModalBackdrop');
  const openBtn = document.getElementById('openLogModalBtn');
  const closeBtn = document.getElementById('closeModalBtn');
  const cancelBtn = document.getElementById('cancelModalBtn');

  function openModal() { modal.classList.add('open'); }
  function closeModal() { modal.classList.remove('open'); }

  if (openBtn) openBtn.addEventListener('click', openModal);
  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  // Quick Amount Buttons click handler
  document.querySelectorAll('.quick-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById('sadaqaAmountInput').value = btn.getAttribute('data-val');
    });
  });

  // Category Pills selector
  document.querySelectorAll('.cat-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.cat-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      selectedCategory = pill.getAttribute('data-cat');
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
        }
      }
    });
  }

  // Form Submit (Log new Charity)
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
          transactionDate: dateVal || new Date().toISOString().split('T')[0]
      }];

      const res = await fetch('/api/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify(payload)
      });

      if (res.ok) {
          logForm.reset();
          dateInput.value = new Date().toISOString().split('T')[0];
          closeModal();
          await fetchCharityData();
          updateCharityUI();
      } else {
          alert('Failed to log charity. Please check wallet balance.');
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