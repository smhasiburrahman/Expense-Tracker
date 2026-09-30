// =========================================================================
// SADAQA DATA STATE (Local state acting like backend data)
// =========================================================================

let sadaqaData = {
  monthlyTarget: 5000,
  history: [
    { desc: 'Masjid Al-Noor Donation', cat: 'Mosque', amount: 500, date: 'Jul 21, 2025' },
    { desc: 'Flood Relief Fund — BRAC', cat: 'Disaster Relief', amount: 2000, date: 'Jul 15, 2025' },
    { desc: 'Orphanage — Eid Gifts', cat: 'Children', amount: 1500, date: 'Jul 8, 2025' },
    { desc: 'Local Madrasa Support', cat: 'Education', amount: 1000, date: 'Jul 1, 2025' },
    { desc: "Weekly Jumu'ah Sadaqa", cat: 'Regular', amount: 200, date: 'Jun 27, 2025' }
  ]
};

let selectedCategory = 'Mosque';

// =========================================================================
// CALCULATION & UI RE-RENDER
// =========================================================================

function updateSadaqaUI() {
  // Calculate total given this month
  const totalGiven = sadaqaData.history.reduce((sum, item) => sum + item.amount, 0);
  
  // Calculate percentage
  const percent = Math.min(Math.round((totalGiven / sadaqaData.monthlyTarget) * 100), 100);

  // Update banner numbers
  document.getElementById('sadaqaGivenAmount').textContent = `৳${totalGiven.toLocaleString()}`;
  document.getElementById('sadaqaTargetAmount').textContent = `৳${sadaqaData.monthlyTarget.toLocaleString()}`;
  document.getElementById('sadaqaProgressText').textContent = `${percent}%`;
  document.getElementById('sadaqaProgressFill').style.width = `${percent}%`;
  document.getElementById('entriesCount').textContent = `${sadaqaData.history.length} entries`;

  // Re-render table list
  const tbody = document.getElementById('sadaqaTableBody');
  if (tbody) {
    tbody.innerHTML = sadaqaData.history.map((item, index) => `
      <tr>
        <td>
          <span class="heart-icon"><i class="fa-solid fa-heart"></i></span>
          <strong>${item.desc}</strong>
        </td>
        <td><span class="tag-badge">${item.cat}</span></td>
        <td class="amount-sadaqa">৳${item.amount.toLocaleString()}</td>
        <td class="date-col">${item.date}</td>
        <td>
          <button type="button" class="action-delete" onclick="deleteSadaqa(${index})">
            <i class="fa-solid fa-trash"></i>
          </button>
        </td>
      </tr>
    `).join('');
  }
}

// Delete an entry
window.deleteSadaqa = function(index) {
  if (confirm("Are you sure you want to remove this record?")) {
    sadaqaData.history.splice(index, 1);
    updateSadaqaUI();
  }
};

// =========================================================================
// EVENT LISTENERS & MODAL CONTROLS
// =========================================================================

document.addEventListener('DOMContentLoaded', () => {
  // Set default date in modal to today
  const dateInput = document.getElementById('sadaqaDateInput');
  if (dateInput) {
    const today = new Date().toISOString().split('T')[0];
    dateInput.value = today;
  }

  // Initial render
  updateSadaqaUI();

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

  // Close modal when clicking on the backdrop
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
    editTargetBtn.addEventListener('click', () => {
      const newTarget = prompt("Enter your new monthly Sadaqa target (in BDT):", sadaqaData.monthlyTarget);
      if (newTarget && !isNaN(newTarget) && Number(newTarget) > 0) {
        sadaqaData.monthlyTarget = Number(newTarget);
        updateSadaqaUI();
      }
    });
  }

  // Form Submit (Log new Sadaqa)
  const logForm = document.getElementById('logSadaqaForm');
  if (logForm) {
    logForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const amountVal = Number(document.getElementById('sadaqaAmountInput').value);
      const descVal = document.getElementById('sadaqaDescInput').value.trim();
      const dateVal = document.getElementById('sadaqaDateInput').value;

      if (!amountVal || !descVal) return;

      // Add to array
      sadaqaData.history.unshift({
        desc: descVal,
        cat: selectedCategory,
        amount: amountVal,
        date: dateVal || 'Today'
      });

      // Reset form and close
      logForm.reset();
      dateInput.value = new Date().toISOString().split('T')[0];
      closeModal();

      // Refresh UI
      updateSadaqaUI();
    });
  }

  // Logout listener
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      window.location.href = 'index.html';
    });
  }
});