# AWS Deployment Runbook (Designathon Demo, $50 Budget)

This adapts `aws_integration_workflow.md`'s architecture (CloudFront + S3 for
the frontend, an ALB in front of EC2, EC2 for the microservices) with **one
change**: Postgres runs as the same `pgvector/pgvector:pg16` container already
used locally, on the EC2 instance itself, instead of RDS. RDS was the most
expensive single piece *and* the hardest to fully stop between rehearsals
(minimum allocated storage keeps billing, and AWS auto-restarts a stopped RDS
instance after 7 days). A container costs nothing beyond the EC2 instance it
rides on, and stopping that instance stops the meter completely.

Kafka, Redis, and all four application services also run as containers on
that one EC2 instance — this is exactly `docker-compose.aws.yml` (root of the
repo), which is `docker-compose.yml` minus the `frontend`/`minio` containers
(replaced by S3/CloudFront and real S3, respectively).

## Cost estimate (ap-south-1, on-demand, approximate — verify in the AWS
Pricing Calculator before committing; these are the numbers behind the "is
this cost-effective" review)

| Component | Rate | Cost if running 24/7 for a day |
|---|---|---|
| EC2 `t3.medium` | ~$0.05/hr | ~$1.20 |
| Application Load Balancer | ~$0.025/hr + LCU (negligible at demo traffic) | ~$0.60 |
| S3 (frontend build + a handful of documents) | pennies | <$0.05 |
| CloudFront (low request volume) | pennies, likely inside free tier | <$0.05 |
| SSM Parameter Store (Standard tier, <10k params) | **free**, no request-rate cost at this scale | $0 |
| CloudWatch Logs (4 small containers, a few days) | $0.50/GB ingested + $0.03/GB stored, likely inside free tier | <$0.10 |
| Data transfer out | a few cents for a demo audience | <$0.10 |
| **Total while running** | | **~$2/day** |
| **While the EC2 instance is stopped** | | **~$0** (only EBS storage, ~$0.003/day for 20GB) |

$50 comfortably covers a rehearsal day + demo day + buffer even leaving
everything running continuously for **2–3 weeks**. The actual risk to the
budget isn't the architecture, it's forgetting to stop the instance/delete the
ALB afterward — see **Teardown** at the end, do it every time you're done for
the day, not just after the final demo.

**What Gemini's original doc got right**: correctly skipped a NAT Gateway
(would have been the single biggest recurring cost) and MSK (Kafka self-hosted
on EC2 is the right call at this scale). A later review also recommended
adding **SSM Parameter Store** (for secrets) and **CloudWatch Logs** (for
monitoring) on top of the CloudFront/S3/ALB/EC2 shape — both are genuinely
free or near-free at this scale (see cost table above) and require zero
application code changes, so both are folded into this runbook (steps 2, 6,
and the new step 9).

**Two real gaps it left unstated**, both handled explicitly below:
1. It never says *how* the CloudFront → ALB `/api/*` routing actually gets
   configured (it's not automatic — needs an explicit CloudFront cache
   behavior). Without it, the deployed frontend's relative `/api/...` calls
   resolve back to the S3 origin and 404 silently.
2. It didn't mention that `document-service`'s storage layer talks to MinIO's
   Java SDK, not the AWS SDK — the good news being that SDK is S3-API
   compatible, so pointing it at a real S3 endpoint with an IAM user's keys is
   a **config change, not a code change** (see step 6).

---

## 0. One-time build check

Before touching AWS, confirm the images actually build (this is what the EC2
instance will run):

```
docker compose -f docker-compose.aws.yml config    # validates the compose file
docker compose -f docker-compose.aws.yml build      # builds all 4 app images locally
```

## 1. VPC & networking

