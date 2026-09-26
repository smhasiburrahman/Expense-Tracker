// --------- Password Visibility Toggle Function ----------
function setupPasswordToggle(toggleBtnId, inputId) {
  const toggleBtn = document.getElementById(toggleBtnId);
  const input = document.getElementById(inputId);

  if (toggleBtn && input) {
    toggleBtn.addEventListener('click', () => {
      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';
      toggleBtn.innerHTML = isPassword 
        ? '<i class="fa-regular fa-eye-slash"></i>' 
        : '<i class="fa-regular fa-eye"></i>';
    });
  }
}

// Setup Toggles
setupPasswordToggle('togglePassword', 'password');
setupPasswordToggle('toggleRegPassword', 'regPassword');

// --------- Sign In Form Submit & Direct Page Switch ----------
const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    // directori same so move to  dashboard.html 
    window.location.href = 'dashboard.html';
  });
}

// --------- Register Form Submit & Direct Page Switch ----------
const registerForm = document.getElementById('registerForm');
if (registerForm) {
  registerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const pass = document.getElementById('regPassword').value;
    const confirmPass = document.getElementById('regConfirmPassword').value;

    if (pass !== confirmPass) {
      alert('Passwords do not match!');
      return;
    }

    //if reg is complete go dashboard
    window.location.href = 'dashboard.html';
  });
}