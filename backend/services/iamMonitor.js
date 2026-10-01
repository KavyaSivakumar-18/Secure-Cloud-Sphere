const {
  IAMClient,
  ListUsersCommand,
  ListAccessKeysCommand,
  ListMFADevicesCommand,
  GetAccountSummaryCommand,
  ListUserPoliciesCommand,
  ListAttachedUserPoliciesCommand
} = require('@aws-sdk/client-iam');

function getIAMClient() {
  const region = 'us-east-1'; // IAM is global, SDK requires us-east-1 endpoint
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  if (!accessKeyId || !secretAccessKey || accessKeyId === 'YOUR_ACCESS_KEY' || accessKeyId.trim() === '') {
    return null;
  }

  return new IAMClient({
    region,
    credentials: {
      accessKeyId: accessKeyId.trim(),
      secretAccessKey: secretAccessKey.trim()
    }
  });
}

async function checkIAMSecurity() {
  const client = getIAMClient();

  if (!client) {
    return getDemoIAMStatus('AWS Credentials not configured in .env. Running in DEMO MODE.');
  }

  try {
    const usersRes = await client.send(new ListUsersCommand({}));
    const users = usersRes.Users || [];

    let usersWithoutMFA = 0;
    let staleKeyCount = 0;
    let excessivePermissionUsers = 0;
    const userDetails = [];
    const findings = [];

    const NOW = new Date();
    const MAX_KEY_AGE_DAYS = 90;

    for (const user of users) {
      const username = user.UserName;
      let hasMFA = false;
      let oldestKeyAgeDays = 0;
      let hasAdminPolicy = false;

      // Check MFA
      try {
        const mfaRes = await client.send(new ListMFADevicesCommand({ UserName: username }));
        hasMFA = (mfaRes.MFADevices || []).length > 0;
      } catch (e) {
        console.warn(`IAM ListMFADevices warning for ${username}:`, e.message);
      }

      if (!hasMFA) {
        usersWithoutMFA++;
        findings.push({
          severity: 'MEDIUM',
          riskScore: 70,
          title: 'IAM User MFA Disabled',
          description: `User '${username}' does not have Multi-Factor Authentication (MFA) enabled.`
        });
      }

      // Check Access Keys
      try {
        const keysRes = await client.send(new ListAccessKeysCommand({ UserName: username }));
        const keys = keysRes.AccessKeyMetadata || [];
        for (const key of keys) {
          const createDate = new Date(key.CreateDate);
          const ageDays = Math.floor((NOW - createDate) / (1000 * 60 * 60 * 24));
          if (ageDays > oldestKeyAgeDays) oldestKeyAgeDays = ageDays;

          if (ageDays > MAX_KEY_AGE_DAYS && key.Status === 'Active') {
            staleKeyCount++;
            findings.push({
              severity: 'HIGH',
              riskScore: 75,
              title: 'Stale IAM Access Key',
              description: `User '${username}' has an active access key (${key.AccessKeyId}) that is ${ageDays} days old (> ${MAX_KEY_AGE_DAYS} days).`
            });
          }
        }
      } catch (e) {
        console.warn(`IAM ListAccessKeys warning for ${username}:`, e.message);
      }

      // Check Attached Admin Policies
      try {
        const attachedRes = await client.send(new ListAttachedUserPoliciesCommand({ UserName: username }));
        const attached = attachedRes.AttachedPolicies || [];
        if (attached.some(p => p.PolicyName.includes('AdministratorAccess') || p.PolicyName.includes('*'))) {
          hasAdminPolicy = true;
          excessivePermissionUsers++;
          findings.push({
            severity: 'HIGH',
            riskScore: 80,
            title: 'Excessive IAM Permissions',
            description: `User '${username}' has full AdministratorAccess attached directly.`
          });
        }
      } catch (e) {
        console.warn(`IAM ListAttachedUserPolicies warning for ${username}:`, e.message);
      }

      userDetails.push({
        username,
        createDate: user.CreateDate,
        hasMFA,
        oldestKeyAgeDays,
        hasAdminPolicy
      });
    }

    // Check Account Summary if accessible
    let rootMfaPresent = true;
    try {
      const summaryRes = await client.send(new GetAccountSummaryCommand({}));
      const summary = summaryRes.SummaryMap || {};
      rootMfaPresent = summary['AccountMFAEnabled'] === 1;
      if (!rootMfaPresent) {
        findings.push({
          severity: 'CRITICAL',
          riskScore: 95,
          title: 'Root Account MFA Disabled',
          description: 'AWS Root Account does not have Multi-Factor Authentication (MFA) enabled.'
        });
      }
    } catch (e) {
      console.warn('IAM GetAccountSummary not accessible:', e.message);
    }

    return {
      isLive: true,
      totalUsers: users.length,
      usersWithoutMFA,
      staleKeyCount,
      excessivePermissionUsers,
      rootMfaPresent,
      users: userDetails,
      findings,
      status: findings.some(f => f.severity === 'CRITICAL') ? 'Critical' : (findings.some(f => f.severity === 'HIGH') ? 'Warning' : 'Healthy'),
      lastChecked: new Date().toISOString()
    };

  } catch (err) {
    console.error('AWS IAM SDK Error:', err.name || err.message);
    return getDemoIAMStatus(`AWS IAM Error (${err.name || 'Error'}): ${err.message}. Falling back to DEMO MODE.`);
  }
}

function getDemoIAMStatus(reason = 'Demo mode active') {
  return {
    isLive: false,
    reason,
    totalUsers: 5,
    usersWithoutMFA: 2,
    staleKeyCount: 1,
    excessivePermissionUsers: 1,
    rootMfaPresent: true,
    users: [
      { username: 'root-admin', createDate: '2025-01-10T10:00:00Z', hasMFA: true, oldestKeyAgeDays: 45, hasAdminPolicy: true },
      { username: 'dev-admin-user', createDate: '2025-05-14T08:30:00Z', hasMFA: true, oldestKeyAgeDays: 142, hasAdminPolicy: true },
      { username: 'temp-contractor', createDate: '2026-02-01T12:00:00Z', hasMFA: false, oldestKeyAgeDays: 30, hasAdminPolicy: false },
      { username: 'audit-read-only', createDate: '2025-11-20T14:15:00Z', hasMFA: true, oldestKeyAgeDays: 60, hasAdminPolicy: false },
      { username: 'ci-cd-deployer', createDate: '2026-01-05T09:00:00Z', hasMFA: false, oldestKeyAgeDays: 22, hasAdminPolicy: false }
    ],
    findings: [
      {
        severity: 'HIGH',
        riskScore: 75,
        title: 'Stale IAM Access Key Detected',
        description: 'User dev-admin-user active key is 142 days old (> 90 day security policy threshold).'
      },
      {
        severity: 'HIGH',
        riskScore: 80,
        title: 'Excessive IAM Permissions',
        description: 'User dev-admin-user has AdministratorAccess policy attached directly.'
      },
      {
        severity: 'MEDIUM',
        riskScore: 70,
        title: 'IAM Users Without MFA',
        description: '2 active IAM users (temp-contractor, ci-cd-deployer) do not have MFA enforced.'
      }
    ],
    status: 'Warning',
    lastChecked: new Date().toISOString()
  };
}

module.exports = {
  checkIAMSecurity
};
