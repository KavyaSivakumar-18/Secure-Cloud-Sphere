const express = require('express');
const router = express.Router();
const { allQuery } = require('../database/database');

// GET /api/events
router.get('/events', async (req, res) => {
  try {
    const { search, severity, service, startDate, endDate } = req.query;
    let sql = `SELECT * FROM events WHERE 1=1`;
    const params = [];

    if (severity && severity !== 'ALL') {
      sql += ` AND severity = ?`;
      params.push(severity);
    }
    if (service && service !== 'ALL') {
      sql += ` AND service = ?`;
      params.push(service);
    }
    if (startDate) {
      sql += ` AND timestamp >= ?`;
      params.push(startDate);
    }
    if (endDate) {
      sql += ` AND timestamp <= ?`;
      params.push(endDate);
    }
    if (search) {
      sql += ` AND (event_name LIKE ? OR username LIKE ? OR resource LIKE ? OR details LIKE ? OR source_ip LIKE ?)`;
      const term = `%${search}%`;
      params.push(term, term, term, term, term);
    }

    sql += ` ORDER BY timestamp DESC`;

    const events = await allQuery(sql, params);
    res.json({
      total: events.length,
      events
    });
  } catch (err) {
    console.error('Error fetching event logs:', err);
    res.status(500).json({ error: 'Failed to fetch event logs' });
  }
});

module.exports = router;
