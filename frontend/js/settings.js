/**
 * Settings Page Logic
 */

async function checkBackendHealth() {
  const alertBox = document.getElementById('settings-health-alert');
  const modeText = document.getElementById('health-mode-text');

  try {
    const health = await apiFetch('/health');
    if (health) {
      document.getElementById('sett-region').textContent = health.region || 'ap-south-1';

      if (health.awsConfigured) {
        alertBox.className = 'banner-warning';
        alertBox.style.background = 'rgba(16,185,129,0.15)';
        alertBox.style.borderColor = 'rgba(16,185,129,0.4)';
        alertBox.style.color = '#10b981';
        modeText.innerHTML = '<i class="fa-solid fa-circle-check"></i> <strong>LIVE AWS DATA:</strong> AWS Access Key detected and configured in backend .env.';
      } else {
        alertBox.className = 'banner-warning';
        modeText.innerHTML = '<strong>DEMO MODE (Simulated Telemetry):</strong> AWS credentials not configured in backend .env. Operating in realistic simulated mode.';
      }
    }

    const dashData = await apiFetch('/api/dashboard');
    if (dashData) {
      updateTopBarStatus(dashData.isLive, dashData.awsRegion, dashData.lastScanTime);
    }
  } catch (err) {
    if (modeText) modeText.textContent = 'Backend server unreachable. Ensure node backend is running on port 5000.';
  }
}

document.addEventListener('DOMContentLoaded', checkBackendHealth);
