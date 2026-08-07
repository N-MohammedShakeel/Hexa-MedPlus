# Hexa MedPlus — AWS Architecture & Services Guide

A complete reference covering every AWS service used in Hexa MedPlus: what it is, its general purpose, why we specifically chose it, how it fits in our architecture, and the full cost breakdown for real-world hospital deployment.

---

## AWS Architecture Diagram

```
                        ┌─────────────────────────────────────────────────────────┐
                        │                    INTERNET                              │
                        └────────────────────────┬────────────────────────────────┘
                                                 │
                                   ┌─────────────▼─────────────┐
                                   │   Amazon CloudFront CDN    │
                                   │   hexamedplus-cdn          │
                                   │   d3d57se6ouh48a.cf.net    │
                                   └──────┬──────────────┬──────┘
                                          │              │
                    Path: /*             │              │ Path: /api/*
                    (Frontend)           │              │ (API Calls)
                                         │              │
                         ┌───────────────▼──┐  ┌───────▼──────────────────┐
                         │   Amazon S3      │  │  Application Load        │
                         │ hexamedplus-     │  │  Balancer (hexamed-alb)  │
                         │ frontend         │  │  HTTP:80                 │
                         │ (React Build)    │  └──────────┬───────────────┘
                         └──────────────────┘             │
                                                          │ hexamed-tg-new
                                                          │ HTTP:8080
                                         ┌────────────────▼────────────────────────┐
                                         │        EC2 t3.large Instance             │
                                         │        hexamed-backend-server            │
                                         │        (Amazon Linux 2023, 30GB EBS)    │
                                         │                                          │
                                         │  ┌──────────────────────────────────┐   │
                                         │  │         Docker Network           │   │
                                         │  │         (hexamed-net)            │   │
                                         │  │                                  │   │
                                         │  │  ┌────────────────────────────┐  │   │
                                         │  │  │  hexamed_gateway :8080     │  │   │
                                         │  │  │  (Spring Cloud Gateway)    │  │   │
                                         │  │  └──────────────┬─────────────┘  │   │
                                         │  │                 │                 │   │
                                         │  │    ┌────────────┼──────────────┐  │   │
                                         │  │    │            │              │  │   │
                                         │  │  ┌─▼──────┐ ┌──▼──────┐ ┌────▼─┐│   │
                                         │  │  │clinical│ │document │ │  ai  ││   │
                                         │  │  │:8081   │ │:8082    │ │:8083 ││   │
                                         │  │  └─────┬──┘ └─────┬───┘ └──┬───┘│   │
                                         │  │        │           │        │    │   │
                                         │  │  ┌─────▼───────────▼────────▼──┐ │   │
                                         │  │  │   hexamed_postgres :5432     │ │   │
                                         │  │  │   hexamed_kafka   :9092     │ │   │
                                         │  │  │   hexamed_redis   :6379     │ │   │
                                         │  │  └─────────────────────────────┘ │   │
                                         │  └──────────────────────────────────┘   │
                                         └─────────────────────────────────────────┘
                                                          │
                                          ┌───────────────┼────────────────┐
                                          │               │                │
                               ┌──────────▼──┐  ┌─────────▼────┐  ┌──────▼─────────┐
                               │ SSM Parameter│  │  Amazon S3   │  │   IAM          │
                               │ Store        │  │  hexamedplus-│  │   hexamed-     │
                               │ /hexamed/*   │  │  documents   │  │   ec2-role     │
                               │ (Secrets)    │  │  (Patient    │  │   hexamed-     │
                               └─────────────┘  │   Documents) │  │   s3-user      │
                                                └──────────────┘  └────────────────┘
```

---

## AWS Services Used

### 1. Amazon S3 (Simple Storage Service)

**What it is:**
Amazon S3 is an object storage service offering industry-leading scalability, data availability, durability, and security. It stores any amount of data as objects (files) inside containers called buckets.

**General use cases:**
- Hosting static websites and Single Page Applications (SPAs)
- Storing and archiving files, documents, backups, and media
- Data lake storage for analytics

**Why we used it in Hexa MedPlus:**
We use S3 for two completely different purposes:

| Bucket | Purpose | Why |
|---|---|---|
| `hexamedplus-frontend` | Serves the compiled React app | Zero-cost static hosting; infinitely scalable; pairs perfectly with CloudFront CDN |
| `hexamedplus-documents` | Stores all patient clinical documents uploaded by physicians | HIPAA-eligible; durable (11 nines); replaces the self-hosted MinIO container |

S3 replaced our local MinIO container for document storage. The MinIO Java SDK is S3-API compatible, so **no code changes were needed** — just a configuration change pointing at the real S3 endpoint.

