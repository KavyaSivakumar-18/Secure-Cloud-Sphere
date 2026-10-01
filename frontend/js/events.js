/**
 * Security Event Logs Controller
 */

let searchTimeout = null;

async function loadEvents() {
  const search = document.getElementById('event-search').value.trim();
  const severity = document.getElementById('event-sev-filter').value;
  const service = document.getElementById('event-service-filter').value;

  try {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (severity && severity !== 'ALL') params.append('severity', severity);
    if (service && service !== 'ALL') params.append('service', service);

    const data = await apiFetch(`/api/events?${params.toString()}`);
    if (!data) return;

    renderEventsTable(data.events || []);

    const dashData = await apiFetch('/api/dashboard');
    if (dashData) {
      updateTopBarStatus(dashData.isLive, dashData.awsRegion, dashData.lastScanTime);
    }
  } catch (err) {
    console.error('Error loading events:', err);
  }
}

function debouncedSearch() {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    loadEvents();
  }, 300);
}

function renderEventsTable(events) {
  const tbody = document.getElementById('events-tbody');
  if (!tbody) return;

  if (events.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; color:var(--text-dim);">No audit events match search query</td></tr>';
    return;
  }

  tbody.innerHTML = events.map(e => {
    const formattedTime = new Date(e.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'medium' });
    return `
      <tr>
        <td style="font-family:var(--font-mono); font-size:0.75rem; color:var(--text-dim);">${formattedTime}</td>
        <td><strong style="color:var(--text-main); font-family:var(--font-mono);">${e.event_name}</strong></td>
        <td><i class="fa-solid fa-user-shield" style="font-size:0.75rem; color:var(--primary); margin-right:4px;"></i> ${e.username}</td>
        <td><span style="font-size:0.75rem; background:rgba(255,255,255,0.06); padding:2px 6px; border-radius:4px;">${e.service}</span></td>
        <td style="font-family:var(--font-mono); font-size:0.75rem; color:var(--text-muted);">${e.source_ip}</td>
        <td style="font-family:var(--font-mono); font-size:0.78rem;">${e.resource}</td>
        <td><span class="badge-sev ${e.severity}">${e.severity}</span></td>
        <td style="font-family:var(--font-mono); font-weight:700; color:${e.risk_score > 75 ? 'var(--critical)' : (e.risk_score > 40 ? 'var(--high)' : 'var(--low)')};">${e.risk_score}</td>
        <td style="font-size:0.78rem; color:var(--text-muted); max-width:240px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${e.details}">${e.details || 'N/A'}</td>
      </tr>
    `;
  }).join('');
}

document.addEventListener('DOMContentLoaded', loadEvents);
