# Hexa MedPlus — AWS Deployment Setup Guide

This guide documents all the steps taken to deploy Hexa MedPlus end-to-end on AWS Cloud (Region: `ap-south-1` — Asia Pacific, Mumbai).

---

## Architecture Overview

```
Browser
  +-- CloudFront CDN (hexamedplus-cdn)
        +-- /* ? S3 Bucket (hexamedplus-frontend)       [React Frontend]
        +-- /api/* ? ALB (hexamed-alb)
                      +-- hexamed-tg-new (HTTP:8080)
                            +-- EC2 t3.large (hexamed-backend-server)
                                  +-- hexamed_gateway   (API Gateway   :8080)
                                  +-- hexamed_clinical  (Clinical Svc  :8081)
                                  +-- hexamed_document  (Document Svc  :8082)
                                  +-- hexamed_ai_engine (AI Service    :8083)
                                  +-- hexamed_postgres  (PostgreSQL     :5432)
                                  +-- hexamed_kafka     (Kafka          :9092)
                                  +-- hexamed_redis     (Redis          :6379)
```

---

## Step 1: S3 Buckets

Created two S3 buckets in `ap-south-1`:

| Bucket Name | Purpose |
|---|---|
| `hexamedplus-frontend` | Hosts the React production build |
| `hexamedplus-documents` | Stores patient documents uploaded by physicians |

**Settings used:**
- Region: `ap-south-1`
- All other settings: Default

---

## Step 2: IAM User & Policy

### Created IAM Policy: `hexamed-s3-policy`
- Grants read/write access to both S3 buckets.

### Created IAM User: `hexamed-s3-user`
- Attached policy: `hexamed-s3-policy`
- Generated **Access Key ID** and **Secret Access Key** (saved securely).

---

## Step 3: EC2 Security Groups

### Security Group 1: `hexamed-alb-sg`
- **Description**: Security group for ALB
- **VPC**: `vpc-0a05ce40c0427cc6a` (default)
- **Inbound Rules**:

| Type | Protocol | Port | Source |
|---|---|---|---|
| HTTP | TCP | 80 | 0.0.0.0/0 |

- **Outbound Rules**: All traffic ? 0.0.0.0/0

---

### Security Group 2: `hexamed-ec2-sg`
- **Description**: Security group for EC2 containers
- **VPC**: `vpc-0a05ce40c0427cc6a` (default)
- **Inbound Rules**:

| Type | Protocol | Port | Source |
|---|---|---|---|
| Custom TCP | TCP | 8080 | 0.0.0.0/0 |
| SSH | TCP | 22 | 0.0.0.0/0 |

- **Outbound Rules**: All traffic ? 0.0.0.0/0

---

## Step 4: IAM Role for EC2

### Created IAM Role: `hexamed-ec2-role`
- **Trusted entity type**: AWS service — EC2
- **Inline Policy Name**: `hexamed-ec2-ssm-logs-policy`
- **Permissions granted**:
  - **CloudWatch Logs**: Limited List, Write — `/hexamed/*` log groups in `ap-south-1`
  - **Systems Manager**: Limited Read — `ap-south-1`

---

## Step 5: EC2 Instance

### Launched EC2 Instance: `hexamed-backend-server`
- **AMI**: Amazon Linux 2023
- **Instance type**: `t3.large` (2 vCPU / 8 GB RAM)
- **Security group**: `hexamed-ec2-sg`
- **IAM instance profile**: `hexamed-ec2-role`
- **Storage**: 30 GB (expanded from default 8 GB using EBS Modify Volume)

### Elastic IP
- Allocated a new Elastic IP from AWS pool.
- Associated Elastic IP to `hexamed-backend-server`.

---

## Step 6: SSM Parameter Store (Secrets)

Stored all application secrets as `SecureString` in **Systems Manager ? Parameter Store** (Region: `ap-south-1`):

| Parameter Name | Description |
|---|---|
| `/hexamed/postgres-password` | PostgreSQL database password |
| `/hexamed/jwt-secret` | JWT signing secret for API Gateway |
| `/hexamed/nvidia-nim-api-key` | NVIDIA NIM API Key for AI service |
| `/hexamed/s3-access-key` | IAM user Access Key ID |
| `/hexamed/s3-secret-key` | IAM user Secret Access Key |
| `/hexamed/s3-documents-bucket` | `hexamedplus-documents` |
| `/hexamed/cors-extra-origin` | CloudFront URL (e.g. `https://d3d57se6ouh48a.cloudfront.net`) |

