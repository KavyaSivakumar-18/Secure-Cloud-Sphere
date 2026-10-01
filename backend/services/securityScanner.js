const { checkS3Security } = require('./s3Monitor');
const { checkIAMSecurity } = require('./iamMonitor');
const { getCloudTrailEvents } = require('./cloudTrailMonitor');
const { checkCloudWatchSecurity } = require('./cloudWatchMonitor');
const { calculateOverallSecurityScore } = require('../utils/riskCalculator');
const { runQuery, allQuery } = require('../database/database');

async function runFullSecurityScan() {
  console.log('Initiating Full Cloud Security Scan...');

  // Step 1: Check S3
  const s3Data = await checkS3Security();

  // Step 2: Check IAM
  const iamData = await checkIAMSecurity();

  // Step 3: Check CloudTrail
  const trailData = await getCloudTrailEvents(25);

  // Step 4: Check CloudWatch
  const watchData = await checkCloudWatchSecurity();

  // Aggregate Findings
  const allFindings = [
    ...(s3Data.findings || []),
    ...(iamData.findings || []),
    ...(watchData.findings || [])
  ];

  // Determine overall mode (isLive if any major service is live)
  const isLive = s3Data.isLive || iamData.isLive || trailData.isLive || watchData.isLive;

  // Step 6: Calculate Security Score
  const scoreResult = calculateOverallSecurityScore(allFindings);

  // Step 7: Generate Alerts & Save to DB
  const generatedAlerts = [];
  for (const finding of allFindings) {
    if (finding.severity !== 'LOW') {
      const alertId = 'ALT-' + Math.floor(1000 + Math.random() * 9000);
      const newAlert = {
        id: alertId,
        timestamp: new Date().toISOString(),
        service: finding.title.includes('S3') ? 'S3' : (finding.title.includes('IAM') ? 'IAM' : (finding.title.includes('CloudWatch') ? 'CloudWatch' : 'AWS')),
        resource: finding.title,
        description: finding.description,
        severity: finding.severity,
        risk_score: finding.riskScore,
        status: 'Open',
        action: finding.severity === 'CRITICAL' ? 'Immediate Remediation Required' : 'Review Configuration Policy',
        is_live: isLive ? 1 : 0
      };

      generatedAlerts.push(newAlert);

      // Insert or update in SQLite database
      try {
        await runQuery(
          `INSERT OR REPLACE INTO alerts (id, timestamp, service, resource, description, severity, risk_score, status, action, is_live)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            newAlert.id,
            newAlert.timestamp,
            newAlert.service,
            newAlert.resource,
            newAlert.description,
            newAlert.severity,
            newAlert.risk_score,
            newAlert.status,
            newAlert.action,
            newAlert.is_live
          ]
        );
      } catch (err) {
        console.error('Error inserting alert to DB:', err.message);
      }
    }
  }

  // Update Resources table in DB
  const resourcesList = [
    {
      id: 'res-s3-' + (s3Data.bucketName || 'default'),
      name: s3Data.bucketName || 'S3 Service',
      type: 'S3',
      region: s3Data.region || 'ap-south-1',
      status: s3Data.status,
      security_status: s3Data.publicAccessBlockEnabled ? 'Private / Encrypted' : 'Public Access Allowed',
      last_checked: new Date().toISOString(),
      details: JSON.stringify(s3Data),
      is_live: s3Data.isLive ? 1 : 0
    },
    {
      id: 'res-iam-account',
      name: 'IAM Account Roles & Keys',
      type: 'IAM',
      region: 'global',
      status: iamData.status,
      security_status: `${iamData.usersWithoutMFA} Users without MFA / ${iamData.staleKeyCount} Stale Keys`,
      last_checked: new Date().toISOString(),
      details: JSON.stringify(iamData),
      is_live: iamData.isLive ? 1 : 0
    },
    {
      id: 'res-ct-trail',
      name: 'CloudTrail Logging Service',
      type: 'CloudTrail',
      region: process.env.AWS_REGION || 'ap-south-1',
      status: trailData.trailActive ? 'Healthy' : 'Warning',
      security_status: trailData.trailActive ? 'Active Audit Logging' : 'Logging Inactive',
      last_checked: new Date().toISOString(),
      details: JSON.stringify({ count: trailData.eventsCount }),
      is_live: trailData.isLive ? 1 : 0
    },
    {
      id: 'res-cw-metrics',
      name: 'CloudWatch Alarms & Metrics',
      type: 'CloudWatch',
      region: process.env.AWS_REGION || 'ap-south-1',
      status: watchData.status,
      security_status: `${watchData.alarmsCount} Alarms Configured`,
      last_checked: new Date().toISOString(),
      details: JSON.stringify(watchData.alarmState),
      is_live: watchData.isLive ? 1 : 0
    }
  ];

  for (const res of resourcesList) {
    try {
      await runQuery(
        `INSERT OR REPLACE INTO resources (id, name, type, region, status, security_status, last_checked, details, is_live)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [res.id, res.name, res.type, res.region, res.status, res.security_status, res.last_checked, res.details, res.is_live]
      );
    } catch (err) {
      console.error('Error inserting resource to DB:', err.message);
    }
  }

  // Store Scan Summary Record
  const scanRecommendations = [];
  if (s3Data.findings && s3Data.findings.some(f => f.severity === 'CRITICAL')) {
    scanRecommendations.push('Enable S3 Block Public Access across all production buckets.');
  }
  if (iamData.staleKeyCount > 0) {
    scanRecommendations.push('Rotate IAM Access Keys older than 90 days.');
  }
  if (iamData.usersWithoutMFA > 0) {
    scanRecommendations.push('Enforce Multi-Factor Authentication (MFA) for all IAM users.');
  }
  if (scanRecommendations.length === 0) {
    scanRecommendations.push('Maintain regular cloud audit reviews and security scans.');
  }

  try {
    await runQuery(
      `INSERT INTO scans (score, risk_level, critical_count, high_count, medium_count, low_count, total_resources, total_events, is_live, summary_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        scoreResult.score,
        scoreResult.riskLevel,
        scoreResult.counts.critical,
        scoreResult.counts.high,
        scoreResult.counts.medium,
        scoreResult.counts.low,
        resourcesList.length,
        trailData.eventsCount || 0,
        isLive ? 1 : 0,
        JSON.stringify({ recommendations: scanRecommendations, findings: allFindings })
      ]
    );
  } catch (err) {
    console.error('Error storing scan record:', err.message);
  }

  return {
    scanCompleted: new Date().toISOString(),
    isLive,
    securityScore: scoreResult.score,
    riskLevel: scoreResult.riskLevel,
    counts: scoreResult.counts,
    recommendations: scanRecommendations,
    s3: s3Data,
    iam: iamData,
    cloudTrail: trailData,
    cloudWatch: watchData,
    generatedAlerts
  };
}

module.exports = {
  runFullSecurityScan
};
