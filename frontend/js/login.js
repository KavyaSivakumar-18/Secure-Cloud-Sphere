document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const usernameInput = document.getElementById('username').value.trim();
  const passwordInput = document.getElementById('password').value.trim();
  const errorDiv = document.getElementById('login-error');

  errorDiv.style.display = 'none';

  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: usernameInput, password: passwordInput })
    });

    const data = await response.json();

    if (!response.ok) {
      errorDiv.textContent = data.error || 'Authentication failed';
      errorDiv.style.display = 'block';
      return;
    }

    // Store token and user data
    localStorage.setItem('cs_token', data.token);
    localStorage.setItem('cs_user', JSON.stringify(data.user));

    // Redirect to dashboard
    window.location.href = 'dashboard.html';
  } catch (err) {
    errorDiv.textContent = 'Unable to connect to security server. Ensure backend is running.';
    errorDiv.style.display = 'block';
  }
});