**Cost:**
- First 5 GB storage: **FREE** (12 months Free Tier)
- After: ~$0.023/GB/month stored
- GET requests: $0.0004 per 1,000 requests
- PUT requests: $0.005 per 1,000 requests

---

### 2. Amazon CloudFront (Content Delivery Network)

**What it is:**
Amazon CloudFront is a fast content delivery network (CDN) service that securely delivers data, videos, applications, and APIs to users globally with low latency and high transfer speeds using a global network of 400+ edge locations.

**General use cases:**
- Accelerating delivery of websites and web apps
- Serving static assets (JS, CSS, images) from edge locations near users
- API acceleration and caching
- Security shield with WAF integration

**Why we used it in Hexa MedPlus:**
CloudFront is the single entry point for our entire application. It serves two origins under one domain:

- **`/*` → S3**: Serves the React frontend with global caching and HTTPS.
- **`/api/*` → ALB**: Routes all API calls to the backend with caching **disabled** (CachingDisabled policy) so live medical data is never cached.

This architecture means:
1. Physicians and coders access the app over HTTPS from a single URL regardless of where they are.
2. The ALB (and EC2) are never directly exposed to the internet.
3. CloudFront acts as a security and performance layer for free.

**Distribution configured:**
- Domain: `https://d3d57se6ouh48a.cloudfront.net`
- Default root object: `index.html` (for React Router SPA support)
- Origin for `/api/*`: HTTP only to ALB (no HTTPS on ALB needed)

**Cost:**
- First 1 TB data transfer/month: **FREE** (Free Tier)
- First 10,000,000 HTTPS requests/month: **FREE** (Free Tier)
- After: ~$0.0085/GB data transfer, $0.0100 per 10,000 requests

---

### 3. Amazon EC2 (Elastic Compute Cloud)

**What it is:**
Amazon EC2 provides resizable virtual servers (instances) in the cloud. You choose the OS, CPU, memory, storage, and networking configuration. It is the foundation of most AWS architectures.

**General use cases:**
- Running web servers, application servers, and APIs
- Running containerised microservices
- Machine learning inference
- Database hosting

**Why we used it in Hexa MedPlus:**
We run all 7 backend containers on a single `t3.large` EC2 instance using Docker Compose. We chose `t3.large` (2 vCPU / 8 GB RAM) specifically because:

- `ai-service` loads PyTorch + `sentence-transformers` cross-encoder reranker (~300–500 MB RAM) for Hybrid RAG
- `GLiNER` NER model loads for PHI redaction
- 3 Spring Boot JVMs (`api-gateway`, `clinical-service`, `document-service`) each claim up to 2GB heap
- PostgreSQL + Kafka + Redis all run as containers on the same host

A smaller `t3.medium` (4 GB) would likely OOM under real load.

**Instance details:**
- **AMI**: Amazon Linux 2023
- **Type**: `t3.large` (2 vCPU / 8 GB)
- **Storage**: 30 GB EBS (expanded to fit Docker images + models)
- **Elastic IP**: Static public IP so the address stays stable across stop/start
- **Security group**: `hexamed-ec2-sg` (port 8080 from ALB, port 22 for SSH)

**Cost:**
- `t3.large` on-demand (ap-south-1): ~$0.0928/hr (~$2.23/day)
- EBS 30 GB (gp2): ~$0.004/day
- Elastic IP (when instance running): FREE; when stopped: ~$0.005/hr

---

### 4. Elastic Load Balancing — Application Load Balancer (ALB)

**What it is:**
An Application Load Balancer (ALB) operates at Layer 7 (HTTP/HTTPS) and intelligently routes incoming traffic to backend targets (EC2 instances, containers, Lambda functions) based on request content like URL paths, headers, and hostnames.

**General use cases:**
- Distributing web traffic across multiple servers for high availability
- Health checking backend servers and removing unhealthy targets
- Path-based routing to different microservices
- SSL termination

**Why we used it in Hexa MedPlus:**
The ALB sits between CloudFront and our EC2 instance. Even though we only have one EC2 instance (a demo constraint), the ALB provides:

1. **Health checking**: Continuously polls `/actuator/health` on port 8080. If the API Gateway crashes, ALB immediately marks it unhealthy so CloudFront stops routing to it.
2. **Clean separation**: The EC2 instance is never directly internet-facing — all traffic enters through the ALB, which is protected by `hexamed-alb-sg`.
3. **Future scaling**: When this scales to multiple EC2 instances, the ALB just needs new targets registered — zero infrastructure redesign.

**Resources created:**
- Load balancer: `hexamed-alb` (internet-facing, HTTP:80)
- Target group: `hexamed-tg-new` (Instance type, HTTP:8080, health check: `/actuator/health`)
- Security group: `hexamed-alb-sg` (port 80 open from 0.0.0.0/0)

