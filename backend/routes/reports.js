const express = require('express');
const router = express.Router();
const { getQuery, allQuery } = require('../database/database');
const { runFullSecurityScan } = require('../services/securityScanner');

// GET /api/reports
router.get('/reports', async (req, res) => {
  try {
    const latestScan = await getQuery(`SELECT * FROM scans ORDER BY id DESC LIMIT 1`);
    const scanHistory = await allQuery(`SELECT * FROM scans ORDER BY timestamp DESC LIMIT 10`);
    const alerts = await allQuery(`SELECT * FROM alerts ORDER BY risk_score DESC`);
    const resources = await allQuery(`SELECT * FROM resources`);

    let summary = { recommendations: [] };
    if (latestScan && latestScan.summary_json) {
      try {
        summary = JSON.parse(latestScan.summary_json);
      } catch (e) {}
    }

    res.json({
      reportTitle: 'Cloud Security Monitoring Report',
      scanTimestamp: latestScan ? latestScan.timestamp : new Date().toISOString(),
      securityScore: latestScan ? latestScan.score : 68,
      riskLevel: latestScan ? latestScan.risk_level : 'HIGH',
      isLive: latestScan ? !!latestScan.is_live : false,
      findingsBreakdown: {
        critical: latestScan ? latestScan.critical_count : alerts.filter(a => a.severity === 'CRITICAL').length,
        high: latestScan ? latestScan.high_count : alerts.filter(a => a.severity === 'HIGH').length,
        medium: latestScan ? latestScan.medium_count : alerts.filter(a => a.severity === 'MEDIUM').length,
        low: latestScan ? latestScan.low_count : alerts.filter(a => a.severity === 'LOW').length,
        total: alerts.length
      },
      resourcesSummary: {
        total: resources.length,
        healthy: resources.filter(r => r.status === 'Healthy').length,
        warning: resources.filter(r => r.status === 'Warning').length,
        critical: resources.filter(r => r.status === 'Critical').length
      },
      recommendations: summary.recommendations || [
        'Enable S3 Block Public Access on bucket "production-data-vault-2026"',
        'Rotate IAM access key for user "dev-admin-user" (age > 90 days)',
        'Enforce MFA requirement for all IAM user logins',
        'Modify Security Group sg-0a8b9c12345 to restrict port 22 access'
      ],
      findingsList: alerts,
      history: scanHistory
    });
  } catch (err) {
    console.error('Error fetching reports API:', err);
    res.status(500).json({ error: 'Failed to generate security report' });
  }
});

// POST /api/security-scan
router.post('/security-scan', async (req, res) => {
  try {
    const scanResult = await runFullSecurityScan();
    res.json({
      message: 'Security scan completed successfully',
      scan: scanResult
    });
  } catch (err) {
    console.error('Error running security scan:', err);
    res.status(500).json({ error: 'Failed to run security scan' });
  }
});

// GET /api/security-score
router.get('/security-score', async (req, res) => {
  try {
    const latestScan = await getQuery(`SELECT * FROM scans ORDER BY id DESC LIMIT 1`);
    res.json({
      securityScore: latestScan ? latestScan.score : 68,
      riskLevel: latestScan ? latestScan.risk_level : 'HIGH',
      timestamp: latestScan ? latestScan.timestamp : new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch security score' });
  }
});

module.exports = router;
