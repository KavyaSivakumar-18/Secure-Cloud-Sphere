# AWS Management Console Configuration Guide

This guide walks through configuring your AWS account via the **AWS Management Console** for real-time security monitoring.

> **IMPORTANT**: As requested:
> - Do NOT use AWS CLI.
> - Do NOT use AWS CloudShell.
> - Do NOT use Terraform or AWS CDK.
> - Configure all resources using the **AWS Management Console** UI.

---

## 1. Create Dedicated IAM User (Recommended)
1. Open the [AWS Management Console](https://console.aws.amazon.com/).
2. Navigate to **IAM** service.
3. Click **Users** -> **Add user**.
4. Set User name: `CloudSecurityMonitorUser`.
5. Select **Attach policies directly**.
6. Attach the following standard read-only managed policies:
   - `AmazonS3ReadOnlyAccess`
   - `IAMReadOnlyAccess`
   - `AWSCloudTrail_ReadOnlyAccess`
   - `CloudWatchReadOnlyAccess`
7. Complete user creation.
8. Click on the newly created user -> **Security credentials** tab.
9. Under **Access keys**, click **Create access key**.
10. Select **Application running outside AWS**.
11. Copy the **Access key ID** and **Secret access key** into your local `backend/.env` file.

---

## 2. Configure S3 Bucket Monitoring
1. In AWS Console, search for **S3**.
2. Click **Create bucket** or select an existing bucket (e.g. `my-security-bucket-2026`).
3. Note the bucket name and region.
4. Set `S3_BUCKET_NAME` and `AWS_REGION` in `backend/.env`.

---

## 3. Enable CloudTrail Logging
1. In AWS Console, search for **CloudTrail**.
2. Click **Trails** -> **Create trail**.
3. Name: `management-trail-main`.
4. Choose **Apply trail to all regions**.
5. Enable **Read/Write management events**.
6. Complete setup.

---

## 4. Verify Environment Configuration
Edit `backend/.env`:
```env
AWS_ACCESS_KEY_ID=AKIAxxxxxxxxxxxx
AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
AWS_REGION=ap-south-1
S3_BUCKET_NAME=my-security-bucket-2026
PORT=5000
```
Start the backend using `npm start` and visit `http://localhost:5000`. The system will automatically display `LIVE AWS DATA` mode.