---

## Step 7: Target Group & Application Load Balancer (ALB)

### Target Group: `hexamed-tg-new`
- **Target type**: Instances
- **Protocol / Port**: HTTP / `8080`
- **Health check path**: `/actuator/health`
- **Registered target**: `hexamed-backend-server` on port `8080`

### Application Load Balancer: `hexamed-alb`
- **Scheme**: Internet-facing
- **IP address type**: IPv4
- **Availability Zones**: `ap-south-1a`, `ap-south-1b`
- **Security group**: `hexamed-alb-sg`
- **Listener**: HTTP:80 ? Forward to `hexamed-tg-new`

---

## Step 8: CloudFront CDN

### Distribution: `hexamedplus-cdn`
- **Domain**: `https://d3d57se6ouh48a.cloudfront.net`
- **Default root object**: `index.html`

#### Origins configured:

| Origin | Type | Protocol |
|---|---|---|
| `hexamedplus-frontend.s3.ap-south-1.amazonaws.com` | S3 | OAC managed |
| `hexamed-alb-1168878095.ap-south-1.elb.amazonaws.com` | ALB | HTTP only |

#### Behaviors configured:

| Precedence | Path Pattern | Origin | Cache Policy |
|---|---|---|---|
| 0 | `/api/*` | ALB | CachingDisabled, AllViewer |
| 1 | `Default (*)` | S3 Frontend | CachingOptimized |

---

## Step 9: Launch Backend on EC2

Connected to `hexamed-backend-server` via **EC2 Instance Connect** in the browser.

Ran the following commands in sequence:

```bash
# Install Docker & Git
sudo yum install -y docker git
sudo systemctl enable --now docker
sudo usermod -aG docker ec2-user

# Install Docker Compose plugin
sudo mkdir -p /usr/libexec/docker/cli-plugins
sudo curl -SL https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64 \
  -o /usr/libexec/docker/cli-plugins/docker-compose
sudo chmod +x /usr/libexec/docker/cli-plugins/docker-compose

# Expand disk partition to 30 GB
sudo growpart /dev/nvme0n1 1
sudo xfs_growfs /

# Clone the repository
git clone https://github.com/N-MohammedShakeel/Hexa-MedPlus.git hexamedplus
cd hexamedplus

# Fetch secrets from SSM Parameter Store into .env
chmod +x scripts/aws/fetch-env-from-ssm.sh
./scripts/aws/fetch-env-from-ssm.sh

# Launch all backend containers
sudo docker compose -f docker-compose.aws.yml up -d --build
```

### Containers Running:

| Container | Image | Port |
|---|---|---|
| `hexamed_gateway` | hexamedplus-api-gateway | 8080 |
| `hexamed_clinical` | hexamedplus-clinical-service | 8081 |
| `hexamed_document` | hexamedplus-document-service | 8082 |
| `hexamed_ai_engine` | hexamedplus-ai-service | 8083 |
| `hexamed_postgres` | pgvector/pgvector:pg16 | 5432 |
| `hexamed_kafka` | confluentinc/cp-kafka:7.5.0 | 9092 |
| `hexamed_redis` | redis:7-alpine | 6379 |

---

## Step 10: Deploy Frontend to S3

Built the React app locally and uploaded all files from `frontend/dist/` to `hexamedplus-frontend` S3 bucket via **AWS S3 Console ? Upload** (drag & drop).

After uploading, CloudFront automatically serves the frontend at:
**`https://d3d57se6ouh48a.cloudfront.net`**

---

## Step 11: Final Verification

| Check | Status |
|---|---|
| `curl http://localhost:8080/actuator/health` | `{"status":"UP"}` |
| ALB Target Group `hexamed-tg-new` health | Healthy |
| CloudFront `/api/*` origin protocol | HTTP only |
| CloudFront default root object | `index.html` |
| Frontend loads at CloudFront URL | Working |
| Login works end-to-end | Working |

---

## Test Accounts

| Role | Email | Password |
|---|---|---|
| Physician | `ms@hospital.com` | `password123` |
| Coder | `coder@hospital.com` | `password123` |
| Admin | `admin@hospital.com` | `password123` |

---

## Live Application URL

https://d3d57se6ouh48a.cloudfront.net
