const {
  CloudWatchClient,
  DescribeAlarmsCommand,
  ListMetricsCommand
} = require('@aws-sdk/client-cloudwatch');

function getCloudWatchClient() {
  const region = process.env.AWS_REGION || 'ap-south-1';
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  if (!accessKeyId || !secretAccessKey || accessKeyId === 'YOUR_ACCESS_KEY' || accessKeyId.trim() === '') {
    return null;
  }

  return new CloudWatchClient({
    region,
    credentials: {
      accessKeyId: accessKeyId.trim(),
      secretAccessKey: secretAccessKey.trim()
    }
  });
}

async function checkCloudWatchSecurity() {
  const client = getCloudWatchClient();

  if (!client) {
    return getDemoCloudWatchStatus('AWS Credentials not configured in .env. Running in DEMO MODE.');
  }

  try {
    const alarmRes = await client.send(new DescribeAlarmsCommand({}));
    const alarms = alarmRes.MetricAlarms || [];

    const alarmSummary = {
      total: alarms.length,
      ok: alarms.filter(a => a.StateValue === 'OK').length,
      inAlarm: alarms.filter(a => a.StateValue === 'ALARM').length,
      insufficientData: alarms.filter(a => a.StateValue === 'INSUFFICIENT_DATA').length
    };

    let metricsCount = 0;
    try {
      const metricRes = await client.send(new ListMetricsCommand({ Namespace: 'AWS/EC2' }));
      metricsCount = (metricRes.Metrics || []).length;
    } catch (e) {
      console.warn('ListMetrics warning:', e.message);
    }

    const findings = [];
    if (alarmSummary.inAlarm > 0) {
      findings.push({
        severity: 'HIGH',
        riskScore: 75,
        title: 'CloudWatch Metric Alarms Triggered',
        description: `${alarmSummary.inAlarm} CloudWatch alarms are currently in ALARM state.`
      });
    }

    if (alarmSummary.total === 0) {
      findings.push({
        severity: 'MEDIUM',
        riskScore: 40,
        title: 'No CloudWatch Alarms Configured',
        description: 'No active metric alarms detected for resource health monitoring.'
      });
    }

    return {
      isLive: true,
      alarmsCount: alarmSummary.total,
      alarmState: alarmSummary,
      availableMetricsCount: metricsCount,
      findings,
      status: alarmSummary.inAlarm > 0 ? 'Warning' : 'Healthy',
      lastChecked: new Date().toISOString()
    };
  } catch (err) {
    console.error('AWS CloudWatch SDK Error:', err.name || err.message);
    return getDemoCloudWatchStatus(`AWS CloudWatch Error (${err.name || 'Error'}): ${err.message}. Falling back to DEMO MODE.`);
  }
}

function getDemoCloudWatchStatus(reason = 'Demo mode active') {
  return {
    isLive: false,
    reason,
    alarmsCount: 4,
    alarmState: {
      total: 4,
      ok: 4,
      inAlarm: 0,
      insufficientData: 0
    },
    availableMetricsCount: 18,
    metrics: [
      { name: 'CPUUtilization', namespace: 'AWS/EC2', value: '14.2%' },
      { name: 'NetworkIn', namespace: 'AWS/EC2', value: '45.8 MB/s' },
      { name: 'NetworkOut', namespace: 'AWS/EC2', value: '12.4 MB/s' },
      { name: 'BucketSizeBytes', namespace: 'AWS/S3', value: '462.62 MB' }
    ],
    findings: [
      {
        severity: 'LOW',
        riskScore: 10,
        title: 'CloudWatch Monitoring Active',
        description: 'All 4 EC2 & S3 metric alarms are in OK status.'
      }
    ],
    status: 'Healthy',
    lastChecked: new Date().toISOString()
  };
}

module.exports = {
  checkCloudWatchSecurity
};