Keep it simple for a demo — one public subnet is enough (no private subnet /
NAT needed since there's no RDS to hide anymore):

- Use the account's default VPC, or create one with a single public subnet.
- Security group `hexamed-ec2-sg`: inbound `8080/tcp` from the ALB's security
  group only (not `0.0.0.0/0`), `22/tcp` from your own IP for SSH.
- Security group `hexamed-alb-sg`: inbound `80/tcp` (and `443` if you attach a
  cert) from `0.0.0.0/0`.

## 2. Launch the EC2 instance

- AMI: Amazon Linux 2023, instance type **`t3.medium`** (2 vCPU / 4GB).
  `ai-service` pulls in `sentence-transformers` (transitively PyTorch) for
  embeddings/NER — if you see it getting OOM-killed under load, resize to
  `t3.large` (8GB); start at `t3.medium` for cost, it's a one-click resize
  later.
- Attach `hexamed-ec2-sg`.
- Attach an IAM **instance role** with `AmazonSSMManagedInstanceCore` (for
  Session Manager access instead of opening SSH broadly) — S3 access is
  handled separately in step 6 via its own scoped IAM user, not this role,
  because the MinIO SDK needs literal access keys rather than the instance
  role's credential chain.
- Also attach a custom inline policy `hexamed-ec2-ssm-logs` so the instance can
  read its own secrets from SSM (step 6) and ship container logs to CloudWatch
  (step 9), both scoped to just this app's namespace:
  ```json
  {
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": ["ssm:GetParameter", "ssm:GetParameters", "ssm:GetParametersByPath"],
        "Resource": "arn:aws:ssm:ap-south-1:<account-id>:parameter/hexamed/*"
      },
      {
        "Effect": "Allow",
        "Action": ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents", "logs:DescribeLogStreams"],
        "Resource": "arn:aws:logs:ap-south-1:<account-id>:log-group:/hexamed/*"
      }
    ]
  }
  ```
- Allocate + associate an Elastic IP so the address is stable across
  stop/start (an unattached EIP has a small hourly charge — release it in
  teardown too).

On the instance:
```
sudo yum install -y docker git
sudo systemctl enable --now docker
sudo usermod -aG docker ec2-user   # re-login after this
git clone <your-repo-url> hexamedplus && cd hexamedplus
```

Install Docker Compose v2 plugin if not already bundled with your Docker
version (`docker compose version` to check):
```
sudo mkdir -p /usr/libexec/docker/cli-plugins
sudo curl -SL https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64 \
  -o /usr/libexec/docker/cli-plugins/docker-compose
sudo chmod +x /usr/libexec/docker/cli-plugins/docker-compose
```

## 3. S3 buckets

Two buckets, both in `ap-south-1`:

- `hexamedplus-frontend-<your-suffix>` — static website hosting, public read
  (or private + CloudFront Origin Access Control, preferred).
- `hexamedplus-documents-<your-suffix>` — private, no public access. This
  replaces the MinIO bucket.

## 4. IAM user for document storage

Create a dedicated IAM user (not the broad account keys currently sitting in
`.env`) scoped to just the documents bucket:

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": ["s3:GetObject", "s3:PutObject", "s3:DeleteObject", "s3:ListBucket"],
    "Resource": [
      "arn:aws:s3:::hexamedplus-documents-<your-suffix>",
      "arn:aws:s3:::hexamedplus-documents-<your-suffix>/*"
    ]
  }]
}
```
Generate an access key pair for this user — these become `S3_ACCESS_KEY` /
`S3_SECRET_KEY` below. If you want to go further after the demo, replacing
`StorageService.java`'s MinIO client with the AWS SDK's `S3Client` would let
this run on the instance role instead of static keys — not required to ship
the demo, worth doing before this goes anywhere near real patient data.

## 5. ALB

- Target group `hexamed-tg`: target type "Instance", port `8080`, health
  check path `/actuator/health` (api-gateway already has
  `spring-boot-starter-actuator` — this endpoint exists with zero extra code).
  Register the EC2 instance.
- ALB `hexamed-alb`: internet-facing, in the public subnet(s), listener on
  `80` forwarding to `hexamed-tg`. Note its DNS name — that's the CloudFront
  origin in the next step.

## 6. Secrets in SSM Parameter Store, then the environment file

Instead of hand-typing secrets into a `.env` on the instance (easy to forget
about, easy to accidentally commit), they live in **SSM Parameter Store** as
`SecureString`s and get pulled down at deploy time. Standard parameters are
free with no request-rate cost at this scale, encrypted with the AWS-managed
default KMS key (also free) — there's no reason not to do this over a plain
file for a $0 cost difference.

**6a. Put the secrets in SSM** (run once, from your own machine with your AWS
CLI credentials — not from the EC2 instance):
```
aws ssm put-parameter --name /hexamed/postgres-password --type SecureString --value "<fresh password for this instance>"
aws ssm put-parameter --name /hexamed/jwt-secret         --type SecureString --value "<fresh 32+ char secret>"
aws ssm put-parameter --name /hexamed/gemini-api-key     --type SecureString --value "<same key as local, or a separate one>"
aws ssm put-parameter --name /hexamed/nvidia-nim-api-key --type SecureString --value "<same>"
aws ssm put-parameter --name /hexamed/custom-llm-base-url --type SecureString --value "<same>"
aws ssm put-parameter --name /hexamed/tavily-api-key     --type SecureString --value "<same>"
aws ssm put-parameter --name /hexamed/s3-access-key      --type SecureString --value "<the IAM user's access key from step 4>"
aws ssm put-parameter --name /hexamed/s3-secret-key      --type SecureString --value "<the IAM user's secret key from step 4>"
aws ssm put-parameter --name /hexamed/s3-documents-bucket --type SecureString --value "hexamedplus-documents-<your-suffix>"
aws ssm put-parameter --name /hexamed/cors-extra-origin  --type SecureString --value "<the CloudFront domain from step 7, e.g. https://d1234abcd.cloudfront.net>"
```
Do **not** reuse the account-wide keys from your local `.env` — these are
fresh values for this instance, matching the point of a dedicated IAM user
in step 4.

**6b. Generate `.env` on the EC2 instance from SSM** (repo root, every time
you deploy or redeploy — the instance role's `ssm:GetParameter*` permission
from step 2 is what makes this work with zero credentials on the box):
```
chmod +x scripts/aws/fetch-env-from-ssm.sh
./scripts/aws/fetch-env-from-ssm.sh
```
This writes a `.env` with the same shape docker-compose expects — nothing
downstream changes, only where the secret values come from.

## 7. Build the frontend and deploy it to S3 + CloudFront

Locally (or on the EC2 instance):
```
cd frontend
npm install
npm run build
aws s3 sync dist/ s3://hexamedplus-frontend-<your-suffix>/ --delete
```

CloudFront distribution:
- **Origin 1**: the frontend S3 bucket (via Origin Access Control, not the
  public website endpoint).
- **Origin 2**: the ALB's DNS name from step 5, protocol HTTP (or HTTPS if you
  attach a cert to the ALB), origin path empty.
- **Default behavior**: Origin 1, redirect HTTP→HTTPS, caching enabled.
- **Extra behavior, path pattern `/api/*`**: Origin 2, **cache disabled**
  (`CachingDisabled` managed policy), forward all headers/cookies/query
  strings, allowed methods GET/HEAD/OPTIONS/PUT/POST/PATCH/DELETE. **This is
  the behavior Gemini's doc showed in the diagram but never actually
  specified — without it the frontend's `/api/...` calls fall through to
  Origin 1 (S3) and 404.**
- Note the distribution's domain name (`https://dXXXXXXXX.cloudfront.net`) —
  update the `cors-extra-origin` SSM parameter from step 6a with it, then
  re-run `./scripts/aws/fetch-env-from-ssm.sh` (step 6b) before starting the
  backend, so the browser isn't blocked by CORS calling the ALB:
  ```
  aws ssm put-parameter --name /hexamed/cors-extra-origin --type SecureString --overwrite --value "https://dXXXXXXXX.cloudfront.net"
  ```

## 8. Start the backend

On the EC2 instance, repo root:
```
docker compose -f docker-compose.aws.yml up -d --build
docker compose -f docker-compose.aws.yml ps       # all should be Up/healthy
```

## 9. Container logs → CloudWatch

`docker-compose.aws.yml`'s 4 application services already use the `awslogs`
logging driver (log groups auto-created on first log line, given the instance
role's `logs:CreateLogGroup` permission from step 2) — there's nothing extra
to deploy. One consequence: `docker compose logs <service>` on the instance
won't show anything for these 4 anymore, since their output goes straight to
CloudWatch instead of the local json-file driver. View them instead with:
```
aws logs tail /hexamed/ai-service --follow          # or clinical-service / document-service / api-gateway
```
or in the console under **CloudWatch → Log groups → /hexamed/\***. This is
what actually lets you debug a failed demo run after the fact instead of
losing the logs the moment a container restarts or the instance stops.

## 10. Smoke test

```
curl http://<ALB-DNS-name>/actuator/health
```
Then open the CloudFront URL in a browser, log in with one of the mock users
from `LOCAL_SETUP.md`, and upload a test document to confirm S3 + Kafka + the
AI pipeline are all actually wired end to end, not just "containers are up."

## Teardown (do this after every session, not just the final one)

1. `docker compose -f docker-compose.aws.yml down` on the instance (or just
   stop the EC2 instance — either way, the meter for compute stops).
2. Stop (don't necessarily terminate, if you'll redeploy tomorrow) the EC2
   instance.
3. Delete the ALB and its target group — these bill continuously while they
   exist, running or not.
4. Disable (and eventually delete) the CloudFront distribution.
5. If you're fully done with the demo: terminate the EC2 instance, release the
   Elastic IP, empty and delete both S3 buckets, delete the IAM user + policy
   from step 4, delete the SSM parameters (`aws ssm delete-parameters --names
   $(aws ssm get-parameters-by-path --path /hexamed --query 'Parameters[].Name' --output text)`),
   and delete the `/hexamed/*` CloudWatch log groups — none of these bill
   meaningfully while sitting idle, but tidy is free.
