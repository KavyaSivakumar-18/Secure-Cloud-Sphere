/**
 * Security Alerts Management Page Logic
 */

async function loadAlerts() {
  const statusFilter = document.getElementById('filter-status').value;
  const severityFilter = document.getElementById('filter-severity').value;

  try {
    const data = await apiFetch(`/api/alerts?status=${statusFilter}&severity=${severityFilter}`);
    if (!data) return;

    // Update Stats
    document.getElementById('stat-critical').textContent = data.stats.critical || 0;
    document.getElementById('stat-high').textContent = data.stats.high || 0;
    document.getElementById('stat-open').textContent = data.stats.open || 0;
    document.getElementById('stat-resolved').textContent = data.stats.resolved || 0;

    renderAlertsTable(data.alerts);

    // Fetch dashboard info for top bar status
    const dashData = await apiFetch('/api/dashboard');
    if (dashData) {
      updateTopBarStatus(dashData.isLive, dashData.awsRegion, dashData.lastScanTime);
    }
  } catch (err) {
    console.error('Error loading alerts:', err);
  }
}

function renderAlertsTable(alerts) {
  const tbody = document.getElementById('alerts-tbody');
  if (!tbody) return;

  if (alerts.length === 0) {
    tbody.innerHTML = '<tr><td colspan="10" style="text-align:center; color:var(--text-dim);">No alerts match the selected criteria</td></tr>';
    return;
  }

  tbody.innerHTML = alerts.map(a => {
    const formattedTime = new Date(a.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
    return `
      <tr>
        <td style="font-family:var(--font-mono); font-weight:600; color:var(--primary);">${a.id}</td>
        <td style="font-family:var(--font-mono); font-size:0.75rem; color:var(--text-dim);">${formattedTime}</td>
        <td><strong>${a.service}</strong></td>
        <td style="font-family:var(--font-mono); font-size:0.78rem;">${a.resource}</td>
        <td style="font-size:0.8rem;">${a.description}</td>
        <td><span class="badge-sev ${a.severity}">${a.severity}</span></td>
        <td style="font-family:var(--font-mono); font-weight:700; color:${a.risk_score > 75 ? 'var(--critical)' : 'var(--high)'};">${a.risk_score}</td>
        <td><span class="badge-status ${a.status}">${a.status}</span></td>
        <td style="font-size:0.78rem; color:var(--text-muted);">${a.action || 'Review Policy'}</td>
        <td>
          <select class="select-filter" style="padding:0.25rem 0.5rem; font-size:0.75rem;" onchange="updateAlertStatus('${a.id}', this.value)">
            <option value="Open" ${a.status === 'Open' ? 'selected' : ''}>Open</option>
            <option value="Investigating" ${a.status === 'Investigating' ? 'selected' : ''}>Investigating</option>
            <option value="Resolved" ${a.status === 'Resolved' ? 'selected' : ''}>Resolved</option>
          </select>
        </td>
      </tr>
    `;
  }).join('');
}

async function updateAlertStatus(alertId, newStatus) {
  try {
    const result = await apiFetch(`/api/alerts/${alertId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status: newStatus })
    });

    if (result && result.alert) {
      loadAlerts();
    }
  } catch (err) {
    alert('Failed to update alert status');
  }
}

document.addEventListener('DOMContentLoaded', loadAlerts);
