# Hexa MedPlus — Project Reference

This document has two parts. **Part A** is the original designathon pitch
summary (problem statement, solution pitch, architecture diagram, tech
stack) — kept as-is for submission/pitch-deck purposes. **Part B** is a full
technical reference covering what's actually implemented today: features,
workflows, the RAG/AI setup in detail, who can do what, what it costs to run,
and honest answers to the questions that come up when explaining this
project to someone else (a teammate, a judge, a hospital IT lead).

**A note on precision (Part B)**: everything about the *code* below
(features, files, architecture, models used) is verified against the actual
repository, not guessed. Everything about *cost and latency* is a reasoned
estimate with stated assumptions, not a measured benchmark — this app has no
APM/production traffic yet to measure from. Where a number is an estimate,
it's labeled as one. Treat dollar figures as planning inputs to verify
against the AWS Pricing Calculator and current Bedrock/NVIDIA NIM pricing
before committing a budget, not as quotes.

---

# Part A — Designathon Pitch Summary

## 1. Problem Statement
Healthcare providers spend a disproportionate amount of time on clinical documentation, parsing unstructured patient records, and determining appropriate medical codes (ICD-10/CPT) or treatment pathways. This heavy administrative burden leads to physician burnout, reduces direct patient care time, and increases the likelihood of human error in medical coding and diagnostics. Additionally, the vast amount of unstructured data trapped in physical or scanned medical documents makes it difficult for healthcare systems to query, utilize, and extract meaningful clinical insights efficiently.

## 2. Proposed Solution
**Hexa MedPlus** is an event-driven, GenAI-powered clinical workflow platform designed to automate and augment the medical documentation process with a strong emphasis on **Human-in-the-Loop (HITL)** safety and **RAG (Retrieval-Augmented Generation)** accuracy.

