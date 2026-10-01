# REST API Documentation

The backend server exposes RESTful HTTP endpoints for dashboard metrics, security scanning, alert management, and event logging.

---

### 1. Health & Status
- **`GET /health`**
  - **Description**: Returns backend operational status, target AWS region, and credentials check.
  - **Response**:
    ```json
    {
      "status": "UP",
      "timestamp": "2026-09-26T12:00:00.000Z",
      "awsConfigured": true,
      "region": "ap-south-1"
    }
    ```

---

### 2. Dashboard Telemetry
- **`GET /api/dashboard`**
  - **Description**: Summary metrics, security score (0-100), active alert counts, monitored resource totals, and Chart.js datasets.

---

### 3. AWS Resource Audit
- **`GET /api/resources`**
  - **Description**: Inventory list of monitored S3, IAM, CloudTrail, CloudWatch, and EC2 resources.
- **`GET /api/s3/status`**
  - **Description**: Detailed S3 bucket security audit (Public block access, encryption, size).
- **`GET /api/iam/status`**
  - **Description**: Detailed IAM audit (MFA status, stale access keys > 90 days, admin policies).
- **`GET /api/cloudtrail/events`**
  - **Description**: CloudTrail management event logs.
- **`GET /api/cloudwatch/status`**
  - **Description**: CloudWatch alarm states and metrics.

---

### 4. Alert Management
- **`GET /api/alerts`**
  - **Query Params**: `status` (`Open`, `Investigating`, `Resolved`), `severity` (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`), `service`
- **`PUT /api/alerts/:id/status`**
  - **Body**: `{ "status": "Investigating" }` or `{ "status": "Resolved" }`

---

### 5. Event Logging
- **`GET /api/events`**
  - **Query Params**: `search`, `severity`, `service`, `startDate`, `endDate`

---

### 6. Security Scanning & Reports
- **`POST /api/security-scan`**
  - **Description**: Initiates a full 9-step security scan across AWS services and updates SQLite database.
- **`GET /api/reports`**
  - **Description**: Security report summary, remediation recommendations, and historical scan trend.
- **`GET /api/security-score`**
  - **Description**: Quick current security score (0-100) and risk level.

---

### 7. Application Auth
- **`POST /api/auth/login`**
  - **Body**: `{ "username": "admin", "password": "admin123" }`
- **`GET /api/auth/me`**
  - **Header**: `Authorization: Bearer <token>`
- **`POST /api/auth/logout`**