**Cost:**
- ALB hourly: ~$0.025/hr (~$0.60/day)
- LCU (Load Balancer Capacity Units): negligible at demo traffic

---

### 5. AWS IAM (Identity & Access Management)

**What it is:**
IAM is AWS's unified service for controlling who (users, roles, services) can do what (actions) on which AWS resources. It is the backbone of AWS security.

**General use cases:**
- Granting specific AWS services permission to interact with each other
- Creating human users with limited permissions
- Assigning roles to EC2 instances, Lambda functions, and other services

**Why we used it in Hexa MedPlus:**
We created three IAM resources with the principle of least privilege:

| Resource | Type | What it does |
|---|---|---|
| `hexamed-s3-user` | IAM User | Dedicated user whose access keys are used by `document-service` to upload/download patient documents from S3 |
| `hexamed-s3-policy` | IAM Policy | Grants `hexamed-s3-user` read/write access to both S3 buckets only |
| `hexamed-ec2-role` | IAM Role | Grants the EC2 instance permission to read secrets from SSM Parameter Store and write logs to CloudWatch — no static credentials on the server |

Using a dedicated IAM role on EC2 (instead of hardcoded credentials) means the EC2 instance automatically gets temporary rotating credentials from the instance metadata service — far more secure than a `.env` file with static keys.

**Cost:** IAM is **completely free** — no charges for users, roles, or policies.

---

### 6. AWS Systems Manager — Parameter Store

**What it is:**
SSM Parameter Store provides secure, hierarchical storage for configuration data and secrets. `SecureString` parameters are encrypted at rest using AWS KMS. Applications running on EC2 can fetch parameters using the AWS SDK without needing hardcoded credentials.

**General use cases:**
- Storing database passwords, API keys, and connection strings securely
- Centralised configuration management across multiple servers and environments
- Replacing `.env` files with a managed, auditable secret store

**Why we used it in Hexa MedPlus:**
Instead of storing secrets (database passwords, JWT secrets, API keys) in a `.env` file that could be accidentally committed or leaked, we store all 7 secrets in Parameter Store as `SecureString` values.

At deployment time, `scripts/aws/fetch-env-from-ssm.sh` fetches all secrets from Parameter Store and writes a `.env` file on the EC2 instance — the secrets never exist in the repo or any configuration file.

**Parameters stored:**
```
/hexamed/postgres-password   → PostgreSQL database password
/hexamed/jwt-secret          → JWT token signing secret
/hexamed/nvidia-nim-api-key  → NVIDIA NIM API key for LLM inference
/hexamed/s3-access-key       → IAM user access key for S3
/hexamed/s3-secret-key       → IAM user secret key for S3
/hexamed/s3-documents-bucket → S3 bucket name for documents
/hexamed/cors-extra-origin   → CloudFront URL for CORS allow-list
```

**Cost:**
- Standard parameters (up to 10,000): **FREE**
- API calls (up to 40 req/sec): **FREE** at our scale
- KMS encryption (AWS-managed key): **FREE**

---

### 7. Amazon EBS (Elastic Block Store)

**What it is:**
EBS provides persistent block storage volumes for EC2 instances. Unlike the EC2 instance's ephemeral storage, EBS data survives instance stop/start cycles.

**General use cases:**
- OS disk for EC2 instances
- Database storage (PostgreSQL data directory)
- Storing application files and Docker images

**Why we used it in Hexa MedPlus:**
The 30 GB EBS volume attached to `hexamed-backend-server` stores:
- Amazon Linux 2023 OS
- Docker engine and all 7 pulled container images (~15 GB total)
- PostgreSQL data (`postgres_data` Docker volume)
- The cloned repository

We expanded from the default 8 GB to 30 GB using EBS Modify Volume (AWS Free Tier includes up to 30 GB EBS).

**Cost:**
- gp2 SSD, first 30 GB: **FREE** (12 months Free Tier)
- After Free Tier: ~$0.10/GB/month = $3.00/month for 30 GB

---

### 8. Amazon VPC Security Groups

**What it is:**
Security Groups act as virtual firewalls for EC2 instances and load balancers. They control inbound and outbound traffic at the instance level using allow rules (there is no deny — everything not explicitly allowed is blocked).

**General use cases:**
- Restricting which IP ranges and ports can reach an EC2 instance
- Allowing only an ALB to reach backend EC2 instances
- Creating network boundaries between tiers (web, app, database)

**Why we used it in Hexa MedPlus:**
We created two security groups forming a two-tier security boundary:

**`hexamed-alb-sg`** (ALB Firewall):
- Allows: HTTP port 80 from internet (`0.0.0.0/0`)
- Allows: All outbound traffic