Our solution seamlessly ingests unstructured clinical documents (such as scanned PDFs, lab reports, or doctor's notes) and orchestrates an intelligent AI workflow using Large Language Models and Vision AI to automatically:
1. Extract and structure raw clinical text, using **Vision AI** to gracefully handle blurry or poorly scanned documents.
2. Generate comprehensive SOAP (Subjective, Objective, Assessment, Plan) notes.
3. Suggest accurate primary and secondary diagnoses backed by verifiable **RAG citations** from uploaded hospital protocols.
4. Recommend standardized ICD-10 and CPT medical codes for the billing department to review in a dedicated **Coding Workbench**.
5. Formulate personalized clinical treatment pathways.

By automating these tedious tasks, Hexa MedPlus empowers clinicians to focus entirely on patient care while ensuring high accuracy in medical billing and documentation.

## 3. Application Architecture

Our application is built on a scalable, asynchronous microservices architecture.

```mermaid
graph TD
    %% Define styles
    classDef client fill:#f9f9f9,stroke:#333,stroke-width:2px;
    classDef service fill:#d4e6f1,stroke:#2980b9,stroke-width:2px;
    classDef infra fill:#fcf3cf,stroke:#f1c40f,stroke-width:2px;
    classDef db fill:#e8daef,stroke:#8e44ad,stroke-width:2px;

    %% Client Layer
    UI[Frontend Client / React]:::client

    %% API Gateway Layer
    Gateway[API Gateway]:::service

    %% Microservices Layer
    DocService[Document Service\n(Spring Boot)]:::service
    ClinService[Clinical Service\n(Spring Boot)]:::service
    AIService[AI Engine Service\n(FastAPI / LangGraph)]:::service

    %% Infrastructure Layer
    Kafka((Apache Kafka\nMessage Broker)):::infra
    MinIO[(MinIO\nObject Storage)]:::db
    Postgres[(PostgreSQL + pgvector\nRelational & Vector DB)]:::db
    Redis[(Redis\nRate Limiting)]:::db

    %% External APIs
    LLM[LLM Provider\n(AWS Bedrock / NVIDIA NIM)]:::infra

    %% Flow connections
    UI -->|REST / SSE Streams| Gateway

    Gateway -->|Route: /api/documents| DocService
    Gateway -->|Route: /api/clinical| ClinService
    Gateway -->|Route: /api/ai| AIService

    DocService -->|Save Uploaded Files| MinIO
    DocService -->|Publish 'document.parsed' Event| Kafka

    Kafka -->|Consume 'document.parsed' Event| AIService
    AIService -->|Vectorize Guidelines & Protocols| Postgres

    ClinService -->|Save Patient/Encounter Data| Postgres

    AIService <-->|Orchestrate AI Prompts & Vision Analysis| LLM
    AIService -->|Hybrid RAG Query: Vector + Keyword + Rerank| Postgres
    Gateway <-->|Per-User Rate Limit Counters| Redis
```

## 4. Technology Stack
- **Frontend**: React / Vite, Redux Toolkit, TailwindCSS
- **API Gateway**: Spring Cloud Gateway (Routing, JWT Validation + Role Claims, Redis-backed Rate Limiting)
- **Core Microservices**: Java Spring Boot / WebFlux (Document Service, Clinical Service — both now with server-side RBAC enforcement)
- **AI Engine Service**: Python FastAPI, LangChain, LangGraph (Multi-Agent State Machine)
- **Message Broker**: Apache Kafka (Event-driven asynchronous communication)
- **Database**: PostgreSQL with `pgvector` (relational clinical data + hybrid RAG vector/keyword store)
- **Object Storage**: MinIO (S3-compatible storage for raw medical PDFs/images)
- **Rate Limiting**: Redis (per-user token-bucket limiter at the API Gateway)
- **GenAI Models**:
  - AWS Bedrock **Amazon Nova Pro** (default text + vision model)
  - NVIDIA NIM `meta/llama-3.1-8b-instruct` / `meta/llama-3.1-70b-instruct` (alternate text orchestration & structuring)
  - NVIDIA NIM `meta/llama-3.2-90b-vision-instruct` (alternate Vision OCR & blurry document recovery)
  - `nvidia/nv-embed-v1` (RAG vectorization)
  - `cross-encoder/ms-marco-MiniLM-L-6-v2` (RAG reranking, new)

## 5. GenAI Use Cases
1. **Intelligent Diagnostics with Hybrid RAG**: Utilizing LangGraph, the AI analyzes the clinical note against the hospital's uploaded clinical protocols — retrieved via a hybrid vector + keyword search with cross-encoder reranking, not vector search alone — to formulate an assessment and cite its sources directly in the UI.
2. **Automated Medical Coding (HITL)**: The AI acts as a Medical Coder, suggesting ICD-10 and CPT codes. These codes are sent to a "Coding Workbench" where human billing specialists must approve or modify them before final submission.
3. **Vision AI Document Recovery**: When blurry scanned documents are uploaded, OpenCV detects the blur and routes the document to a Vision model to recover the lost text, merging it seamlessly into the patient's record. Pages that already have good native (embedded, selectable) text skip this call entirely — a cost/latency optimization added after the initial designathon build.
4. **Proactive Drug Alerts**: As the physician types a note, the system evaluates the text in real-time, flashing amber warnings if it detects contraindications (e.g., prescribing NSAIDs to a patient on Warfarin).

## 6. UI Wireframes & Workflows (For PPT)

- **Screen 1: Dashboard Overview**
  - **Content**: Left sidebar for navigation (now role-filtered — a user only sees pages their role can use). Main area shows "Patients", "Encounters", and dynamic, real-time KPI charts powered by Recharts, including a real patient age-distribution chart (computed from actual date-of-birth data).
- **Screen 2: Encounter Workspace & AI Insights**
  - **Content**: Split-screen view. The left side holds the Physician's scratchpad for writing rough clinical notes, alongside real-time drug interaction alerts. The right side features the generated AI Insights divided into four tabs: Summary, Diagnosis, Coding, and Pathway.
- **Screen 3: AI Explainability Modal**
  - **Content**: Clicking on an AI-generated Diagnosis opens a modal showing exactly *why* the AI made that decision. It displays the AI's confidence levels and explicitly highlights the exact paragraph from the hospital's uploaded guidelines (RAG) that led to the conclusion.
- **Screen 4: The Coding Workbench (Human-in-the-Loop)**
  - **Content**: A dedicated dashboard for Medical Coders. Displays all pending patient encounters with AI-suggested ICD-10 codes. Coders can click "Approve", "Modify", or send the chart back to the physician for revision, ensuring 100% compliance.

---

# Part B — Full Technical Reference

## Table of Contents

1. [Architecture & Why This Shape](#b1-architecture--why-this-shape)
2. [User Roles & Permissions](#b2-user-roles--permissions)
3. [Features, Page by Page](#b3-features-page-by-page)
4. [Core Clinical Workflow, End to End](#b4-core-clinical-workflow-end-to-end)
5. [The AI Engine: RAG, LangGraph, Vision — In Detail](#b5-the-ai-engine-rag-langgraph-vision--in-detail)
6. [Production-Grade Features Actually Implemented](#b6-production-grade-features-actually-implemented)
7. [Known Gaps — What's Not Done Yet](#b7-known-gaps--whats-not-done-yet)
8. [Performance & Latency](#b8-performance--latency)
9. [AWS Deployment & Cost](#b9-aws-deployment--cost)
10. [FAQ](#b10-faq)

---

## B1. Architecture & Why This Shape

**Why microservices, not a monolith?** The split follows genuinely different
concerns with different scaling and technology needs. `ai-service` needs
Python's ML ecosystem (LangGraph, sentence-transformers, PyMuPDF) and is the
component most likely to need independent scaling — it's the slowest,
most resource-hungry piece (see §B8). `document-service` does CPU-bound PDF
parsing and needs its own storage lifecycle. `clinical-service` is the
transactional core (patients/encounters). Separating them means an AI
pipeline traffic spike doesn't compete for CPU with a simple "list my
patients" query, and a bug in PDF parsing can't corrupt clinical
transactions. The tradeoff, paid deliberately: more moving parts, network
calls where a monolith would have function calls, and (until this pass)
inconsistent cross-service authorization — see §B6/§B7.

**Why an API gateway in front, instead of the frontend calling each service
directly?** One place to terminate JWTs, enforce CORS, and now rate-limit —
without it, every one of the three backend services would need to
independently implement JWT validation.

**Why Kafka instead of direct HTTP calls between services for document
processing?** Document AI analysis (Vision AI OCR, especially multi-page
PDFs) can take anywhere from a few seconds to a couple of minutes. A direct
HTTP call from `document-service` to `ai-service` would mean holding a
connection open that long, on both ends, for every upload. Kafka decouples
"the file is uploaded and parsed" from "the AI got around to analyzing it" —
`document-service` publishes `document.parsed` and moves on immediately; the
frontend gets progress via a separate SSE stream and polling, not by
blocking on the same request.

**Why Postgres + pgvector for the RAG vector store, instead of a dedicated
vector DB (Pinecone, Weaviate, Qdrant)?** One fewer service to run, patch,
and pay for. At this app's scale (a single hospital's clinical protocol
library — tens to low hundreds of documents, not millions), Postgres with
the `vector` extension performs perfectly well, and reusing the database the
rest of the app already needs is simpler to operate than a second
specialized datastore. This is a deliberate scale-appropriate choice, not an
oversight — it would be worth revisiting only if the protocol library grew
into the tens of thousands of documents.

## B2. User Roles & Permissions

There are exactly **three roles** in this system today: `PHYSICIAN`,
`CODER`, `ADMIN` (defined in `api-gateway`'s `AuthController.MOCK_USERS` —
this is a prototype's hardcoded login list, not a real user-directory
service; see §B7). A stray code comment elsewhere mentions a `NURSE` role,
but it was never actually implemented anywhere.

Until this pass, **role was purely cosmetic** — every authenticated user
could call every API endpoint regardless of role, and the frontend showed
identical navigation and buttons to everyone. That's now enforced at the
backend (the real security boundary — a `RoleAuthorizationFilter` in both
`clinical-service` and `document-service` checks an `X-User-Role` header the
gateway attaches after validating the JWT) and reflected coarsely in the
frontend (route guards + nav filtering, so a role isn't shown a page where
almost nothing is clickable for them).

### Permission matrix

| Capability | PHYSICIAN | CODER | ADMIN |
|---|:---:|:---:|:---:|
| View patients, encounters, documents, protocols | ✅ | ✅ | ✅ |
| Register / edit / archive / unarchive a patient | ✅ | ❌ | ✅ |
| Create an encounter, write/edit/delete clinical notes, enter vitals | ✅ | ❌ | ❌ |
| Sign & lock an encounter | ✅ | ❌ | ❌ |
| Generate/edit AI clinical insights, apply AI diagnosis to record | ✅ | ❌ | ❌ |
| Upload/verify/delete patient documents, resolve identity mismatches | ✅ | ❌ | ❌ (delete only, for cleanup) |
| Approve an encounter for billing / request a coding revision | ✅ | ❌ | ❌ |
| Coding Workbench: approve/modify/reject/reset codes, submit for review | ❌ | ✅ | ❌ |
| Mark an encounter "Billed" | ❌ | ✅ | ❌ |
| Upload / supersede a clinical protocol (guideline) | ✅ | ❌ | ✅ |
| Delete a protocol; trigger the expiry sweep | ✅ (delete only) | ❌ | ✅ |
| Manage the (currently unused) staff user directory | ❌ | ❌ | ✅ |
| View audit trails | ❌ | ❌ | ✅ |
| Change system-wide AI model preference | ❌ | ❌ | ✅ (frontend-gated only — see caveat below) |
| Use the AI chat assistant | ✅ | ✅ | ✅ |

**Design rationale**: reads are broad by design — a coder needs to see a
patient's clinical notes to code accurately, and an admin needs enough
visibility to do system support, so hiding read access aggressively would
add friction without a real security benefit. The boundary that matters is
on *writes*, which is where the matrix above is strict. Encounter
documentation is physician-only because it's the legal medical record;
coding-workbench actions are coder-only because that's a distinct
professional function with its own audit trail; admin gets the
system/user/protocol-governance functions and explicitly *not* clinical or
coding actions, since an administrator isn't a licensed clinician or a
certified coder.

**One caveat worth flagging plainly**: `ai-service` (the AI model
preference setting, chat, RAG, vision endpoints) is **not** covered by the
new backend role enforcement — only `clinical-service` and `document-service`
are. The AI-preference "admin only" restriction above is frontend-only
(hidden from non-admins in the UI), not backend-enforced; a non-admin who
called that API directly could still change it. This wasn't an oversight so
much as a scoping decision this pass — see §B7.

**A second architectural note**: two `document-service` endpoints are
deliberately left *without* a role check — `ai-service` calls them directly,
service-to-service, bypassing the gateway (and therefore never carrying a
role header) as part of the automated document-processing pipeline. Locking
those down would 403 the AI pipeline itself. A future hardening pass would
give `ai-service` its own service credential through the gateway instead of
calling `document-service` directly; not done in this pass.

## B3. Features, Page by Page

| Page | Who | What it does |
|---|---|---|
| **Dashboard** | All | KPI tiles (active patients/encounters, pending AI reviews), today's encounters, a pending-review queue, patient age distribution + weekly admissions charts. Read-only. |
| **Patients** | All view; PHYSICIAN/ADMIN edit | Searchable patient table. Add/edit/archive a patient, export the list to CSV. |
| **Records** | All | Archived patients — search + unarchive. |
| **Documents** | All view; PHYSICIAN/ADMIN write | Upload files against a patient, track AI-processing status live (SSE), view/edit extracted text, verify AI results, resolve blurry-scan regions, confirm patient-identity matches. |
| **Clinical Protocols** | All view; PHYSICIAN/ADMIN write | The hospital's guideline library that backs RAG retrieval. Upload single or batch, supersede an existing version, delete, trigger the expiry sweep, browse version history. |
| **Encounter Workspace** | PHYSICIAN | The core per-patient clinical documentation screen. Notes/labs/imaging/vitals tabs, an AI-assistance pane (generate SOAP summary/diagnosis/codes/pathway), sign & lock, apply AI diagnosis to the record, push codes to coding. |
| **Coding Workbench** | PHYSICIAN, CODER | Coder reviews AI-suggested ICD-10/CPT codes: approve/modify/reject/add custom/submit for review. Physician reviews the coder's submission: approve for billing or request a revision with a note. |
| **Billing** | PHYSICIAN, CODER | Queue of encounters ready for or already billed. Coder marks an encounter "Billed." |
| **AI Chat** | All | Conversational assistant, scoped to General / a specific patient / a specific protocol. Advisory only — doesn't touch the medical record. |
| **Audit Trails** | ADMIN | Full system audit log (PHI access, auth, clinical events, exports), filterable, exportable to CSV. |
| **Settings** | All | Theme, AI model preference (system-wide — practically admin-relevant even though not backend-gated, see §B2), data export. Several tabs (Profile/Notifications/Security/Integrations) are UI-only placeholders with no backend endpoint yet. |

## B4. Core Clinical Workflow, End to End

1. **Patient arrives** → registered in Patients (or already on file).
2. **Encounter created** → status `IN_PROGRESS`. Physician writes notes,
   enters vitals, uploads supporting documents (lab reports, imaging,
   discharge summaries).
3. **Document processing** (async, per file): `document-service` extracts
   native text (PDFBox), stores the file, publishes `document.parsed` on
   Kafka → `ai-service` picks it up → routes to Vision AI (OCR) for
   images/scanned pages, or straight to text-structuring for
   already-text-native pages (see §B5's "native text gate") → result saved,
   status flows `AI_PROCESSING → COMPLETED` (or `BLUR_DETECTED` /
   `FAILED`). The physician verifies each result before it's trusted.
4. **AI clinical insights**: physician triggers the LangGraph pipeline
   (§B5) — PHI redaction → summary → clinical research (RAG + web search) →
   diagnosis → coding research → suggested codes → care pathway → PHI
   unmask. All of it is editable; an edit is tagged "Physician Entered."
5. **Sign & Lock**: physician signs. This is a real, server-enforced lock —
   `signedAt`/`signedBy` are set, and the notes API refuses further edits to
   any note tied to that encounter (423 Locked) — new notes are still
   allowed as **addenda**, timestamped after the signature, never edits to
   what was signed. Status → `CODING_PENDING`.
6. **Coding**: a coder works the AI-suggested codes in the Coding Workbench,
   approves/modifies/adds codes, submits for review. Status →
   `CODING_COMPLETE`.
7. **Physician review**: approve for billing (`BILLING_READY`) or request a
   revision with a note (`CODING_REVISION`, coder addresses it, resubmits,
   back to `CODING_COMPLETE`).
8. **Billing**: coder marks the encounter `BILLED`. The patient record is
   archived at this point (the encounter's episode of care is closed).

Every one of those status transitions is now validated server-side against a
legal-transition graph (`EncounterService.LEGAL_TRANSITIONS`) — before this
pass, any status could be set from any other status via one generic
endpoint, meaning a bug or a stray API call could jump an encounter straight
to `BILLED` (archiving the patient) from a freshly-created state.

## B5. The AI Engine: RAG, LangGraph, Vision — In Detail

### RAG (Retrieval-Augmented Generation)

The knowledge base is the hospital's own uploaded clinical protocols/
guidelines, plus (scoped separately) each patient's own document history.

- **Storage**: Postgres + the `vector` extension (LangChain's `PGVector`
  table, `langchain_pg_embedding`), collection `hexamed_knowledge_base`.
- **Chunking**: `RecursiveCharacterTextSplitter`, 1000 chars/chunk, 150 char
  overlap.
- **Embeddings**: NVIDIA NIM's `nvidia/nv-embed-v1`.
- **Retrieval — Hybrid search** (added this pass): a query runs through
  *both* a pgvector cosine-similarity search **and** a Postgres full-text
  (BM25-style, `tsvector`/`ts_rank_cd`) keyword search in parallel, the two
  ranked lists are combined with **Reciprocal Rank Fusion**, and the top
  candidates are then reranked by a **cross-encoder**
  (`cross-encoder/ms-marco-MiniLM-L-6-v2`) before the final top-k is handed
  to the LLM as context. Plain vector search alone (what existed before this
  pass) is good at conceptual/semantic matches but systematically
  under-ranks exact lexical matches — a specific drug name, a dosage number,
  an exact guideline code — which is exactly the kind of detail that matters
  in a clinical protocol lookup. Hybrid search catches both.
- Retrieval is scoped three ways depending on context: hospital-wide
  protocols, one specific protocol (chat "Protocol Mode"), or one patient's
  own document history.

### LangGraph clinical pipeline

A fixed 8-step sequential pipeline (`app/graph/orchestrator.py`), triggered
per encounter:

```
redact → summarize → clinical_research → diagnose → coding_research → code → recommend_pathway → unmask
```

- **redact**: PHI is stripped from the note text using a local NER model
  (GLiNER) before anything is sent to an external LLM — the LLM never sees
  patient-identifying text; **unmask** re-inserts it into the final output
  after all the AI reasoning is done.
- **summarize / diagnose / code / recommend_pathway**: LLM calls (see model
  routing below).
- **clinical_research / coding_research**: pull context from the hybrid RAG
  search above *and* a live web search (Tavily) for current external
  medical/coding guidance.

This is a **synchronous, blocking pipeline today** — the frontend's
"Generate AI Insights" button waits on the full chain (roughly 6-8
sequential steps, several of them LLM calls) in one HTTP request. See §B7
and §B8.

### Model routing

Configurable per-deployment via a preference API (`aws_nova_pro` is the
default for both text and vision):

| Preference value | Text model | Vision model |
|---|---|---|
| `aws_nova_pro` (default) | AWS Bedrock Amazon Nova Pro | AWS Bedrock Amazon Nova Pro |
| `aws_nova` | AWS Bedrock Amazon Nova Lite | AWS Bedrock Amazon Nova Lite |
| `nvidia` | NVIDIA NIM Llama 3.1 (8B for guardrails/agents, 70B for text-structuring) | NVIDIA NIM Llama 3.2 90B Vision |
| `qwen` | Self-hosted Qwen 2.5 14B (via a configurable base URL) | *(not wired for vision)* |

`gemini` appears as a listed valid value in the preferences API but, as of
this writing, has no actual routing branch in the vision/LLM call sites —
selecting it silently falls back to the NVIDIA default path. Worth either
wiring up or removing the option to avoid confusion.

The chosen preference now survives an `ai-service` restart (persisted to a
`ai_preferences` DB row this pass — previously it was an in-memory value
that silently reset to the default on every restart).

### Vision AI & document processing

- Every uploaded PDF gets native text extraction first (Apache PDFBox in
  `document-service`, PyMuPDF in `ai-service`). **New this pass**: if a
  page's native extracted text is already long enough to trust (150+
  characters — the same confidence threshold `document-service` already used
  for its own low-confidence flag), that page **skips the Vision AI OCR call
  entirely** and uses the native text directly. Previously, every PDF page
  was re-OCR'd through Vision AI regardless of whether it already had
  perfectly good embedded text — this was pure wasted AI spend on any
  text-native PDF (which, realistically, is a large fraction of lab reports
  and typed clinical notes). Scanned/image-only pages still go through
  Vision AI exactly as before.
- Blur detection runs locally (OpenCV) before any Vision AI call — a heavily
  blurred region is flagged for the physician to manually annotate rather
  than sending it to an LLM to guess at.
- A patient-identity check cross-references the name/DOB/gender the AI
  extracted from a document against the target patient record, and flags a
  mismatch for physician confirmation before the document is trusted.

## B6. Production-Grade Features Actually Implemented

This section is deliberately literal — only things verified in the code, not
aspirational.

- **JWT authentication** at the gateway, with role claims (added this pass).
- **Role-based access control** enforced server-side in `clinical-service`
  and `document-service` (added this pass) — see §B2.
- **Redis-backed per-user rate limiting** at the gateway (added this pass) —
  tighter limits on the AI route specifically, since that's the route that
  costs real money per request; looser general limits on the rest.
- **Encounter status state machine** — illegal status transitions are now
  rejected server-side (added this pass).
- **Hybrid RAG retrieval** with cross-encoder reranking (added this pass).
- **Real e-signature lock** on encounters — signed notes are immutable
  (423 Locked on any edit/delete attempt), amendments only via addenda.
- **PHI redaction before any external LLM call**, unmasked only after.
- **Async, event-driven document processing** (Kafka) — uploads don't block
  on AI analysis.
- **Native-text-extraction gate** before Vision AI, to cut OCR spend (added
  this pass).
- **Blur detection** and **patient-identity verification** as safety checks
  on AI-extracted document content, gating physician trust rather than
  auto-accepting AI output.
- **Audit logging** across PHI access, auth, clinical actions, coding
  activity, and data exports, with CSV export.
- **CORS hardening** and **circuit breaker** (Resilience4j) at the gateway.
- **Health checks** (`/actuator/health`) on every Spring service, wired for
  a real load balancer health check (used in the AWS runbook).

## B7. Known Gaps — What's Not Done Yet

Being direct about this matters more than it looks impressive:

- **`ai-service` has no RBAC enforcement** — only the two Java services do
  (see §B2's caveat). Chat, RAG admin endpoints, and the AI-preference API
  are open to any authenticated user regardless of role.
- **The mock login system is not a real user directory.** Exactly 3
  hardcoded accounts exist (`api-gateway`'s `MOCK_USERS`); passwords are
  plaintext-compared, not hashed. A separate, unrelated `UserEntity`/
  `UserController` table exists in `clinical-service` with full CRUD but is
  completely unused by the frontend and unconnected to the login system —
  dead code today, but the shape a real user directory would need.
- **The AI clinical-insights pipeline is synchronous** — a physician's
  browser holds one HTTP request open for the full multi-step LangGraph run.
  The document-upload pipeline already solved this with an async job-ID +
  SSE pattern; the same pattern isn't yet applied to encounter AI generation.
- **No Dead Letter Queue** for failed Kafka messages — a failure is logged
  and the message is dropped; there's no automatic replay path (failures do
  still surface as a `FAILED` document status to the user, so it's not a
  silent failure from their point of view, just not automatically
  retryable).
- **No frontend button-level gating everywhere** — route/nav-level RBAC and
  one representative page (Patient Management) have UI-level gating; most
  other pages rely on the backend's 403 as the enforcement point rather than
  hiding the button too. Not a security gap (the backend still blocks it),
  but a UX rough edge — a coder can see a "Sign Encounter" button they'll
  get rejected for clicking.
- **Two document-service endpoints are unguarded by design** (the
  ai-service-to-document-service direct calls — see §B2) — a real
  service-to-service credential would close this properly.
- **Several Settings tabs are UI-only** (Profile, Notifications, Security,
  Integrations) — they render and are clickable but have no backend endpoint
  behind "Save" yet.
- **No automated test suite** — this project is verified by manual testing
  and build/compile checks, by explicit choice of the team maintaining it.
- **Not HIPAA-certified** — encryption in transit (HTTPS) and the
  access-control/audit-logging pieces above are meaningful steps in that
  direction, but a real compliance certification involves a formal risk
  assessment, signed Business Associate Agreements with every vendor (AWS,
  NVIDIA), and a lot of process/documentation this project hasn't done.
  Don't put real patient data on the current AWS demo deployment (§B9) —
  it says so in its own runbook.

## B8. Performance & Latency

**These are reasoned estimates from the architecture and known component
behavior, not measured production numbers** — there's no APM/tracing
deployed yet to measure real percentiles. Treat these as "what order of
magnitude should I expect," not SLAs.

| Operation | Estimated latency | Why |
|---|---|---|
| Simple CRUD read (list patients, get encounter) | 10–100ms | One indexed Postgres query behind a reactive WebFlux endpoint. |
| Simple CRUD write (save vitals, update a note) | 20–150ms | Same, plus a write + (sometimes) an audit-log insert. |
| Hybrid RAG search (one query) | ~150–600ms | Vector search (~50–200ms) + keyword search (~10–50ms, runs effectively in parallel) + cross-encoder rerank of ~12 candidates on CPU (~100–300ms). Negligible next to an LLM call, but not free. |
| Single LLM text call (summary, diagnosis, coding) | 1–5s | Typical Bedrock Nova Pro / NVIDIA NIM response time for a few-hundred-to-~1500 token completion; varies with prompt/output length and provider load. |
| Single Vision AI image analysis | 3–10s | Image encoding + a larger multimodal model call; scales with image resolution and requested detail. |
| Full LangGraph clinical-insight generation (one encounter) | **15–45s** | 6+ sequential LLM/RAG/web-search steps, none parallelized today (see §B7's "parallel LangGraph nodes" opportunity, not yet built). This is the slowest interactive operation in the app and the reason it's flagged as a good next target for the async job-ID pattern. |
| PDF document upload → fully processed | Seconds to ~2 minutes | Depends entirely on page count and how many pages need Vision AI OCR vs. skip it via the native-text gate (this pass's optimization measurably helps here for text-heavy PDFs) — but this happens asynchronously in the background; the user isn't blocked waiting for it. |
| AI Chat response | ~1–3s to first token, then streams | Streamed via SSE, so perceived latency is dominated by time-to-first-token, not total generation time. |

**The one clear latency lever not yet pulled**: the LangGraph pipeline's
`clinical_research` and `coding_research` steps are I/O-bound (RAG + web
search) and don't strictly depend on each other's *immediate* predecessor in
a way that prevents restructuring for partial parallelism — this is the
"~40% latency reduction" opportunity noted as a deferred enhancement.

## B9. AWS Deployment & Cost

Two very different cost pictures depending on what "deployed" means. Both
share the shape documented in `AWS_DEPLOYMENT.md`: CloudFront + S3 for the
frontend, an ALB in front of EC2, EC2 running the four backend services
(and, in the cheap tier, Postgres/Kafka/Redis as containers on that same
box).

### Tier 1 — Demo / pilot (what `AWS_DEPLOYMENT.md` actually documents)

Single `t3.medium` EC2 instance running everything (Postgres, Kafka, Redis,
and all 4 app services as containers), no RDS, no Multi-AZ, no managed
Kafka. Deliberately the cheapest possible shape for a live demo — the
runbook is explicit that this should not hold real patient data.

| Component | Approx. cost running 24/7 |
|---|---|
| EC2 `t3.medium` | ~$25–35/mo |
| Application Load Balancer | ~$16–20/mo base + usage |
| EBS storage (20–30GB) | ~$2–3/mo |
| S3 + CloudFront (low volume) | <$5/mo |
| SSM Parameter Store, CloudWatch Logs (small scale) | mostly within free tier |
| **Total infra, excluding AI API usage** | **~$60–90/month** |

This is a single point of failure (one instance, one Postgres container, no
automated backups beyond whatever you script yourself) — appropriate for a
demo, a pilot with a handful of users, or a hackathon/designathon, not for a
hospital's real production data.

### Tier 2 — Reference production shape for "1 hospital, ~50 staff users"

Not yet built, but the natural next step from Tier 1: swap the single-box
pieces for managed/redundant equivalents.

| Component | Approx. cost |
|---|---|
| RDS Postgres (`db.t3.medium`, single-AZ; double for Multi-AZ) | ~$60–100/mo (single-AZ) |
| 2× EC2 (`t3.medium`/`t3.large`) behind the ALB — split so `ai-service`'s heavier memory footprint (PyTorch/sentence-transformers) isn't fighting the other three services for RAM | ~$70–140/mo |
| Kafka + Redis (self-hosted on a small EC2, or MSK/ElastiCache if you want managed) | ~$25–100/mo depending on managed vs. self-hosted |
| ALB | ~$20–30/mo |
| S3 + CloudFront | <$10/mo at this scale |
| CloudWatch, Secrets Manager/SSM, data transfer | ~$10–20/mo |
| **Total infra, excluding AI API usage** | **roughly $250–450/month** |

### The variable cost that actually matters: AI API usage

Infra cost above is fairly predictable. AI API spend is not, and is very
likely the larger line item at real usage volume — this is the part that
genuinely requires either a pilot period with real usage tracking, or a
conservative estimate you monitor closely.

**Reasoning, not a quote** — assume a hospital with 50 staff, of whom ~20 are
physicians actively documenting encounters:

- ~100–200 encounters/day → each full AI-insight generation is ~5-6 LLM
  calls through the LangGraph pipeline.
- ~300–600 documents/day uploaded (labs, imaging, notes) → a meaningful
  fraction now skip Vision AI entirely via the native-text gate (§B5); the
  rest (scanned/image documents) still need it.
- Chat usage: call it 100–300 messages/day across all users.

At current-generation Bedrock Nova Pro / NVIDIA NIM per-token pricing (verify
against AWS's own pricing page before budgeting — these rates change and can
shift meaningfully), a single LangGraph run's text calls likely cost single
digits of cents; a Vision AI page analysis costs more than a text call
(image tokens are pricier) — call it low-single-digit-cents to ~$0.05 per
page depending on resolution and provider. Multiplied out at the volumes
above, a reasoned planning range is **roughly $50–$400/month** in AI API
spend for this hospital size — with the native-text-extraction gate directly
pulling that range down for any hospital whose document mix skews toward
typed/text-native PDFs over scanned images.

**Bottom line for budgeting**: infra (~$250–450/mo) + AI usage (~$50–400/mo,
wide range because it's genuinely usage-dependent) → **a reasoned planning
range of roughly $300–850/month** for one hospital at ~50 users on a
real-production-shaped (not demo-shaped) deployment. Run a 2–4 week pilot
with real usage and actual CloudWatch/Bedrock billing data before locking in
a number for a contract or a grant budget.

## B10. FAQ

**Is this HIPAA compliant?**
No, not certified. Meaningful pieces are in place (access control, audit
logging, encryption in transit, PHI redaction before external LLM calls,
signed BAA-eligible vendors like AWS Bedrock), but HIPAA compliance is a
formal process (risk assessment, signed BAAs with every vendor including
NVIDIA if using NIM, breach-notification procedures, workforce training)
that hasn't been done. Treat this as "compliance-aware architecture," not
"compliant system."

**What happens if `ai-service` goes down?**
Clinical documentation, patient management, coding, and billing all keep
working — those are `clinical-service`/`document-service`, independent
processes. AI-insight generation, document OCR, chat, and RAG search would
be unavailable until it's back up. Document uploads would queue in Kafka
(not lost) and process once `ai-service` recovers.

**Can a coder see a patient's clinical notes?**
Yes, by design — reads are broad (§B2's rationale). They cannot edit,
delete, or write new notes.

**What stops a physician from re-editing a signed note?**
The notes API itself rejects it (HTTP 423 Locked) — not just a hidden UI
button. This is enforced regardless of what client makes the request.

**Why three roles and not more granular ones (e.g., "senior physician,"
"resident")?**
Because that's what actually exists in the login system today — three mock
accounts, three roles. Adding finer-grained roles is straightforward given
the permission-matrix pattern already built, but should be driven by a real
decision about the hospital's actual staff hierarchy, not guessed.

**Does the AI ever auto-submit anything (a diagnosis, a code, a bill)
without a human clicking approve?**
No. Every AI output — summary, diagnosis, codes, care pathway — is presented
as a draft. A physician explicitly applies a diagnosis to the record; a
coder explicitly approves/modifies each code; a physician explicitly
approves for billing. There is no code path that writes an AI suggestion
into the authoritative record without an explicit human action in between.

**What's the single biggest latency problem a user would actually notice?**
Generating AI clinical insights for an encounter (§B8: 15-45 seconds,
synchronous). Document processing is also slow but happens in the
background, so it doesn't block the user the same way.

**If this needs to scale to multiple hospitals, what breaks first?**
The mock-user login system (§B7) — it's fine for one hospital's ~3 named
demo accounts, not for real multi-tenant staff management. After that,
Tier-1's single EC2 instance is the next thing to outgrow (§B9's Tier 2 is
the natural next step, and even that assumes one hospital, not multiple
tenants on shared infrastructure, which would need its own design pass for
data isolation).
