// =========================================================================
// API CLIENT FUNCTION & DEMO STATE
// =========================================================================

// Global wallet state acting as the mock database
let walletsData = [
  { name: 'Cash', balance: 2340, icon: 'fa-money-bill-1', color: '#10b981', heights: [40, 80, 60, 90] },
  { name: 'bKash', balance: 8750, icon: 'fa-mobile-screen', color: '#ec4899', heights: [90, 70, 80, 60] },
  { name: 'Rocket', balance: 1200, icon: 'fa-bolt', color: '#8b5cf6', heights: [30, 40, 50, 70] },
  { name: 'BRAC Bank', balance: 45680, icon: 'fa-building-columns', color: '#3b82f6', heights: [70, 90, 85, 100] }
];

const walletTransactions = [
  { cat: 'Food & Dining', color: 'yellow', icon: 'fa-utensils', desc: 'Shawarma Palace, Bashundhara', amount: '-৳350', date: 'Today, 2:30 PM' },
  { cat: 'Transport', color: 'purple', icon: 'fa-car', desc: 'Uber — Gulshan to Dhanmondi', amount: '-৳180', date: 'Today, 11:15 AM' },
  { cat: 'Shopping', color: 'red', icon: 'fa-bag-shopping', desc: 'Daraz — Running Shoes', amount: '-৳2,100', date: 'Yesterday' },
  { cat: 'Food & Dining', color: 'orange', icon: 'fa-mug-hot', desc: "Gloria Jean's Coffee, Banani", amount: '-৳320', date: 'Yesterday' },
  { cat: 'Utilities', color: 'light-purple', icon: 'fa-bolt', desc: 'DESCO Electric Bill — July', amount: '-৳1,800', date: 'Jul 22' },
  { cat: 'Groceries', color: 'green', icon: 'fa-cart-shopping', desc: 'Shwapno Superstore, Mirpur', amount: '-৳1,200', date: 'Jul 22' },
  { cat: 'Entertainment', color: 'pink', icon: 'fa-film', desc: 'Netflix — Monthly Plan', amount: '-৳650', date: 'Jul 20' }
];

// Active form selection variables
let selectedIcon = 'fa-money-bill-1';
let selectedColor = '#10b981';

// API Fetch Mock Function
async function fetchWalletsData() {
  /*
  // -----------------------------------------------------------------------
  // TODO: BACKEND API CONNECTION (Uncomment when Laravel/Node API is ready)
  // -----------------------------------------------------------------------
  try {
    const res = await fetch('/api/wallets');
    return await res.json();
  } catch(e) {
    console.error("API error:", e);
  }
  */

  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        wallets: walletsData,
        transactions: walletTransactions
      });
    }, 40);
  });
}

// =========================================================================
// DOM RENDER LOGIC
// =========================================================================

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

  // Re-bind Add Wallet click event
  document.getElementById('openAddWalletModalBtn').addEventListener('click', openWalletModalForAdd);
}

function renderTransactions() {
  const tbody = document.getElementById('walletTransactionsBody');
  if (!tbody) return;

  tbody.innerHTML = walletTransactions.map(t => `
    <tr>
      <td><span class="table-cat ${t.color}"><i class="fa-solid ${t.icon}"></i> ${t.cat}</span></td>
      <td><strong>${t.desc}</strong></td>
      <td class="amount-minus">${t.amount}</td>
      <td class="date-col">${t.date}</td>
    </tr>
  `).join('');
}

// Update the real-time preview box in the modal
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

// =========================================================================
// MODAL CONTROLLERS (ADD & EDIT)
// =========================================================================

const modalBackdrop = document.getElementById('walletModalBackdrop');

function openModal() {
  modalBackdrop.classList.add('open');
}

function closeModal() {
  modalBackdrop.classList.remove('open');
}

// Open modal to Add New Wallet (e.g. Nagad, Upay)
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

// Open modal to Edit existing wallet balance/name
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

// Helper: sync UI active states for icon & color
function resetActivePills() {
  // Sync Icon
  document.querySelectorAll('.icon-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-icon') === selectedIcon);
  });
  // Sync Color
  document.querySelectorAll('.color-swatch').forEach(swatch => {
    swatch.classList.toggle('active', swatch.getAttribute('data-color') === selectedColor);
  });
}

// =========================================================================
// EVENT LISTENERS & SETUP
// =========================================================================

document.addEventListener('DOMContentLoaded', async () => {
  await fetchWalletsData();
  renderWallets();
  renderTransactions();

  // Close modal events
  document.getElementById('closeWalletModalBtn').addEventListener('click', closeModal);
  document.getElementById('cancelWalletModalBtn').addEventListener('click', closeModal);
  modalBackdrop.addEventListener('click', (e) => {
    if (e.target === modalBackdrop) closeModal();
  });

  // Real-time preview typing triggers
  document.getElementById('walletNameInput').addEventListener('input', updateModalPreview);
  document.getElementById('walletBalanceInput').addEventListener('input', updateModalPreview);

  // Icon buttons selection
  document.querySelectorAll('.icon-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.icon-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedIcon = btn.getAttribute('data-icon');
      updateModalPreview();
    });
  });

  // Color swatches selection
  document.querySelectorAll('.color-swatch').forEach(swatch => {
    swatch.addEventListener('click', () => {
      document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
      swatch.classList.add('active');
      selectedColor = swatch.getAttribute('data-color');
      updateModalPreview();
    });
  });

  // Form Submit (Handles both ADD and EDIT)
  document.getElementById('walletForm').addEventListener('submit', (e) => {
    e.preventDefault();

    const editIndex = parseInt(document.getElementById('editWalletIndex').value);
    const name = document.getElementById('walletNameInput').value.trim();
    const balance = Number(document.getElementById('walletBalanceInput').value);

    if (!name) return;

    if (editIndex >= 0) {
      // -------------------------------------------------------------------
      // UPDATE EXISTING WALLET
      // -------------------------------------------------------------------
      /*
      // API call: await fetch(`/api/wallets/${walletsData[editIndex].id}`, { method: 'PUT', ... });
      */
      walletsData[editIndex].name = name;
      walletsData[editIndex].balance = balance;
      walletsData[editIndex].icon = selectedIcon;
      walletsData[editIndex].color = selectedColor;
    } else {
      // -------------------------------------------------------------------
      // ADD NEW WALLET (Nagad, etc.)
      // -------------------------------------------------------------------
      /*
      // API call: await fetch('/api/wallets', { method: 'POST', ... });
      */
      walletsData.push({
        name: name,
        balance: balance,
        icon: selectedIcon,
        color: selectedColor,
        heights: [50, 70, 60, 85]
      });
    }

    closeModal();
    renderWallets();
  });

  // Logout listener
  document.getElementById('logoutBtn').addEventListener('click', () => {
    window.location.href = 'index.html';
  });


});