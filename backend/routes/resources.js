const express = require('express');
const router = express.Router();
const { allQuery } = require('../database/database');
const { checkS3Security } = require('../services/s3Monitor');
const { checkIAMSecurity } = require('../services/iamMonitor');
const { getCloudTrailEvents } = require('../services/cloudTrailMonitor');
const { checkCloudWatchSecurity } = require('../services/cloudWatchMonitor');

// GET /api/resources
router.get('/resources', async (req, res) => {
  try {
    const resources = await allQuery(`SELECT * FROM resources ORDER BY type ASC`);
    res.json({
      count: resources.length,
      resources: resources.map(r => ({
        ...r,
        details: r.details ? JSON.parse(r.details) : {}
      }))
    });
  } catch (err) {
    console.error('Error fetching resources:', err);
    res.status(500).json({ error: 'Failed to fetch resources' });
  }
});

// GET /api/s3/status
router.get('/s3/status', async (req, res) => {
  try {
    const status = await checkS3Security();
    res.json(status);
  } catch (err) {
    res.status(500).json({ error: 'Failed to check S3 status' });
  }
});

// GET /api/iam/status
router.get('/iam/status', async (req, res) => {
  try {
    const status = await checkIAMSecurity();
    res.json(status);
  } catch (err) {
    res.status(500).json({ error: 'Failed to check IAM status' });
  }
});

// GET /api/cloudtrail/events
router.get('/cloudtrail/events', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 25;
    const eventsData = await getCloudTrailEvents(limit);
    res.json(eventsData);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch CloudTrail events' });
  }
});

// GET /api/cloudwatch/status
router.get('/cloudwatch/status', async (req, res) => {
  try {
    const status = await checkCloudWatchSecurity();
    res.json(status);
  } catch (err) {
    res.status(500).json({ error: 'Failed to check CloudWatch status' });
  }
});

module.exports = router;
