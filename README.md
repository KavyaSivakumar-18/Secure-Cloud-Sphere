# Cloud Security Monitoring and Threat Detection System

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-v24.18.0-green.svg)](https://nodejs.org/)
[![AWS SDK v3](https://img.shields.io/badge/AWS_SDK-v3-orange.svg)](https://aws.amazon.com/sdk-for-node-js/)
[![Database](https://img.shields.io/badge/Database-SQLite3-blue.svg)](https://www.sqlite.org/)

A full-stack, enterprise-grade cloud security monitoring dashboard that continuously audits AWS cloud resources (S3, IAM, CloudTrail, CloudWatch, EC2), calculates real-time risk scores (0–100), detects suspicious security events, manages security alerts, and generates PDF compliance reports.

---

## 🌟 Project Overview
As organizations scale cloud infrastructure, configuration drift, exposed storage buckets, stale access keys, and un-enforced MFA introduce critical attack vectors. This system provides security teams with a unified operational dashboard to audit cloud configuration hygiene, track CloudTrail threat events, manage alert remediation workflows, and execute full security scans.

---

## 🎯 Key Objectives
- **Automated AWS Resource Auditing**: Audit S3 bucket public access blocks, default encryption, IAM key age (> 90 days), user MFA status, CloudTrail trail logging, and CloudWatch alarms.
- **Rule-Based Threat Detection**: Evaluate cloud events with an intelligent risk engine assigning severity (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`) and numeric risk scores.
- **Dual Telemetry Engine**: Seamlessly switch between **LIVE AWS DATA** (via AWS SDK v3) and realistic **DEMO MODE** if AWS credentials are not provided or permissions fail.
- **Zero Frontend Credential Leakage**: Store credentials exclusively in server-side `.env` files. Never expose AWS credentials to client-side code.
- **Interactive Security Operations Dashboard**: Dark-mode glassmorphism UI with real-time Chart.js visualizations, alert lifecycle management, live event search, and instant PDF report export.

---

## 🏗️ System Architecture

```
Browser (Frontend UI)
  │
  ├─► HTTPS / REST API
  ▼
Node.js + Express Backend
  │
  ├──► AWS SDK v3 Integration Module
  │      ├── S3 Client (Bucket Public Block & Encryption)
  │      ├── IAM Client (Keys, MFA, Admin Policies)
  │      ├── CloudTrail Client (Event Telemetry)
  │      └── CloudWatch Client (Alarms & Metrics)
  │
  ├──► Rule-Based Risk Engine (0-100 Risk Score Calculator)
  │
  └──► SQLite Database (alerts, events, scans, resources, users)
```

---

## 🛠️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | HTML5, CSS3 (Vanilla Dark Cybersecurity Theme), JavaScript (ES6+), Chart.js, FontAwesome 6, html2pdf.js |
| **Backend** | Node.js, Express.js, AWS SDK for JavaScript v3 (`@aws-sdk/client-*`), dotenv, cors |
| **Database** | SQLite3 (Persistent local database for alerts, events, scans, and user auth) |
| **Authentication**| JSON Web Tokens (JWT) + bcryptjs password hashing |

---

## ☁️ AWS Services Monitored
1. **Amazon S3**: Public Access Block status, server-side encryption (SSE-S3/KMS), object counts, storage volume.
2. **AWS IAM**: Stale access keys (> 90 days), users missing MFA, direct AdministratorAccess policy attachments, root MFA status.
3. **AWS CloudTrail**: Management event logging, multi-region trail configuration, event log audit history.
4. **Amazon CloudWatch**: Alarm states (OK, ALARM, INSUFFICIENT_DATA), metric counts.
5. **Amazon EC2**: Security group ingress rules (open SSH port 22 / RDP port 3389).

---

## 📊 Risk Score Calculation Engine
The system calculates an overall Security Score from `0` (Critical Vulnerability) to `100` (Perfect Compliance):

| Severity | Score Deduction | Condition Examples |
| :--- | :--- | :--- |
| **CRITICAL** | `-25 pts` | S3 bucket publicly readable/writable, Security group SSH open to `0.0.0.0/0`, CloudTrail logging stopped |
| **HIGH** | `-15 pts` | Access key > 90 days old, Un-rotated admin key, Excessive IAM permissions |
| **MEDIUM** | `-8 pts` | User without MFA, CloudTrail log integrity disabled |
| **LOW** | `-2 pts` | Minor configuration drift, warning alerts |

- **0 - 25**: `CRITICAL` Risk Level
- **26 - 50**: `HIGH` Risk Level
- **51 - 75**: `MEDIUM` Risk Level
- **76 - 100**: `LOW` Risk Level

---

## 🚀 Installation & Getting Started

### Prerequisites
- Node.js v18+ or v24+
- npm (Node Package Manager)

### Step 1: Clone or Open Workspace
```bash
cd "d:\cloud monitoring System"
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Configure Environment Variables
Copy `.env.example` to `backend/.env`:
```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env`:
```env
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=ap-south-1
S3_BUCKET_NAME=
PORT=5000
JWT_SECRET=super-secret-key-2026
```
*(Leave AWS credentials blank to test in DEMO MODE immediately, or enter valid IAM keys for Live AWS monitoring).*

### Step 4: Start Backend & Frontend Server
```bash
npm start
```
Open your browser and navigate to:
**`http://localhost:5000`**

Default Application Login Credentials:
- **Username**: `admin`
- **Password**: `admin123`

---

## 🧪 Testing Features
1. **Login Page**: Test authentication with `admin / admin123`.
2. **Dashboard**: View overall Security Score, active alert metrics, and interactive Chart.js charts.
3. **Security Scan**: Click **"Run Security Scan"** to execute a full 9-step security audit across S3, IAM, CloudTrail, and CloudWatch.
4. **AWS Resources**: Filter resources by service type or status, click **"View"** for detailed payload modal.
5. **Security Alerts**: Update alert status between `Open`, `Investigating`, and `Resolved`.
6. **Event Logs**: Use instant search bar to filter CloudTrail event logs by user, event name, or IP address.
7. **Security Reports**: Click **"Export PDF Report"** to download a formatted compliance audit report.

---

## 🔒 Security Best Practices Implemented
- **No AWS Credentials in Frontend**: All AWS SDK API calls execute purely on Node.js backend.
- **Credential Storage**: Credentials read strictly from `backend/.env`. `.env` added to `.gitignore`.
- **Password Hashing**: Passwords stored as bcrypt hashes in SQLite.
- **Error Handling**: Graceful fallback to DEMO MODE on AWS permission errors without crashing server.

---

## 📁 Project Structure
```
cloud-security-monitoring-system/
├── backend/
│   ├── server.js               # Express application entry point & static server
│   ├── package.json            # Backend Node.js dependencies
│   ├── .env                    # Real credentials (Git ignored)
│   ├── .env.example            # Environment template
│   ├── database/
│   │   └── database.js         # SQLite database initialization & seeding
│   ├── services/
│   │   ├── s3Monitor.js        # S3 bucket security auditor
│   │   ├── iamMonitor.js       # IAM keys & MFA auditor
│   │   ├── cloudTrailMonitor.js# CloudTrail event audit service
│   │   ├── cloudWatchMonitor.js# CloudWatch alarm state auditor
│   │   └── securityScanner.js  # 9-step security scan orchestrator
│   ├── routes/
│   │   ├── dashboard.js        # Dashboard API endpoints
│   │   ├── resources.js        # Resource inventory & service status APIs
│   │   ├── alerts.js           # Alert status management APIs
│   │   ├── events.js           # CloudTrail log search APIs
│   │   ├── reports.js          # Security scan & PDF report APIs
│   │   └── auth.js             # Local application authentication API
│   └── utils/
│       └── riskCalculator.js   # Risk scoring & threat detection engine
│
├── frontend/
│   ├── index.html              # Entry redirect page
│   ├── login.html              # Application login interface
│   ├── dashboard.html          # Main Operations Dashboard
│   ├── alerts.html             # Threat Alerts Management
│   ├── events.html             # Audit Event Logs with Live Search
│   ├── resources.html          # AWS Monitored Resources Inventory
│   ├── reports.html            # Compliance Reports & PDF Export
│   ├── settings.html           # Connection Health & AWS Setup Guide
│   ├── css/
│   │   └── style.css           # Modern Cybersecurity Dark Theme Design System
│   └── js/
│       ├── auth.js             # Session guard & topbar controller
│       ├── login.js            # Login form handler
│       ├── dashboard.js        # Chart.js visualization engine
│       ├── alerts.js           # Alert status update handler
│       ├── events.js           # Live search & event filter handler
│       ├── resources.js        # Resource filter & detail modal handler
│       ├── reports.js          # Security audit PDF report exporter
│       └── settings.js         # Health test controller
│
├── architecture/
│   └── system_architecture.md  # Architectural diagram & design docs
├── documentation/
│   ├── aws_setup_guide.md      # Step-by-step AWS Console configuration guide
│   └── api_documentation.md    # REST API specification
├── .gitignore                  # Git exclusions
├── package.json                # Root project configuration
└── README.md                   # System documentation
```

---

## 📝 License
This project is licensed under the MIT License.