**`hexamed-ec2-sg`** (EC2 Firewall):
- Allows: TCP port 8080 from internet (`0.0.0.0/0`) — API Gateway
- Allows: SSH port 22 from internet (for EC2 Instance Connect)
- Allows: All outbound traffic

**Cost:** Security Groups are **completely free**.

---

## Cost Analysis

### Per-Day Cost (Demo / Designathon)

| AWS Service | Resource | Cost/Day |
|---|---|---|
| EC2 | `t3.large` running 24/7 | ~$2.23 |
| ALB | `hexamed-alb` | ~$0.60 |
| EBS | 30 GB gp2 | ~$0.004 |
| S3 | Frontend + Documents (< 1 GB) | ~$0.00 |
| CloudFront | Low request volume | ~$0.00 |
| SSM Parameter Store | Standard tier, < 10 params | **$0.00** |
| IAM | Users, roles, policies | **$0.00** |
| Security Groups | VPC resources | **$0.00** |
| **Total (running)** | | **~$2.83/day** |
| **Total (EC2 stopped)** | | **~$0.004/day** |

### Cost Per Patient (Designathon Demo Scale)

Assuming 50 patients across 1 hospital:
- Daily infra cost: **~$2.83**
- Cost per patient per day: **~$0.057** (less than 6 paise)
- Cost per patient per month: **~$1.70**

### Cost For 1 Hospital — 50 Users (Production Scale)

For a real hospital with 50 staff users (physicians, coders, admins) and ~500 active patients:

| Scenario | Monthly Cost Estimate |
|---|---|
| EC2 `t3.large` (single instance) | ~$67 |
| ALB | ~$18 |
| S3 (50 GB documents) | ~$1.15 |
| CloudFront (50 GB transfer) | ~$0.43 |
| SSM Parameter Store | $0.00 |
| EBS 30 GB | ~$3.00 |
| Data transfer | ~$1.00 |
| **Total/month (50 users)** | **~$90/month** |
| **Per user/month** | **~$1.80/user/month** |
| **Per patient/month** | **~$0.18/patient/month** |

> For comparison: Epic Systems (large hospital EHR) costs $1,200–$1,500 per user per year ($100–$125/user/month). Hexa MedPlus runs at **1.8% of that cost** on AWS.

---

## Security Architecture

```
Internet Users
      │
      ▼ HTTPS only
CloudFront (WAF-enabled, DDoS protection)
      │
      │ HTTP (internal AWS network — encrypted by default)
      ▼
ALB (hexamed-alb-sg: port 80 only)
      │
      │ HTTP:8080 (private VPC network)
      ▼
EC2 (hexamed-ec2-sg: port 8080 from ALB, 22 for SSH)
      │
      ├── Secrets: pulled from SSM Parameter Store at startup
      ├── Documents: stored in private S3 bucket (no public access)
      └── Logs: IAM role grants CloudWatch write access
```

**Security layers:**
1. **CloudFront** — HTTPS termination, edge-level DDoS protection
2. **Security Groups** — two-tier firewall (ALB SG → EC2 SG)
3. **IAM Role** — EC2 gets temporary rotating credentials, no static keys on server
4. **SSM Parameter Store** — secrets never in code or config files
5. **Private S3 bucket** — patient documents are never publicly accessible
6. **Application-level RBAC** — Physician / Coder / Admin role enforcement

---

## Infrastructure as Architecture Decision

### Why NOT use managed AWS services (RDS, MSK, ElastiCache)?

| Managed Service | Monthly Cost | Our Approach | Monthly Cost |
|---|---|---|---|
| Amazon RDS (db.t3.micro) | ~$15–25 | PostgreSQL on EC2 | $0 (included in EC2) |
| Amazon MSK (kafka.t3.small) | ~$75–100 | Kafka on EC2 | $0 (included in EC2) |
| Amazon ElastiCache (cache.t3.micro) | ~$15–20 | Redis on EC2 | $0 (included in EC2) |
| **Total managed** | **~$105–145/month extra** | **Total self-hosted** | **$0 extra** |

For a designathon demo and early-stage hospital deployment, self-hosting on EC2 saves $105–145/month with **zero application code changes**. The Docker Compose architecture makes it trivial to migrate to managed services later if the scale demands it.

---

## Live Application

| Item | Value |
|---|---|
| CloudFront URL | `https://d3d57se6ouh48a.cloudfront.net` |
| AWS Region | `ap-south-1` (Asia Pacific — Mumbai) |
| Backend Health | `GET /actuator/health` → `{"status":"UP"}` |
| Physician Login | `ms@hospital.com` / `password123` |
| Coder Login | `coder@hospital.com` / `password123` |
| Admin Login | `admin@hospital.com` / `password123` |
