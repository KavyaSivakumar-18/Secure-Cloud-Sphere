# System Architecture Documentation

## Overview
The **Cloud Security Monitoring and Threat Detection System** is an enterprise-grade cloud security dashboard designed to audit AWS cloud infrastructure, calculate real-time security risk scores (0-100), detect threat events, manage security alerts, and generate compliance reports.

```
+-------------------------------------------------------------------+
|                   Browser / Frontend Application                  |
|  (HTML5, CSS3, Vanilla JS, Chart.js, FontAwesome, html2pdf.js)     |
+-------------------------------------------------------------------+
                                  |
                                  | REST APIs / HTTP JSON
                                  v
+-------------------------------------------------------------------+
|                     Node.js + Express Backend                     |
|                                                                   |
|   +-----------------------+     +-----------------------------+   |
|   |   Security Analysis   |     |    SQLite Database Engine   |   |
|   |   & Risk Calculator   |     |  (alerts, events, scans,    |   |
|   |     (Rule Engine)     |     |   resources, users)         |   |
|   +-----------------------+     +-----------------------------+   |
|                                                                   |
|   +-----------------------------------------------------------+   |
|   |            AWS SDK for JavaScript v3 Modules              |   |
|   |   (S3Client, IAMClient, CloudTrailClient, CloudWatchClient) |   |
|   +-----------------------------------------------------------+   |
+-------------------------------------------------------------------+
                                  |
                      AWS Service APIs (HTTPS)
                                  v
+-------------------------------------------------------------------+
|                            AWS Cloud                              |
|       [ S3 ]       [ IAM ]       [ CloudTrail ]    [ CloudWatch ] |
+-------------------------------------------------------------------+
```

## Security & Architecture Principles
1. **Zero Frontend Exposure**: No AWS Access Keys, Secret Keys, or AWS SDK references exist in client-side frontend code. All AWS communication is handled strictly server-side.
2. **Dedicated IAM Least-Privilege**: The backend uses read-only IAM credentials stored exclusively in `backend/.env`.
3. **Graceful Fallback / Dual Mode**: If AWS credentials are missing, invalid, or permissions fail, the application automatically catches AWS exceptions (`AccessDenied`, `NoSuchBucket`, `InvalidAccessKeyId`, etc.) and switches to a realistic `DEMO MODE` without crashing.
4. **Local SQLite Persistence**: Security scan history, alert statuses, audit trails, and application user credentials are saved in SQLite database (`backend/database/cloud_security.db`).
