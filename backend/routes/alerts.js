const express = require('express');
const router = express.Router();
const { allQuery, getQuery, runQuery } = require('../database/database');

// GET /api/alerts
router.get('/alerts', async (req, res) => {
  try {
    const { status, severity, service } = req.query;
    let sql = `SELECT * FROM alerts WHERE 1=1`;
    const params = [];

    if (status && status !== 'ALL') {
      sql += ` AND status = ?`;
      params.push(status);
    }
    if (severity && severity !== 'ALL') {
      sql += ` AND severity = ?`;
      params.push(severity);
    }
    if (service && service !== 'ALL') {
      sql += ` AND service = ?`;
      params.push(service);
    }

    sql += ` ORDER BY timestamp DESC`;

    const alerts = await allQuery(sql, params);
    
    // Calculate summary statistics
    const stats = {
      total: alerts.length,
      critical: alerts.filter(a => a.severity === 'CRITICAL').length,
      high: alerts.filter(a => a.severity === 'HIGH').length,
      medium: alerts.filter(a => a.severity === 'MEDIUM').length,
      low: alerts.filter(a => a.severity === 'LOW').length,
      open: alerts.filter(a => a.status === 'Open').length,
      investigating: alerts.filter(a => a.status === 'Investigating').length,
      resolved: alerts.filter(a => a.status === 'Resolved').length
    };

    res.json({ stats, alerts });
  } catch (err) {
    console.error('Error fetching alerts:', err);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

// PUT /api/alerts/:id/status
router.put('/alerts/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['Open', 'Investigating', 'Resolved'].includes(status)) {
      return res.status(400).json({ error: 'Invalid alert status. Must be Open, Investigating, or Resolved.' });
    }

    const existing = await getQuery(`SELECT * FROM alerts WHERE id = ?`, [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    await runQuery(`UPDATE alerts SET status = ? WHERE id = ?`, [status, id]);
    const updated = await getQuery(`SELECT * FROM alerts WHERE id = ?`, [id]);

    res.json({
      message: `Alert ${id} status updated to ${status}`,
      alert: updated
    });
  } catch (err) {
    console.error('Error updating alert status:', err);
    res.status(500).json({ error: 'Failed to update alert status' });
  }
});

module.exports = router;
