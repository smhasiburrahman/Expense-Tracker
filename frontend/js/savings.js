// =========================================================================
// SAVINGS STATE (Local state acting like backend data)
// =========================================================================

let savingsData = {
  vaults: [
    { title: "Cox's Bazar Trip", targetDate: 'Target by Dec 2025', current: 18500, goal: 25000, percent: 74, icon: '🏖️', color: '#10b981', badgeClass: 'green', achieved: false },
    { title: 'New Laptop', targetDate: 'Target by Mar 2026', current: 32000, goal: 80000, percent: 40, icon: '💻', color: '#7c3aed', badgeClass: 'purple', achieved: false },
    { title: 'Emergency Fund', targetDate: 'Target Completed', current: 50000, goal: 50000, percent: 100, icon: '🛡️', color: '#10b981', badgeClass: 'green', achieved: true },
    { title: 'Books & Courses', targetDate: 'Target by Ongoing', current: 6200, goal: 10000, percent: 62, icon: '📚', color: '#ea580c', badgeClass: 'orange', achieved: false }
  ],
  history: [] // Holds funding activity
};

let selectedNewVaultEmoji = '🎯';

// =========================================================================
// API FETCH FUNCTION (Uncomment when Backend is Ready)
// =========================================================================
async function fetchSavingsFromAPI() {
  /*
  // -----------------------------------------------------------------------
  // TODO: BACKEND API CONNECTION
  // -----------------------------------------------------------------------
  try {
    const res = await fetch('/api/savings');
    return await res.json();
  } catch(e) {
    console.error("API error:", e);
  }
  */

  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(savingsData);
    }, 40);
  });
}

// =========================================================================
// RENDER UI FUNCTIONS
// =========================================================================

function renderSavingsUI() {
  // 1. Calculate overall metrics
  const totalSaved = savingsData.vaults.reduce((acc, v) => acc + v.current, 0);
  const totalTarget = savingsData.vaults.reduce((acc, v) => acc + v.goal, 0);
  const overallPercent = totalTarget > 0 ? Math.min(Math.round((totalSaved / totalTarget) * 100), 100) : 0;

  // Update Banner
  document.getElementById('totalSavedAmount').textContent = `৳${totalSaved.toLocaleString()}`;
  document.getElementById('activeVaultsCount').textContent = `across ${savingsData.vaults.length} active vaults`;
  document.getElementById('overallPercent').textContent = `${overallPercent}%`;
  document.getElementById('overallFill').style.width = `${overallPercent}%`;
  document.getElementById('targetTotalText').textContent = `of ৳${totalTarget.toLocaleString()} target`;

  // 2. Render Cards Grid
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

    // Bind New Vault button
    document.getElementById('openNewVaultModalBtn').addEventListener('click', openNewVaultModal);
  }

  // 3. Render Funding History Table
  const historyTbody = document.getElementById('fundingHistoryBody');
  if (historyTbody) {
    if (savingsData.history.length === 0) {
      historyTbody.innerHTML = `
        <tr>
          <td colspan="4" class="empty-state-cell">
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
        </tr>
      `).join('');
    }
  }
}

// =========================================================================
// MODAL CONTROLLERS (Add Funds & New Vault)
// =========================================================================

const addFundsBackdrop = document.getElementById('addFundsModalBackdrop');
const newVaultBackdrop = document.getElementById('newVaultModalBackdrop');

// Open Add Funds
window.openAddFundsModal = function(index) {
  const v = savingsData.vaults[index];
  document.getElementById('addFundsVaultIndex').value = index;
  document.getElementById('addFundsVaultTitle').textContent = `Deposit to ${v.title}`;
  document.getElementById('depositAmountInput').value = '';
  addFundsBackdrop.classList.add('open');
};

function closeAddFundsModal() {
  addFundsBackdrop.classList.remove('open');
}

// Open New Vault
function openNewVaultModal() {
  document.getElementById('vaultTitleInput').value = '';
  document.getElementById('vaultTargetInput').value = '';
  document.getElementById('vaultDateInput').value = '';
  newVaultBackdrop.classList.add('open');
}

function closeNewVaultModal() {
  newVaultBackdrop.classList.remove('open');
}

// =========================================================================
// EVENT LISTENERS & FORM HANDLERS
// =========================================================================

document.addEventListener('DOMContentLoaded', async () => {
  await fetchSavingsFromAPI();
  renderSavingsUI();

  // Close modals listeners
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

  // Quick Deposit Pills
  document.querySelectorAll('.quick-pill-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById('depositAmountInput').value = btn.getAttribute('data-val');
    });
  });

  // Emoji buttons
  document.querySelectorAll('.emoji-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.emoji-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedNewVaultEmoji = btn.getAttribute('data-emoji');
    });
  });

  // Form 1: Add Funds Submit
  document.getElementById('addFundsForm').addEventListener('submit', (e) => {
    e.preventDefault();

    const vaultIdx = parseInt(document.getElementById('addFundsVaultIndex').value);
    const amountVal = Number(document.getElementById('depositAmountInput').value);
    const walletVal = document.getElementById('depositWalletSelect').value;

    if (vaultIdx >= 0 && amountVal > 0) {
      // -------------------------------------------------------------------
      // API DEPOSIT CALL (Uncomment for backend)
      // -------------------------------------------------------------------
      /*
      // await fetch(`/api/savings/${vaultIdx}/deposit`, { method: 'POST', body: JSON.stringify({ amount: amountVal, wallet: walletVal }) });
      */

      const targetVault = savingsData.vaults[vaultIdx];
      targetVault.current += amountVal;

      // Recalculate percent
      const newPercent = Math.round((targetVault.current / targetVault.goal) * 100);
      targetVault.percent = newPercent;

      if (targetVault.current >= targetVault.goal) {
        targetVault.achieved = true;
        targetVault.percent = 100;
        targetVault.badgeClass = 'green';
      }

      // Add to history
      savingsData.history.unshift({
        vault: targetVault.title,
        amount: amountVal,
        wallet: walletVal,
        date: 'Today, Just now'
      });

      closeAddFundsModal();
      renderSavingsUI();
    }
  });

  // Form 2: Create New Vault Submit
  document.getElementById('newVaultForm').addEventListener('submit', (e) => {
    e.preventDefault();

    const titleVal = document.getElementById('vaultTitleInput').value.trim();
    const targetVal = Number(document.getElementById('vaultTargetInput').value);
    const dateVal = document.getElementById('vaultDateInput').value;

    if (titleVal && targetVal > 0) {
      // -------------------------------------------------------------------
      // API CREATE VAULT CALL (Uncomment for backend)
      // -------------------------------------------------------------------
      /*
      // await fetch('/api/savings', { method: 'POST', body: JSON.stringify({ title: titleVal, target: targetVal, date: dateVal, icon: selectedNewVaultEmoji }) });
      */

      savingsData.vaults.push({
        title: titleVal,
        targetDate: dateVal ? `Target by ${dateVal}` : 'Ongoing Target',
        current: 0,
        goal: targetVal,
        percent: 0,
        icon: selectedNewVaultEmoji,
        color: '#10b981',
        badgeClass: 'orange',
        achieved: false
      });

      closeNewVaultModal();
      renderSavingsUI();
    }
  });

  // Logout listener
  document.getElementById('logoutBtn').addEventListener('click', () => {
    window.location.href = 'index.html';
  });


});