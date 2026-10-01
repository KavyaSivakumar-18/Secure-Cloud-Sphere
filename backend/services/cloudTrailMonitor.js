const {
  CloudTrailClient,
  LookupEventsCommand,
  DescribeTrailsCommand
} = require('@aws-sdk/client-cloudtrail');
const { calculateEventRisk } = require('../utils/riskCalculator');

function getCloudTrailClient() {
  const region = process.env.AWS_REGION || 'ap-south-1';
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  if (!accessKeyId || !secretAccessKey || accessKeyId === 'YOUR_ACCESS_KEY' || accessKeyId.trim() === '') {
    return null;
  }

  return new CloudTrailClient({
    region,
    credentials: {
      accessKeyId: accessKeyId.trim(),
      secretAccessKey: secretAccessKey.trim()
    }
  });
}

async function getCloudTrailEvents(limit = 20) {
  const client = getCloudTrailClient();

  if (!client) {
    return getDemoCloudTrailEvents('AWS Credentials not configured in .env. Displaying sample events in DEMO MODE.');
  }

  try {
    const command = new LookupEventsCommand({ MaxResults: limit });
    const response = await client.send(command);
    const rawEvents = response.Events || [];

    const formattedEvents = rawEvents.map(e => {
      let detailObj = {};
      try {
        if (e.CloudTrailEvent) {
          detailObj = JSON.parse(e.CloudTrailEvent);
        }
      } catch (err) {}

      const eventName = e.EventName || 'UnknownEvent';
      const username = e.Username || (detailObj.userIdentity && detailObj.userIdentity.userName) || 'Root/System';
      const service = (e.EventSource || '').replace('.amazonaws.com', '').toUpperCase() || 'AWS';
      const sourceIp = detailObj.sourceIPAddress || 'N/A';
      const region = detailObj.awsRegion || process.env.AWS_REGION || 'ap-south-1';
      const resource = (e.Resources && e.Resources[0]) ? e.Resources[0].ResourceName : (detailObj.eventSource || 'CloudResource');
      const timestamp = e.EventTime ? new Date(e.EventTime).toISOString() : new Date().toISOString();

      const riskInfo = calculateEventRisk({
        event_name: eventName,
        details: detailObj.errorMessage || JSON.stringify(detailObj),
        username,
        service
      });

      return {
        id: e.EventId || 'CT-' + Math.floor(Math.random() * 100000),
        timestamp,
        event_name: eventName,
        username,
        service,
        source_ip: sourceIp,
        region,
        resource,
        severity: riskInfo.severity,
        risk_score: riskInfo.riskScore,
        event_type: riskInfo.eventType,
        details: detailObj.errorMessage ? `Error: ${detailObj.errorMessage}` : `Executed ${eventName} on ${resource}`,
        is_live: true
      };
    });

    // Check Trail Status
    let trailActive = true;
    try {
      const trailsRes = await client.send(new DescribeTrailsCommand({}));
      trailActive = (trailsRes.trailList || []).length > 0;
    } catch (e) {
      console.warn('DescribeTrails permission issue:', e.message);
    }

    return {
      isLive: true,
      trailActive,
      eventsCount: formattedEvents.length,
      events: formattedEvents,
      status: 'Connected',
      lastChecked: new Date().toISOString()
    };
  } catch (err) {
    console.error('AWS CloudTrail SDK Error:', err.name || err.message);
    return getDemoCloudTrailEvents(`AWS CloudTrail Error (${err.name || 'Error'}): ${err.message}. Falling back to DEMO MODE.`);
  }
}

function getDemoCloudTrailEvents(reason = 'Demo mode active') {
  const events = [
    {
      id: 'EVT-5001',
      timestamp: new Date(Date.now() - 5 * 60000).toISOString(),
      event_name: 'PutBucketPolicy',
      username: 'root-admin',
      service: 'S3',
      source_ip: '203.0.113.45',
      region: 'ap-south-1',
      resource: 'production-data-vault-2026',
      severity: 'CRITICAL',
      risk_score: 90,
      event_type: 'Security Configuration',
      details: 'Modified S3 bucket policy allowing public read permission',
      is_live: false
    },
    {
      id: 'EVT-5002',
      timestamp: new Date(Date.now() - 25 * 60000).toISOString(),
      event_name: 'CreateAccessKey',
      username: 'dev-admin-user',
      service: 'IAM',
      source_ip: '198.51.100.12',
      region: 'us-east-1',
      resource: 'User: dev-admin-user',
      severity: 'HIGH',
      risk_score: 75,
      event_type: 'Identity & Access',
      details: 'Created new long-lived IAM access key without rotation schedule',
      is_live: false
    },
    {
      id: 'EVT-5003',
      timestamp: new Date(Date.now() - 60 * 60000).toISOString(),
      event_name: 'ConsoleLoginFailed',
      username: 'unknown-user',
      service: 'IAM',
      source_ip: '185.220.101.5',
      region: 'global',
      resource: 'AWS Management Console',
      severity: 'HIGH',
      risk_score: 80,
      event_type: 'Authentication Failure',
      details: 'Failed console login attempt detected from unauthorized IP address',
      is_live: false
    },
    {
      id: 'EVT-5004',
      timestamp: new Date(Date.now() - 110 * 60000).toISOString(),
      event_name: 'AuthorizeSecurityGroupIngress',
      username: 'devops-lead',
      service: 'EC2',
      source_ip: '203.0.113.88',
      region: 'ap-south-1',
      resource: 'sg-0a8b9c12345',
      severity: 'CRITICAL',
      risk_score: 85,
      event_type: 'Network Security',
      details: 'Opened inbound TCP Port 22 to 0.0.0.0/0',
      is_live: false
    },
    {
      id: 'EVT-5005',
      timestamp: new Date(Date.now() - 180 * 60000).toISOString(),
      event_name: 'GetObject',
      username: 'app-service-role',
      service: 'S3',
      source_ip: '10.0.1.104',
      region: 'ap-south-1',
      resource: 'app-assets-bucket/index.html',
      severity: 'LOW',
      risk_score: 10,
      event_type: 'Data Access',
      details: 'Standard object read operation',
      is_live: false
    },
    {
      id: 'EVT-5006',
      timestamp: new Date(Date.now() - 300 * 60000).toISOString(),
      event_name: 'StopLogging',
      username: 'sec-analyst',
      service: 'CloudTrail',
      source_ip: '198.51.100.99',
      region: 'ap-south-1',
      resource: 'trail/audit-trail-primary',
      severity: 'CRITICAL',
      risk_score: 95,
      event_type: 'Audit Configuration',
      details: 'CloudTrail audit recording was temporarily suspended',
      is_live: false
    }
  ];

  return {
    isLive: false,
    reason,
    trailActive: true,
    eventsCount: events.length,
    events,
    status: 'Demo Mode',
    lastChecked: new Date().toISOString()
  };
}

module.exports = {
  getCloudTrailEvents
};
