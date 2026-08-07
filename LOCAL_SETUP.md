# Running Hexa MedPlus Locally

This is the exact sequence for running the full stack on your machine: infra in
Docker, all four application services running natively (hot-reload friendly).

## Prerequisites

- Docker Desktop
- JDK 21 + Maven (each Java service ships its own `mvnw` wrapper, so a system
  Maven install isn't required)
- Node.js 18+
- A Python env named `ai` with `ai-service/requirements.txt` installed
  (`conda create -n ai python=3.11 && conda activate ai && pip install -r ai-service/requirements.txt`)
- A `.env` file in the repo root (copy `.env.example` and fill in real values —
  NVIDIA NIM key, Gemini key, etc. Never commit this file; it's already
  gitignored)

## 1. Start infrastructure

From the repo root:

```
docker compose -f docker-compose.infra.yml up -d
```

This starts four containers, all on one shared Postgres/Kafka/MinIO/Redis instance
that every service below connects to:

| Service  | Container port | Host port |
|----------|-----------------|-----------|
| Postgres (pgvector) | 5432 | **5433** |
| Redis    | 6379 | 6379 |
| MinIO API / Console | 9000 / 9001 | 9000 / 9001 |
| Kafka    | 9092 | 9092 |

First start auto-runs `scripts/init-db.sql` (enables the `vector` extension).
Table creation is handled by each service on its own first connection
(Spring `ddl-auto: update`, SQLAlchemy `create_all`) — no manual schema step.

Confirm all four are healthy:

```
docker ps
```

## 2. Start the application services

Run each of these in its own terminal, in this order (Kafka/Postgres need to be
up first; the frontend needs the API Gateway up to avoid a login redirect loop).

**Clinical Service** (port 8081) — from `clinical-service/`:
```
mvn spring-boot:run "-Dspring-boot.run.profiles=local"
```

**Document Service** (port 8082) — from `document-service/`:
```
mvn spring-boot:run "-Dspring-boot.run.profiles=local"
```

**AI Service** (port 8083) — from `ai-service/`:
```
conda activate ai
uvicorn main:app --host 0.0.0.0 --port 8083 --reload
```

**API Gateway** (port 8080) — from `api-gateway/`:
```
mvn spring-boot:run "-Dspring-boot.run.profiles=local"
```
> Not in your usual four commands, but nothing routes through `/api/*` without
> it — the frontend talks to the gateway, not directly to the other three.

**Frontend** (port 5173) — from `frontend/`:
```
npm run dev
```

## 3. Verify everything is actually up

```
curl http://localhost:8081/actuator/health   # clinical-service
curl http://localhost:8082/actuator/health   # document-service
curl http://localhost:8083/health            # ai-service
curl http://localhost:8080/actuator/health   # api-gateway
```

Each should return `{"status":"UP"}` (or similar). Then open
`http://localhost:5173`.

## 4. Log in

There's no self-registration — auth is a small hardcoded mock-user table in
`api-gateway`'s `AuthController` (simulating what would be Keycloak/SSO in a
real deployment). Use one of:

| Email | Password | Role |
|---|---|---|
| `ms@hospital.com` | `ms1234` | Physician |
| `coder@hospital.com` | `password123` | Medical Coder |
| `admin@hospital.com` | `password123` | Admin |

## Troubleshooting

- **Java service can't reach Postgres**: confirm `docker ps` shows
  `hexamed_postgres` healthy on `5433`, and that
  `document-service`/`clinical-service`'s `application-local.yml` still points
  at `jdbc:postgresql://localhost:5433/hexamed_db` — this used to point at a
  separate, manually-installed native Postgres on port 5432; that dependency
  has been removed, everything now shares the one Docker container.
- **Port already in use** (5433 / 9092 / 9000 / 6379): something else on your
  machine (often a native Postgres/Kafka/Redis install) is already bound to
  that port. `docker compose -f docker-compose.infra.yml down` then check
  `netstat -ano | findstr <port>` (PowerShell) to find the conflicting process.
- **ai-service can't find NVIDIA/Gemini keys**: it reads `../.env` relative to
  its own working directory — run `uvicorn` from inside `ai-service/`, not the
  repo root.
- **Frontend shows a 401 redirect loop**: the API Gateway isn't running, or
  your JWT expired — log out (clears `localStorage`) and log back in.
- **Documents you uploaded from a previous session are missing**: check you
  didn't accidentally start a second, unrelated Postgres — there's exactly one
  database now (`hexamed_db` inside `hexamed_postgres`, port 5433).
