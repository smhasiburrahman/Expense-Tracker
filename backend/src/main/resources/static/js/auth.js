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

// --------- Sign In Form Submit ----------
const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const btn = document.getElementById('signInBtn');
    
    const alertBox = document.getElementById('loginAlertBox');
    const alertText = document.getElementById('loginAlertText');
    if (alertBox) alertBox.style.display = 'none';

    btn.disabled = true;
    btn.textContent = 'Signing in...';

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password })
      });
      
      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('token', data.token);

        // Pre-fetch user profile to initialize global session state before redirecting
        try {
          const profileRes = await fetch('/api/users/me', {
            headers: { 'Authorization': `Bearer ${data.token}` }
          });
          if (profileRes.ok) {
            const profileData = await profileRes.json();
            localStorage.setItem('currentUser', JSON.stringify(profileData));
          }
        } catch (profileErr) {
          console.warn('Could not pre-fetch profile on login:', profileErr);
        }

        window.location.href = 'dashboard.html';
      } else {
        const errText = await response.text();
        const msg = errText || 'Invalid email or password';
        if (alertBox && alertText) {
          alertText.textContent = msg;
          alertBox.style.display = 'flex';
        } else {
          alert('Login failed: ' + msg);
        }
      }
    } catch (error) {
      console.error(error);
      if (alertBox && alertText) {
        alertText.textContent = 'Connection error. Please ensure the backend server is reachable.';
        alertBox.style.display = 'flex';
      } else {
        alert('An error occurred during login.');
      }
    } finally {
      btn.disabled = false;
      btn.textContent = 'Sign in';
    }
  });
}

// --------- Register Form Submit ----------
const registerForm = document.getElementById('registerForm');
if (registerForm) {
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const fullName = document.getElementById('regFullName').value;
    const email = document.getElementById('regEmail').value;
    const pass = document.getElementById('regPassword').value;
    const confirmPass = document.getElementById('regConfirmPassword').value;
    const btn = document.getElementById('createAccountBtn');

    if (pass !== confirmPass) {
      alert('Passwords do not match!');
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Creating account...';

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, email, password: pass })
      });
      
      if (response.ok) {
        // Auto-login after successful registration
        const loginRes = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password: pass })
        });
        if(loginRes.ok) {
          const data = await loginRes.json();
          localStorage.setItem('token', data.token);

          try {
            const profileRes = await fetch('/api/users/me', {
              headers: { 'Authorization': `Bearer ${data.token}` }
            });
            if (profileRes.ok) {
              const profileData = await profileRes.json();
              localStorage.setItem('currentUser', JSON.stringify(profileData));
            }
          } catch (profileErr) {
            console.warn('Could not pre-fetch profile on register:', profileErr);
          }

          window.location.href = 'onboarding.html';
        } else {
          alert('Registration successful, but auto-login failed. Please sign in.');
          window.location.href = 'index.html';
        }
      } else {
        const errText = await response.text();
        alert('Registration failed: ' + errText);
      }
    } catch (error) {
      console.error(error);
      alert('An error occurred during registration.');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Create Account';
    }
  });
}