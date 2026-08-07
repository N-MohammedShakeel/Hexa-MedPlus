# Hexa MedPlus — AWS Services Pause & Restart Runbook

This runbook provides exact step-by-step instructions to **STOP** services (pausing compute billing down to ~$0.10/day for EBS storage) and **RESTART** them in under 3 minutes before presenting your demo.

---

## 💰 Idle Cost Comparison

| State | What is Running | Cost per Day |
|---|---|---|
| **Active Demo** | EC2 `t3.large` ON + ALB + EBS + CloudFront + S3 | **~$2.83 / day** (~$0.12/hr) |
| **Paused (between demos)** | EC2 OFF + ALB Deleted + EBS 30GB Retained | **~$0.10 / day** (~₹8/day) |

---

# 🛑 PART 1: How to STOP All Services & Pause Billing

### Step 1: Stop Containers on EC2 (30 Seconds)
In your EC2 browser terminal, run:
```bash
cd hexamedplus
sudo docker compose -f docker-compose.aws.yml down
```

### Step 2: Stop EC2 Server (30 Seconds)
1. Open **EC2 Console** → Click **Instances**.
2. Select **`hexamed-backend-server`**.
3. Click **Instance state** → Click **Stop instance**.

### Step 3: Delete Load Balancer (ALB) to Stop Hourly Fees (30 Seconds)
1. In EC2 Console → Left menu: **Load Balancers**.
2. Select **`hexamed-alb`** → Click **Actions** → **Delete load balancer**.
3. Left menu: **Target Groups** → Select **`hexamed-tg-new`** → Click **Actions** → **Delete**.

*(Your billing is now paused at only ~$0.10/day for EBS disk storage).*

---

# 🚀 PART 2: How to RESTART All Services for Demo

When you are ready to present your demo, follow these steps to bring everything back online in under 3 minutes:

### Step 1: Start the EC2 Server (30 Seconds)
1. Open **EC2 Console** → Click **Instances**.
2. Select **`hexamed-backend-server`** → **Instance state** → **Start instance**.
3. Wait ~30 seconds for Instance State to turn green (**`Running`**).

---

### Step 2: Re-create Target Group & ALB (60 Seconds)

#### **Create Target Group**:
1. EC2 Console → Left menu: **Target Groups** → **Create target group**.
2. Type: **Instances** | Name: `hexamed-tg-new` | Port: **`8080`** | Health check path: `/actuator/health`.
3. Click **Next** → Select **`hexamed-backend-server`** (Port `8080`) → Click **Include as pending below** → **Create target group**.

#### **Create Load Balancer**:
1. Left menu: **Load Balancers** → **Create load balancer** → **Application Load Balancer**.
2. Name: `hexamed-alb` | Scheme: **Internet-facing** | AZs: Select `ap-south-1a` & `ap-south-1b`.
3. Security group: Select **`hexamed-alb-sg`**.
4. Listener: HTTP:80 → Forward to **`hexamed-tg-new`**.
5. Click **Create load balancer**.

---

### Step 3: Re-link ALB in CloudFront (30 Seconds)
1. Open **CloudFront Console** → Click **`hexamedplus-cdn`** → **Origins** tab.
2. Select ALB origin → Click **Edit**.
3. Origin Domain: Select your new `hexamed-alb` DNS name | Protocol: **HTTP only**.
4. Click **Save changes**.

---

### Step 4: Launch Backend Containers (30 Seconds)
1. EC2 Console → Select **`hexamed-backend-server`** → Click **Connect** → **EC2 Instance Connect**.
2. Run these commands:

```bash
cd hexamedplus
./scripts/aws/fetch-env-from-ssm.sh
sudo docker compose -f docker-compose.aws.yml up -d
```

3. Verify status:
```bash
curl -i http://localhost:8080/actuator/health
```
*(Outputs `HTTP/1.1 200 OK {"status":"UP"}`)*

---

### Step 5: Open Your Live Demo Application
Open your browser and navigate to:

👉 **`https://d3d57se6ouh48a.cloudfront.net`**

Log in with:
- **Physician**: `ms@hospital.com` / `password123`
- **Coder**: `coder@hospital.com` / `password123`
- **Admin**: `admin@hospital.com` / `password123`
