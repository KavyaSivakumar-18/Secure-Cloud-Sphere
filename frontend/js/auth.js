/**
 * Shared Auth & Global Navigation Controller
 */

const API_BASE = '';

function getAuthToken() {
  return localStorage.getItem('cs_token');
}

function checkAuthGuard() {
  const isLoginPage = window.location.pathname.endsWith('login.html');
  const token = getAuthToken();

  if (!token && !isLoginPage) {
    window.location.href = 'login.html';
    return false;
  }
  return true;
}

async function apiFetch(endpoint, options = {}) {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers
    });

    if (res.status === 401) {
      localStorage.removeItem('cs_token');
      localStorage.removeItem('cs_user');
      if (!window.location.pathname.endsWith('login.html')) {
        window.location.href = 'login.html';
      }
      return null;
    }

    return await res.json();
  } catch (err) {
    console.error(`API Error on ${endpoint}:`, err);
    throw err;
  }
}

function handleLogout() {
  localStorage.removeItem('cs_token');
  localStorage.removeItem('cs_user');
  window.location.href = 'login.html';
}

function updateTopBarStatus(isLive, region, lastScan) {
  const badgeEl = document.getElementById('top-status-badge');
  const regionEl = document.getElementById('top-region-val');
  const scanEl = document.getElementById('top-scan-val');

  if (badgeEl) {
    if (isLive) {
      badgeEl.className = 'status-badge live';
      badgeEl.innerHTML = '<span class="pulse-dot"></span> LIVE AWS DATA';
    } else {
      badgeEl.className = 'status-badge demo';
      badgeEl.innerHTML = '<span class="pulse-dot" style="background:#f97316"></span> DEMO MODE';
    }
  }

  if (regionEl && region) {
    regionEl.textContent = region;
  }

  if (scanEl && lastScan) {
    const d = new Date(lastScan);
    scanEl.textContent = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}

// Global Security Scan Trigger
async function triggerGlobalSecurityScan(btnElement) {
  if (btnElement) {
    btnElement.disabled = true;
    btnElement.innerHTML = '⚡ Scanning AWS...';
  }

  try {
    const result = await apiFetch('/api/security-scan', { method: 'POST' });
    if (result && result.scan) {
      alert(`Security Scan Completed!\nScore: ${result.scan.securityScore}/100 (${result.scan.riskLevel})\nGenerated Alerts: ${result.scan.generatedAlerts.length}`);
      window.location.reload();
    }
  } catch (err) {
    alert('Security scan failed. Please check backend connection.');
  } finally {
    if (btnElement) {
      btnElement.disabled = false;
      btnElement.innerHTML = '⚡ Run Security Scan';
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  checkAuthGuard();

  const userJson = localStorage.getItem('cs_user');
  if (userJson) {
    try {
      const user = JSON.parse(userJson);
      const nameEl = document.getElementById('user-display-name');
      if (nameEl) nameEl.textContent = user.username || 'admin';
    } catch (e) {}
  }
});
