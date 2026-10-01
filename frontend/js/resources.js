/**
 * AWS Resources Page Logic
 */

let allResourcesList = [];

async function loadResources() {
  try {
    const data = await apiFetch('/api/resources');
    if (!data) return;

    allResourcesList = data.resources || [];
    renderResourcesTable(allResourcesList);

    // Fetch dashboard info for top bar status
    const dashData = await apiFetch('/api/dashboard');
    if (dashData) {
      updateTopBarStatus(dashData.isLive, dashData.awsRegion, dashData.lastScanTime);
    }
  } catch (err) {
    console.error('Error loading resources:', err);
  }
}

function renderResourcesTable(resources) {
  const tbody = document.getElementById('resources-tbody');
  if (!tbody) return;

  if (resources.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:var(--text-dim);">No AWS resources match the filter</td></tr>';
    return;
  }

  tbody.innerHTML = resources.map(r => {
    let iconClass = 'fa-cube';
    if (r.type === 'S3') iconClass = 'fa-bucket';
    else if (r.type === 'IAM') iconClass = 'fa-user-shield';
    else if (r.type === 'CloudTrail') iconClass = 'fa-route';
    else if (r.type === 'CloudWatch') iconClass = 'fa-chart-area';
    else if (r.type.includes('EC2')) iconClass = 'fa-server';

    let statusBadge = `<span class="badge-sev ${r.status === 'Healthy' ? 'LOW' : (r.status === 'Warning' ? 'HIGH' : 'CRITICAL')}">${r.status}</span>`;

    const formattedTime = new Date(r.last_checked).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });

    return `
      <tr>
        <td><strong style="color:var(--text-main); font-family:var(--font-mono);"><i class="fa-solid ${iconClass}" style="color:var(--primary); margin-right:6px;"></i> ${r.name}</strong></td>
        <td><span style="font-size:0.75rem; background:rgba(255,255,255,0.06); padding:2px 8px; border-radius:4px;">${r.type}</span></td>
        <td style="font-family:var(--font-mono); font-size:0.78rem;">${r.region}</td>
        <td>${statusBadge}</td>
        <td style="font-size:0.82rem;">${r.security_status}</td>
        <td style="font-family:var(--font-mono); font-size:0.75rem; color:var(--text-dim);">${formattedTime}</td>
        <td><button class="btn-action" onclick="viewResourceDetail('${r.id}')"><i class="fa-solid fa-eye"></i> View</button></td>
      </tr>
    `;
  }).join('');
}

function filterResources() {
  const search = document.getElementById('resource-search').value.toLowerCase();
  const typeFilter = document.getElementById('resource-type-filter').value;

  const filtered = allResourcesList.filter(r => {
    const matchesSearch = r.name.toLowerCase().includes(search) || r.type.toLowerCase().includes(search) || r.security_status.toLowerCase().includes(search);
    const matchesType = (typeFilter === 'ALL') || (r.type.toUpperCase().includes(typeFilter.toUpperCase()));
    return matchesSearch && matchesType;
  });

  renderResourcesTable(filtered);
}

function viewResourceDetail(resId) {
  const item = allResourcesList.find(r => r.id === resId);
  if (!item) return;

  const modal = document.getElementById('resource-modal');
  const title = document.getElementById('modal-title');
  const body = document.getElementById('modal-body');

  title.innerHTML = `<i class="fa-solid fa-cube" style="color:var(--primary);"></i> ${item.name} (${item.type})`;
  
  const detailsPretty = item.details ? JSON.stringify(item.details, null, 2) : '{}';

  body.innerHTML = `
    <div style="margin-bottom: 1rem;">
      <p><strong>Resource ID:</strong> <span style="font-family:var(--font-mono);">${item.id}</span></p>
      <p><strong>AWS Region:</strong> ${item.region}</p>
      <p><strong>Overall Status:</strong> ${item.status}</p>
      <p><strong>Security Profile:</strong> ${item.security_status}</p>
    </div>
    <div style="background:rgba(0,0,0,0.5); padding:1rem; border-radius:8px; border:1px solid var(--border-color);">
      <h4 style="font-size:0.8rem; color:var(--text-muted); margin-bottom:0.5rem;">TELEMETRY & CONFIGURATION PAYLOAD</h4>
      <pre style="font-family:var(--font-mono); font-size:0.75rem; color:var(--primary); white-space:pre-wrap; max-height:250px; overflow-y:auto;">${detailsPretty}</pre>
    </div>
  `;

  modal.classList.add('active');
}

function closeModal() {
  document.getElementById('resource-modal').classList.remove('active');
}

document.addEventListener('DOMContentLoaded', loadResources);
