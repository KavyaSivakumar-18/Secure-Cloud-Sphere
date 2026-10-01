const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const dbDir = path.join(__dirname);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'cloud_security.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening SQLite database:', err.message);
  } else {
    console.log('Connected to SQLite database at:', dbPath);
  }
});

// Helper function to run SQL queries as promises
const runQuery = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
};

const getQuery = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

const allQuery = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

async function initDatabase() {
  await runQuery(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'admin',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await runQuery(`
    CREATE TABLE IF NOT EXISTS alerts (
      id TEXT PRIMARY KEY,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      service TEXT NOT NULL,
      resource TEXT NOT NULL,
      description TEXT NOT NULL,
      severity TEXT NOT NULL,
      risk_score INTEGER NOT NULL,
      status TEXT DEFAULT 'Open',
      action TEXT DEFAULT 'Review Configuration',
      is_live INTEGER DEFAULT 0
    )
  `);

  await runQuery(`
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      event_name TEXT NOT NULL,
      username TEXT DEFAULT 'unknown',
      service TEXT NOT NULL,
      source_ip TEXT DEFAULT 'N/A',
      region TEXT DEFAULT 'ap-south-1',
      resource TEXT NOT NULL,
      severity TEXT DEFAULT 'LOW',
      risk_score INTEGER DEFAULT 10,
      event_type TEXT DEFAULT 'System',
      details TEXT,
      is_live INTEGER DEFAULT 0
    )
  `);

  await runQuery(`
    CREATE TABLE IF NOT EXISTS scans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      score INTEGER NOT NULL,
      risk_level TEXT NOT NULL,
      critical_count INTEGER DEFAULT 0,
      high_count INTEGER DEFAULT 0,
      medium_count INTEGER DEFAULT 0,
      low_count INTEGER DEFAULT 0,
      total_resources INTEGER DEFAULT 0,
      total_events INTEGER DEFAULT 0,
      is_live INTEGER DEFAULT 0,
      summary_json TEXT
    )
  `);

  await runQuery(`
    CREATE TABLE IF NOT EXISTS resources (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      region TEXT DEFAULT 'ap-south-1',
      status TEXT DEFAULT 'Healthy',
      security_status TEXT DEFAULT 'Secure',
      last_checked DATETIME DEFAULT CURRENT_TIMESTAMP,
      details TEXT,
      is_live INTEGER DEFAULT 0
    )
  `);

  await runQuery(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    )
  `);

  // Seed default admin user if not exists
  const defaultAdmin = await getQuery(`SELECT * FROM users WHERE username = ?`, ['admin']);
  if (!defaultAdmin) {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('admin123', salt);
    await runQuery(
      `INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)`,
      ['admin', hash, 'admin']
    );
    console.log('Default admin user created: admin / admin123');
  }

  // Seed initial demo data if database is empty
  const alertCount = await getQuery(`SELECT COUNT(*) as count FROM alerts`);
  if (alertCount.count === 0) {
    await seedDemoData();
  }
}

async function seedDemoData() {
  console.log('Seeding initial security database records...');
  
  const initialAlerts = [
    {
      id: 'ALT-1001',
      timestamp: new Date(Date.now() - 15 * 60000).toISOString(),
      service: 'S3',
      resource: 'production-data-vault-2026',
      description: 'S3 Bucket Public Access Block disabled or public policy detected.',
      severity: 'CRITICAL',
      risk_score: 95,
      status: 'Open',
      action: 'Enable S3 Block Public Access immediately',
      is_live: 0
    },
    {
      id: 'ALT-1002',
      timestamp: new Date(Date.now() - 45 * 60000).toISOString(),
      service: 'IAM',
      resource: 'User: dev-admin-user',
      description: 'IAM User active access key age exceeds 90 days (142 days old).',
      severity: 'HIGH',
      risk_score: 75,
      status: 'Investigating',
      action: 'Rotate IAM Access Key',
      is_live: 0
    },
    {
      id: 'ALT-1003',
      timestamp: new Date(Date.now() - 120 * 60000).toISOString(),
      service: 'IAM',
      resource: 'User: temp-contractor',
      description: 'IAM User active without Multi-Factor Authentication (MFA) enabled.',
      severity: 'HIGH',
      risk_score: 70,
      status: 'Open',
      action: 'Enforce MFA policy',
      is_live: 0
    },
    {
      id: 'ALT-1004',
      timestamp: new Date(Date.now() - 240 * 60000).toISOString(),
      service: 'EC2',
      resource: 'sg-0a8b9c12345 (prod-web-sg)',
      description: 'Security group rule permits SSH port 22 access from 0.0.0.0/0.',
      severity: 'CRITICAL',
      risk_score: 90,
      status: 'Open',
      action: 'Restrict SSH access to trusted IP range',
      is_live: 0
    },
    {
      id: 'ALT-1005',
      timestamp: new Date(Date.now() - 360 * 60000).toISOString(),
      service: 'CloudTrail',
      resource: 'management-trail-main',
      description: 'CloudTrail log file validation is disabled for regional trail.',
      severity: 'MEDIUM',
      risk_score: 45,
      status: 'Resolved',
      action: 'Enable CloudTrail log integrity validation',
      is_live: 0
    },
    {
      id: 'ALT-1006',
      timestamp: new Date(Date.now() - 480 * 60000).toISOString(),
      service: 'CloudWatch',
      resource: 'Alarm: EC2-High-CPU-Utilization',
      description: 'CloudWatch Alarm triggered for EC2 instance i-09f123a45bc.',
      severity: 'LOW',
      risk_score: 20,
      status: 'Resolved',
      action: 'Monitor server autoscaling group',
      is_live: 0
    }
  ];

  for (const alt of initialAlerts) {
    await runQuery(
      `INSERT INTO alerts (id, timestamp, service, resource, description, severity, risk_score, status, action, is_live)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [alt.id, alt.timestamp, alt.service, alt.resource, alt.description, alt.severity, alt.risk_score, alt.status, alt.action, alt.is_live]
    );
  }

  const initialEvents = [
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
      is_live: 0
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
      is_live: 0
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
      is_live: 0
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
      is_live: 0
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
      is_live: 0
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
      is_live: 0
    }
  ];

  for (const evt of initialEvents) {
    await runQuery(
      `INSERT INTO events (id, timestamp, event_name, username, service, source_ip, region, resource, severity, risk_score, event_type, details, is_live)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [evt.id, evt.timestamp, evt.event_name, evt.username, evt.service, evt.source_ip, evt.region, evt.resource, evt.severity, evt.risk_score, evt.event_type, evt.details, evt.is_live]
    );
  }

  const initialResources = [
    {
      id: 'res-s3-01',
      name: 'production-data-vault-2026',
      type: 'S3',
      region: 'ap-south-1',
      status: 'Warning',
      security_status: 'Publicly Accessible / Encrypted',
      last_checked: new Date().toISOString(),
      details: JSON.stringify({ publicAccessBlock: false, defaultEncryption: true, versioning: 'Enabled' }),
      is_live: 0
    },
    {
      id: 'res-s3-02',
      name: 'cloud-logs-audit-archive',
      type: 'S3',
      region: 'ap-south-1',
      status: 'Healthy',
      security_status: 'Private / Encrypted AES-256',
      last_checked: new Date().toISOString(),
      details: JSON.stringify({ publicAccessBlock: true, defaultEncryption: true, versioning: 'Enabled' }),
      is_live: 0
    },
    {
      id: 'res-iam-01',
      name: 'IAM Global Account Config',
      type: 'IAM',
      region: 'global',
      status: 'Warning',
      security_status: '2 Users without MFA / 1 Key > 90 Days',
      last_checked: new Date().toISOString(),
      details: JSON.stringify({ totalUsers: 5, mfaDisabledUsers: 2, staleAccessKeys: 1, rootMfa: true }),
      is_live: 0
    },
    {
      id: 'res-ct-01',
      name: 'management-trail-main',
      type: 'CloudTrail',
      region: 'ap-south-1',
      status: 'Healthy',
      security_status: 'Logging Active / Multi-Region Enabled',
      last_checked: new Date().toISOString(),
      details: JSON.stringify({ isLogging: true, isMultiRegionTrail: true, logFileValidation: true }),
      is_live: 0
    },
    {
      id: 'res-cw-01',
      name: 'CloudWatch Alarms Pool',
      type: 'CloudWatch',
      region: 'ap-south-1',
      status: 'Healthy',
      security_status: '4 Active Alarms (0 In Alarm)',
      last_checked: new Date().toISOString(),
      details: JSON.stringify({ totalAlarms: 4, inAlarm: 0, metricNamespace: 'AWS/EC2' }),
      is_live: 0
    },
    {
      id: 'res-ec2-01',
      name: 'sg-0a8b9c12345 (prod-web-sg)',
      type: 'EC2 Security Group',
      region: 'ap-south-1',
      status: 'Critical',
      security_status: 'SSH Port 22 Exposed to 0.0.0.0/0',
      last_checked: new Date().toISOString(),
      details: JSON.stringify({ groupName: 'prod-web-sg', vpcId: 'vpc-01a2b3c4', openPorts: [22, 80, 443] }),
      is_live: 0
    }
  ];

  for (const res of initialResources) {
    await runQuery(
      `INSERT INTO resources (id, name, type, region, status, security_status, last_checked, details, is_live)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [res.id, res.name, res.type, res.region, res.status, res.security_status, res.last_checked, res.details, res.is_live]
    );
  }

  // Initial Scan Record
  await runQuery(
    `INSERT INTO scans (score, risk_level, critical_count, high_count, medium_count, low_count, total_resources, total_events, is_live, summary_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      68,
      'HIGH',
      2,
      2,
      1,
      1,
      6,
      6,
      0,
      JSON.stringify({
        recommendations: [
          'Enable S3 Block Public Access on bucket "production-data-vault-2026"',
          'Rotate IAM access key for user "dev-admin-user" (age > 90 days)',
          'Enforce MFA requirement for all IAM user logins',
          'Modify Security Group sg-0a8b9c12345 to restrict port 22 access'
        ]
      })
    ]
  );

  console.log('Database seeded successfully!');
}

module.exports = {
  db,
  runQuery,
  getQuery,
  allQuery,
  initDatabase
};
