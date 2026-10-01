/**
 * Dashboard Logic & Chart.js Visualizations
 */

let chartEventsTime, chartAlertsSev, chartEventsService, chartRiskDist;

async function loadDashboardData() {
  try {
    const data = await apiFetch('/api/dashboard');
    if (!data) return;

    // Update Top Bar & Mode Banner
    updateTopBarStatus(data.isLive, data.awsRegion, data.lastScanTime);

    const bannerEl = document.getElementById('demo-banner');
    if (bannerEl) {
      bannerEl.style.display = data.isLive ? 'none' : 'flex';
    }

    // Update Cards
    const scoreValEl = document.getElementById('card-score-val');
    const riskLevelEl = document.getElementById('card-risk-level');
    if (scoreValEl && riskLevelEl) {
      scoreValEl.textContent = `${data.securityScore}/100`;
      riskLevelEl.textContent = `Risk Level: ${data.riskLevel}`;

      if (data.securityScore > 75) {
        scoreValEl.className = 'metric-value sev-low';
      } else if (data.securityScore > 50) {
        scoreValEl.className = 'metric-value sev-medium';
      } else {
        scoreValEl.className = 'metric-value sev-critical';
      }
    }

    document.getElementById('card-alerts-val').textContent = data.cards.activeAlerts;
    document.getElementById('card-resources-val').textContent = data.cards.monitoredResources;
    document.getElementById('card-events-val').textContent = data.cards.eventsToday;

    // Render Charts
    renderEventsTimeChart(data.charts.eventsOverTime);
    renderAlertsSevChart(data.charts.alertsBySeverity);
    renderEventsServiceChart(data.charts.eventsByService);
    renderRiskDistChart(data.charts.riskDistribution);

    // Render Recent Tables
    renderRecentAlerts(data.recentAlerts);
    renderRecentEvents(data.recentEvents);
  } catch (err) {
    console.error('Failed to load dashboard:', err);
  }
}

function renderEventsTimeChart(chartData) {
  const ctx = document.getElementById('chartEventsTime').getContext('2d');
  if (chartEventsTime) chartEventsTime.destroy();

  chartEventsTime = new Chart(ctx, {
    type: 'line',
    data: {
      labels: chartData.labels,
      datasets: [{
        label: 'Security Events',
        data: chartData.data,
        borderColor: '#00f2fe',
        backgroundColor: 'rgba(0, 242, 254, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#9ca3af' } },
        y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#9ca3af' } }
      }
    }
  });
}

function renderAlertsSevChart(chartData) {
  const ctx = document.getElementById('chartAlertsSev').getContext('2d');
  if (chartAlertsSev) chartAlertsSev.destroy();

  chartAlertsSev = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: chartData.labels,
      datasets: [{
        data: chartData.data,
        backgroundColor: ['#ef4444', '#f97316', '#eab308', '#10b981'],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'right', labels: { color: '#f3f4f6', font: { size: 11 } } }
      },
      cutout: '70%'
    }
  });
}

function renderEventsServiceChart(chartData) {
  const ctx = document.getElementById('chartEventsService').getContext('2d');
  if (chartEventsService) chartEventsService.destroy();

  chartEventsService = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: chartData.labels,
      datasets: [{
        label: 'Event Count',
        data: chartData.data,
        backgroundColor: 'rgba(16, 185, 129, 0.7)',
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#9ca3af' } },
        y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#9ca3af' } }
      }
    }
  });
}

function renderRiskDistChart(chartData) {
  const ctx = document.getElementById('chartRiskDist').getContext('2d');
  if (chartRiskDist) chartRiskDist.destroy();

  chartRiskDist = new Chart(ctx, {
    type: 'radar',
    data: {
      labels: chartData.labels,
      datasets: [{
        label: 'Risk Vulnerability Score',
        data: chartData.data,
        borderColor: '#7928ca',
        backgroundColor: 'rgba(121, 40, 202, 0.2)',
        pointBackgroundColor: '#ff0080'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        r: {
          angleLines: { color: 'rgba(255,255,255,0.1)' },
          grid: { color: 'rgba(255,255,255,0.1)' },
          pointLabels: { color: '#9ca3af', font: { size: 10 } },
          ticks: { display: false }
        }
      }
    }
  });
}

function renderRecentAlerts(alerts = []) {
  const tbody = document.getElementById('recent-alerts-tbody');
  if (!tbody) return;

  if (alerts.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:var(--text-dim);">No active alerts</td></tr>';
    return;
  }

  tbody.innerHTML = alerts.map(a => `
    <tr>
      <td><span class="badge-sev ${a.severity}">${a.severity}</span></td>
      <td><strong>${a.service}</strong></td>
      <td style="font-family:var(--font-mono); font-size:0.78rem;">${a.resource}</td>
      <td style="font-size:0.8rem;">${a.description}</td>
      <td><span class="badge-status ${a.status}">${a.status}</span></td>
    </tr>
  `).join('');
}

function renderRecentEvents(events = []) {
  const tbody = document.getElementById('recent-events-tbody');
  if (!tbody) return;

  if (events.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:var(--text-dim);">No recent audit events</td></tr>';
    return;
  }

  tbody.innerHTML = events.map(e => {
    const timeStr = new Date(e.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `
      <tr>
        <td style="font-family:var(--font-mono); font-size:0.75rem; color:var(--text-dim);">${timeStr}</td>
        <td><strong>${e.event_name}</strong></td>
        <td><i class="fa-solid fa-user-shield" style="font-size:0.75rem; color:var(--primary);"></i> ${e.username}</td>
        <td>${e.service}</td>
        <td><span class="badge-sev ${e.severity}">${e.severity}</span></td>
      </tr>
    `;
  }).join('');
}

document.addEventListener('DOMContentLoaded', loadDashboardData);
