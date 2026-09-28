let currentStep = 1;

function updateProgress(step) {
  const progressBar = document.querySelector('.progress-bar');
  const percentage = (step / 4) * 100;
  progressBar.style.setProperty('--progress', `${percentage}%`);
  // Use a hack since inline pseudo-elements can't be styled easily
  const style = document.createElement('style');
  style.innerHTML = `.progress-bar::after { width: ${percentage}%; }`;
  document.head.appendChild(style);

  document.querySelectorAll('.step-indicator span').forEach((el, index) => {
    if (index < step) el.classList.add('active');
    else el.classList.remove('active');
  });
}

function nextStep(step) {
  document.getElementById(`step-${currentStep}`).classList.remove('active');
  currentStep = step;
  document.getElementById(`step-${currentStep}`).classList.add('active');
  updateProgress(currentStep);
}

function prevStep(step) {
  document.getElementById(`step-${currentStep}`).classList.remove('active');
  currentStep = step;
  document.getElementById(`step-${currentStep}`).classList.add('active');
  updateProgress(currentStep);
}

async function addCustomCategory() {
  const name = document.getElementById('catName').value;
  const budget = document.getElementById('catBudget').value;
  const color = document.getElementById('catColor').value;
  
  if(!name) return alert("Please enter a category name");

  const token = localStorage.getItem('token');
  try {
    const res = await fetch('/api/onboarding/categories', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` 
      },
      body: JSON.stringify({ name, monthlyBudgetCap: budget, colorHex: color, icon: 'fa-box' })
    });
    if(res.ok) {
      const cat = await res.json();
      const div = document.createElement('div');
      div.className = 'cat-pill';
      div.innerHTML = `<i class="fa-solid fa-box" style="color:${color}"></i> ${cat.name}`;
      document.getElementById('onboardingCategories').appendChild(div);
      
      document.getElementById('catName').value = '';
      document.getElementById('catBudget').value = '';
    } else {
      alert("Failed to add category");
    }
  } catch(e) { console.error(e); }
}

async function addWallet() {
  const name = document.getElementById('walletName').value;
  const balance = document.getElementById('walletBalance').value;
  const color = document.getElementById('walletColor').value;
  
  if(!name || !balance) return alert("Please fill wallet details");

  const token = localStorage.getItem('token');
  try {
    const res = await fetch('/api/onboarding/wallets', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` 
      },
      body: JSON.stringify({ name, openingBalance: balance, colorHex: color, icon: 'fa-wallet', currencyCode: 'BDT' })
    });
    if(res.ok) {
      const w = await res.json();
      // Add wallet ID to localStorage for recurring transaction step to use
      localStorage.setItem('defaultWalletId', w.id);

      const div = document.createElement('div');
      div.className = 'list-item';
      div.innerHTML = `<span><i class="fa-solid fa-wallet" style="color:${color}"></i> ${w.name}</span> <span>BDT ${w.openingBalance}</span>`;
      document.getElementById('walletsContainer').appendChild(div);
      
      document.getElementById('walletName').value = '';
      document.getElementById('walletBalance').value = '';
    } else {
      alert("Failed to add wallet");
    }
  } catch(e) { console.error(e); }
}

async function addRecurring() {
  const name = document.getElementById('recName').value;
  const amount = document.getElementById('recAmount').value;
  const freq = document.getElementById('recFreq').value;
  const date = document.getElementById('recDate').value;
  
  const walletId = localStorage.getItem('defaultWalletId');
  if(!walletId || walletId === 'null' || walletId === 'undefined') {
      return alert("Please go back and add a wallet in the previous step first.");
  }

  const token = localStorage.getItem('token');
  try {
    const res = await fetch('/api/onboarding/recurring', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` 
      },
      body: JSON.stringify({ name, amount, frequency: freq, nextChargeDate: date, walletId, icon: 'fa-repeat' })
    });
    if(res.ok) {
      const r = await res.json();
      const div = document.createElement('div');
      div.className = 'list-item';
      div.innerHTML = `<span><i class="fa-solid fa-repeat"></i> ${r.name} (${r.frequency})</span> <span>BDT ${r.amount}</span>`;
      document.getElementById('recurringContainer').appendChild(div);
    }
  } catch(e) { console.error(e); }
}

async function finishOnboarding() {
  // Save Income first
  const income = document.getElementById('incomeInput').value || 0;
  const token = localStorage.getItem('token');
  
  if(income > 0) {
    await fetch(`/api/onboarding/income?income=${income}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
  }

  // Complete onboarding
  await fetch('/api/onboarding/complete', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  });

  window.location.href = 'dashboard.html';
}

document.getElementById('skipBtn').addEventListener('click', async () => {
  const token = localStorage.getItem('token');
  await fetch('/api/onboarding/complete', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  window.location.href = 'dashboard.html';
});
