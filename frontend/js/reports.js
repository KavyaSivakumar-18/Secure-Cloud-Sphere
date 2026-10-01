/**
 * Security Reports Logic & PDF Export Controller
 */

async function loadReportData() {
  try {
    const data = await apiFetch('/api/reports');
    if (!data) return;

    // Report Header & Timestamps
    const timeFormatted = new Date(data.scanTimestamp).toLocaleString([], { dateStyle: 'full', timeStyle: 'short' });
    document.getElementById('report-timestamp').textContent = `Audit Date: ${timeFormatted}`;
    document.getElementById('report-status-badge').textContent = `Telemetry Source: ${data.isLive ? 'LIVE AWS AUDIT' : 'DEMO SIMULATION'}`;

    // Score & Badges
    const scoreEl = document.getElementById('rep-score');
    const badgeEl = document.getElementById('rep-risk-badge');

    scoreEl.textContent = `${data.securityScore}/100`;
    badgeEl.textContent = `Risk Level: ${data.riskLevel}`;
    badgeEl.className = `badge-sev ${data.riskLevel}`;

    if (data.securityScore > 75) scoreEl.className = 'sev-low';
    else if (data.securityScore > 50) scoreEl.className = 'sev-medium';
    else scoreEl.className = 'sev-critical';

    // Counts Breakdown
    document.getElementById('rep-cnt-critical').textContent = data.findingsBreakdown.critical || 0;
    document.getElementById('rep-cnt-high').textContent = data.findingsBreakdown.high || 0;
    document.getElementById('rep-cnt-medium').textContent = data.findingsBreakdown.medium || 0;
    document.getElementById('rep-cnt-low').textContent = data.findingsBreakdown.low || 0;

    // Recommendations
    const recsUl = document.getElementById('rep-recommendations');
    if (data.recommendations && data.recommendations.length > 0) {
      recsUl.innerHTML = data.recommendations.map(r => `
        <li style="background:rgba(255,255,255,0.03); padding:0.75rem 1rem; border-radius:6px; border-left:3px solid var(--primary); font-size:0.85rem;">
          <i class="fa-solid fa-circle-check" style="color:var(--primary); margin-right:8px;"></i> ${r}
        </li>
      `).join('');
    } else {
      recsUl.innerHTML = '<li style="color:var(--text-dim);">No specific security recommendations at this time.</li>';
    }

    // Findings Table
    renderFindingsTable(data.findingsList || []);

    // Update Topbar
    updateTopBarStatus(data.isLive, 'ap-south-1', data.scanTimestamp);
  } catch (err) {
    console.error('Error loading report:', err);
  }
}

function renderFindingsTable(findings) {
  const tbody = document.getElementById('rep-findings-tbody');
  if (!tbody) return;

  if (findings.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:var(--text-dim);">No security findings recorded.</td></tr>';
    return;
  }

  tbody.innerHTML = findings.map(f => `
    <tr>
      <td><span class="badge-sev ${f.severity}">${f.severity}</span></td>
      <td><strong>${f.service}</strong></td>
      <td style="font-family:var(--font-mono); font-size:0.78rem;">${f.resource}</td>
      <td style="font-size:0.8rem;">${f.description}</td>
      <td style="font-family:var(--font-mono); font-weight:700; color:${f.risk_score > 75 ? 'var(--critical)' : 'var(--high)'};">${f.risk_score}</td>
    </tr>
  `).join('');
}

function downloadPDFReport() {
  const element = document.getElementById('pdf-report-container');
  const opt = {
    margin:       0.3,
    filename:     `Cloud_Security_Report_${new Date().toISOString().slice(0, 10)}.pdf`,
    image:        { type: 'jpeg', quality: 0.98 },
    html2canvas:  { scale: 2, backgroundColor: '#0f172a' },
    jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
  };

  html2pdf().set(opt).from(element).save();
}

document.addEventListener('DOMContentLoaded', loadReportData);
