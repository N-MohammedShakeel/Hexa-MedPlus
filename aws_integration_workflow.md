# Hexa MedPlus: AWS Cloud Integration Workflow & Architecture

**Goal**: Migrate the standalone Docker Compose architecture to scalable, cost-optimized AWS Cloud services to prepare for the GenAI Designathon, keeping costs minimum as per the hackathon brochure.

## 1. Migration Strategy

To keep costs low while ensuring the architecture is highly scalable and realistic for a HealthTech application, we will adopt a hybrid managed-services approach:

1.  **Frontend (React App)**: Migrate to **AWS S3** for static web hosting, distributed globally via **Amazon CloudFront** (CDN). This is virtually free for low traffic.
2.  **Backend Services (Spring Boot & Python)**: Deploy as containerized microservices on a single, cost-optimized **Amazon EC2** instance (e.g., `t3.medium`) or **AWS ECS** (Fargate) if auto-scaling is needed.
3.  **Database (PostgreSQL + pgvector)**: Migrate from the local Docker container to **Amazon RDS for PostgreSQL**.
4.  **Message Queue (Kafka)**: Run Kafka alongside the backend services on EC2 to avoid the high costs of Amazon MSK, or use a lightweight managed service if budget permits.
5.  **Document Storage (MinIO)**: Replace MinIO with native **Amazon S3** buckets for storing PDFs and images.
6.  **AI Engine API**: Continue routing outbound calls to the external NVIDIA NIM API / Qwen 2.5 via the VPC Endpoint or NAT.

---

## 2. Target AWS Architecture Diagram

```text
                                         +----------------------+
                                         |   Doctors / Users    |
                                         +----------+-----------+
                                                    |
                                                 HTTPS
                                                    |
                                                    v

==========================================================================================
                               AWS CLOUD (Amazon VPC)
==========================================================================================

┌────────────────────────────────────────────────────────────────────────────────────────┐
│ PUBLIC SUBNET (Cost Optimized - No NAT Gateway)                                        │
│                                                                                        │
│  +-------------------+         - - - Fetch Static - - ->   +----------------------+    │
│  | CloudFront (CDN)  |------------------------------------>|   S3 (React Build)   |    │
│  +---------+---------+                                     +----------------------+    │
│            |                                                                           │
│            | /api/*                                                                    │
│            v                                                                           │
│  +----------------------------+                                                        │
│  | Application Load Balancer  |                                                        │
│  +-------------+--------------+                                                        │
│                | Forward                                                               │
│                v                                                                       │
│      ┌──────────────────────────────────────────────────────────────────────────┐      │
│      │ EC2 t3.medium (Docker Compose Network)                                   │      │
│      │                                                                          │      │
│      │  +-------------+                                                         │      │
│      │  | API Gateway |                                                         │      │
│      │  +------+------+                                                         │      │
│      │         |                                                                │      │
│      │         |---------------- /patients ----------------->+----------------+ │      │
│      │         |                                             | Clinical Svc   | │      │
│      │         |                                             +-------+--------+ │      │
│      │         |                                                     |          │      │
│      │         |                                        note.created |          │      │
│      │         |                                                     v          │      │
│      │         |                                             +----------------+ │      │
│      │         |                                             |     Kafka      | │      │
│      │         |                                             +-------+--------+ │      │
│      │         |                                                     | consume  │      │
│      │         |                                                     |          │      │
│      │         |---------------- /documents ------------->+----------+--------+ │      │
│      │         |                                          | Document Service  | │      │
│      │         |                                          +----------+--------+ │      │
│      │         |                                                     |          │      │
│      │         |                                     document.parsed |          │      │
│      │         |                                                     v          │      │
│      │         |---------------- /ai/* ----------------->+--------------------+ │      │
│      │                                                   |     AI Engine      | │      │
│      │                                                   +----+----------+----+ │      │
│      │                                                        |          |      │      │
│      │                                                  cache |          |      │      │
│      │                                                        v raw text v      │      │
│      │                                                    +---+---+  +---+---+  │      │
│      │                                                    | Redis |  |PHI Red|  │      │
│      │                                                    +-------+  +---+---+  │      │
│      │                                                                   |      │      │
│      └───────────────────────────────────────────────────────────────────┼──────┘      │
│                                                                          | masked text │
└──────────────────────────────────────────────────────────────────────────┼─────────────┘
                                                                           |
                                                                           v
┌──────────────────────────────────────────────────────────────────────────┼─────────────┐
│ PRIVATE SUBNET (Data Tier - No Internet Access)                          |             │
│                                                                          |             │
│  +---------------------------+         +-----------------------+         |             │
│  | RDS PostgreSQL + pgvector |         |   S3 (Docs / PDFs)    |         |             │
│  +-------------+-------------+         +-----------+-----------+         |             │
│                ^                                   ^                     |             │
│                | CRUD Patients/Notes               | Upload PDFs         |             │
│                |                                   |                     |             │
│         Clinical Service                    Document Service             |             │
│                                                                          |             │
│                                                                   +------+------+      │
│                                                                   | VPC Endpoint|      │
│                                                                   +------+------+      │
│                                                                          |             │
└──────────────────────────────────────────────────────────────────────────┼─────────────┘
                                                                           | Send Masked
                                                                           v
                                                            +--------------+-----------------+
                                                            |    External AI API             |
                                                            |   (NVIDIA NIM / Qwen Ngrok)    |
                                                            +--------------+-----------------+
```

---

## 3. Deployment Steps (Cost-Optimized)

1.  **IAM & Networking**: Setup a VPC with Public and Private subnets. Ensure IAM roles allow EC2 to read/write to S3.
2.  **S3 / CloudFront**: Build the React application (`npm run build`) and upload to an S3 bucket configured for static web hosting. Attach CloudFront for caching and HTTPS.
3.  **Database Setup**: Provision an RDS PostgreSQL instance (db.t3.micro for free tier/low cost) and enable the `pgvector` extension.
4.  **Backend Deployment**: Launch a single EC2 instance (t3.medium). Install Docker. Modify `docker-compose.yml` to remove the frontend and MinIO/DB dependencies, pointing the Spring Boot and Python services to the RDS instance and native AWS S3.
5.  **DNS & Routing**: Update Route53/API Gateway so the Frontend communicates with the EC2 Backend securely.
