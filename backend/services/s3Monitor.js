const {
  S3Client,
  ListBucketsCommand,
  GetPublicAccessBlockCommand,
  GetBucketEncryptionCommand,
  GetBucketLocationCommand,
  ListObjectsV2Command
} = require('@aws-sdk/client-s3');

function getS3Client() {
  const region = process.env.AWS_REGION || 'ap-south-1';
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  if (!accessKeyId || !secretAccessKey || accessKeyId === 'YOUR_ACCESS_KEY' || accessKeyId.trim() === '') {
    return null;
  }

  return new S3Client({
    region,
    credentials: {
      accessKeyId: accessKeyId.trim(),
      secretAccessKey: secretAccessKey.trim()
    }
  });
}

async function checkS3Security() {
  const client = getS3Client();
  const bucketName = process.env.S3_BUCKET_NAME;

  if (!client) {
    return getDemoS3Status('AWS Credentials not configured in .env. Running in DEMO MODE.');
  }

  try {
    const listResponse = await client.send(new ListBucketsCommand({}));
    const buckets = listResponse.Buckets || [];

    let targetBucket = bucketName || (buckets[0] ? buckets[0].Name : null);

    if (!targetBucket) {
      return getDemoS3Status('No S3 bucket found in AWS Account. Displaying sample data.');
    }

    let publicBlockStatus = false;
    let encryptionStatus = false;
    let objectCount = 0;
    let storageSizeBytes = 0;

    // Check Public Access Block
    try {
      const publicBlockRes = await client.send(new GetPublicAccessBlockCommand({ Bucket: targetBucket }));
      const config = publicBlockRes.PublicAccessBlockConfiguration || {};
      publicBlockStatus = config.BlockPublicAcls && config.BlockPublicPolicy && config.IgnorePublicAcls && config.RestrictPublicBuckets;
    } catch (e) {
      console.warn(`S3 GetPublicAccessBlock warning for ${targetBucket}:`, e.name || e.message);
      publicBlockStatus = false;
    }

    // Check Encryption
    try {
      const encRes = await client.send(new GetBucketEncryptionCommand({ Bucket: targetBucket }));
      encryptionStatus = !!(encRes.ServerSideEncryptionConfiguration && encRes.ServerSideEncryptionConfiguration.Rules.length > 0);
    } catch (e) {
      console.warn(`S3 GetBucketEncryption warning for ${targetBucket}:`, e.name || e.message);
      encryptionStatus = false;
    }

    // List Objects summary
    try {
      const objRes = await client.send(new ListObjectsV2Command({ Bucket: targetBucket, MaxKeys: 100 }));
      objectCount = objRes.KeyCount || 0;
      if (objRes.Contents) {
        storageSizeBytes = objRes.Contents.reduce((acc, curr) => acc + (curr.Size || 0), 0);
      }
    } catch (e) {
      console.warn(`S3 ListObjects warning for ${targetBucket}:`, e.message);
    }

    const findings = [];
    if (!publicBlockStatus) {
      findings.push({
        severity: 'CRITICAL',
        riskScore: 90,
        title: 'S3 Public Access Risk',
        description: `Bucket '${targetBucket}' does not have all Block Public Access settings enabled.`
      });
    }

    if (!encryptionStatus) {
      findings.push({
        severity: 'HIGH',
        riskScore: 75,
        title: 'Unencrypted S3 Bucket',
        description: `Bucket '${targetBucket}' does not have default server-side encryption enabled.`
      });
    }

    if (findings.length === 0) {
      findings.push({
        severity: 'LOW',
        riskScore: 10,
        title: 'S3 Security Configuration Compliant',
        description: `Bucket '${targetBucket}' is private and encrypted.`
      });
    }

    return {
      isLive: true,
      bucketName: targetBucket,
      region: process.env.AWS_REGION || 'ap-south-1',
      totalBuckets: buckets.length,
      bucketsList: buckets.map(b => b.Name),
      publicAccessBlockEnabled: publicBlockStatus,
      encryptionEnabled: encryptionStatus,
      objectCount,
      storageSizeBytes,
      storageSizeFormatted: (storageSizeBytes / (1024 * 1024)).toFixed(2) + ' MB',
      findings,
      status: findings.some(f => f.severity === 'CRITICAL') ? 'Critical' : (findings.some(f => f.severity === 'HIGH') ? 'Warning' : 'Healthy'),
      lastChecked: new Date().toISOString()
    };
  } catch (err) {
    console.error('AWS S3 SDK Error:', err.name || err.message);
    return getDemoS3Status(`AWS S3 Error (${err.name || 'Error'}): ${err.message}. Falling back to DEMO MODE.`);
  }
}

function getDemoS3Status(reason = 'Demo mode active') {
  return {
    isLive: false,
    reason,
    bucketName: process.env.S3_BUCKET_NAME || 'production-data-vault-2026',
    region: process.env.AWS_REGION || 'ap-south-1',
    totalBuckets: 3,
    bucketsList: ['production-data-vault-2026', 'cloud-logs-audit-archive', 'app-static-assets-cache'],
    publicAccessBlockEnabled: false,
    encryptionEnabled: true,
    objectCount: 1420,
    storageSizeBytes: 485100000,
    storageSizeFormatted: '462.62 MB',
    findings: [
      {
        severity: 'CRITICAL',
        riskScore: 90,
        title: 'S3 Bucket Public Access Allowed',
        description: 'Bucket production-data-vault-2026 has Block Public Access disabled.'
      },
      {
        severity: 'LOW',
        riskScore: 10,
        title: 'Server-Side Encryption',
        description: 'AES-256 Server-Side Encryption is active.'
      }
    ],
    status: 'Critical',
    lastChecked: new Date().toISOString()
  };
}

module.exports = {
  checkS3Security
};
