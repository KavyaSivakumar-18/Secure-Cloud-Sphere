/**
 * Risk Calculator and Security Detection Utility
 */

function calculateEventRisk(event) {
  const name = (event.event_name || '').toLowerCase();
  const details = (event.details || '').toLowerCase();
  const service = (event.service || '').toLowerCase();

  // Rule 1: S3 bucket public access changes or policy updates allowing public
  if (name.includes('putbucketpolicy') || name.includes('deletebucketpublicaccessblock') || details.includes('public')) {
    return { severity: 'CRITICAL', riskScore: 90, eventType: 'S3 Public Exposure' };
  }

  // Rule 2: Root account login or usage
  if (name.includes('root') || (event.username && event.username.toLowerCase() === 'root')) {
    return { severity: 'CRITICAL', riskScore: 95, eventType: 'Root Account Usage' };
  }

  // Rule 3: Security group opened to 0.0.0.0/0 on sensitive ports
  if (name.includes('authorizesecuritygroupingress') && (details.includes('22') || details.includes('3389') || details.includes('0.0.0.0/0'))) {
    return { severity: 'CRITICAL', riskScore: 90, eventType: 'Network Exposure' };
  }

  // Rule 4: Stop logging in CloudTrail
  if (name.includes('stoplogging') || name.includes('deletetrail')) {
    return { severity: 'CRITICAL', riskScore: 95, eventType: 'Audit Logging Disabled' };
  }

  // Rule 5: Access key creation or stale access key
  if (name.includes('createaccesskey') || details.includes('access key')) {
    return { severity: 'HIGH', riskScore: 75, eventType: 'IAM Credential Change' };
  }

  // Rule 6: Console login failure
  if (name.includes('loginfailed') || name.includes('failedlogin') || details.includes('failed login')) {
    return { severity: 'HIGH', riskScore: 80, eventType: 'Failed Authentication' };
  }

  // Rule 7: User without MFA
  if (details.includes('mfa') || name.includes('mfa')) {
    return { severity: 'HIGH', riskScore: 70, eventType: 'MFA Missing' };
  }

  // Rule 8: IAM Policy / Privilege changes
  if (name.includes('attachuserpolicy') || name.includes('putuserpolicy') || name.includes('attachrolepolicy')) {
    return { severity: 'HIGH', riskScore: 80, eventType: 'IAM Permission Escalation' };
  }

  // Rule 9: CloudTrail configuration update
  if (name.includes('updatetrail')) {
    return { severity: 'MEDIUM', riskScore: 50, eventType: 'Audit Configuration Change' };
  }

  // Rule 10: S3 Encryption missing
  if (details.includes('unencrypted') || details.includes('no encryption')) {
    return { severity: 'HIGH', riskScore: 75, eventType: 'Unencrypted Storage' };
  }

  // Standard LOW risk events (e.g., GetObject, ListBuckets, normal activity)
  return { severity: 'LOW', riskScore: 10, eventType: 'Standard Operation' };
}

function calculateOverallSecurityScore(findings = []) {
  // Start at 100 (Perfect Security)
  let baseScore = 100;
  let criticalCount = 0;
  let highCount = 0;
  let mediumCount = 0;
  let lowCount = 0;

  for (const item of findings) {
    const sev = (item.severity || 'LOW').toUpperCase();
    if (sev === 'CRITICAL') {
      baseScore -= 25;
      criticalCount++;
    } else if (sev === 'HIGH') {
      baseScore -= 15;
      highCount++;
    } else if (sev === 'MEDIUM') {
      baseScore -= 8;
      mediumCount++;
    } else if (sev === 'LOW') {
      baseScore -= 2;
      lowCount++;
    }
  }

  const finalScore = Math.max(0, Math.min(100, baseScore));
  let riskLevel = 'LOW';

  if (finalScore <= 25 || criticalCount > 0) {
    riskLevel = 'CRITICAL';
  } else if (finalScore <= 50 || highCount >= 2) {
    riskLevel = 'HIGH';
  } else if (finalScore <= 75 || mediumCount >= 3) {
    riskLevel = 'MEDIUM';
  } else {
    riskLevel = 'LOW';
  }

  return {
    score: finalScore,
    riskLevel,
    counts: {
      critical: criticalCount,
      high: highCount,
      medium: mediumCount,
      low: lowCount,
      total: findings.length
    }
  };
}

module.exports = {
  calculateEventRisk,
  calculateOverallSecurityScore
};
