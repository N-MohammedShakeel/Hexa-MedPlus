# Hexa MedPlus — Scenarios & Workflows (v2 — Current State)

> **Status Key:** ✅ Fully Implemented · ⚠️ Partial · 🔮 Planned

---

## 🔮 Pending Scenarios (Up Next)

### Scenario 11 — AWS Cloud Deployment (Designathon Preparation) 🔮
- **Goal**: Migrate the standalone Docker Compose architecture to scalable, cost-optimized AWS Cloud services.
- **Workflow**: Frontend deployed via S3/CloudFront. Backend API Gateway and microservices deployed via EC2/ECS. Postgres Database on RDS. 

---

## Scenario 1 — Document Upload with Real-time SSE Progress ✅

**Demonstrates:** Local CPU parsing, MinIO object storage, Reactor Sinks SSE, Kafka event pub/sub, dynamic document categorisation.

```
[Physician/Admin] selects file + document type  [DocumentWorkspacePage.jsx]
  OR
[Admin] selects file on [ClinicalProtocolsPage.jsx] + document type + specialty in (GUIDELINE uploads only)
       │
       ▼
[Vite Dev Proxy / Nginx] → POST /api/documents?jobId={uuid}
       │
       ▼
[API Gateway :8080]  JWT validated by JwtAuthenticationFilter
  └─ Routes to → [Document Service :8082]
       │
       ▼
[DocumentController.java]  Receives FilePart + documentType + mrn + specialty
       │
       ├──────────────────────────────────────────────────────────────┐
       ▼                                                              ▼
[StorageService.java]                                  [PdfParserService.java]
  Saves raw file to MinIO bucket                         Apache PDFBox extracts text
  Returns storageKey (MinIO object key)                         │
       │                                               [DocumentProgressService.java]
       │                                                 Emits SSE events via Reactor Sinks:
       │                                                   "Initializing secure upload..."
       │                                                   "Transferring to secure vault..."
       │                                                   "Running OCR and Chunking..."
       │                                                   "Generating clinical embeddings..."
       │                                                   "Finalizing Document..."
       │                                                   "Upload and processing complete."
       ├──────────────────────────────────────────────────────────────┘
       ▼
[DocumentController.java] Maps documentType → category:
  "GUIDELINE"          → "Clinical Protocol"
  "LAB_REPORT"         → "Lab Reports"
  "IMAGING"            → "Imaging"
  "DISCHARGE_SUMMARY"  → "Discharge Summaries"
  "CLINICAL_NOTE"      → "Clinical Notes"
  default              → "Other Documents"

Saves DocumentEntity to Postgres (document_uploads table):
  { fileName, fileKey, documentType, category, specialty, status, fileSize, targetMrn, uploadedAt }
       │
       ▼
[DocumentEventPublisher.java] → Kafka Topic: "document.parsed"
  Payload: { fileKey, extractedText, mrn, documentType }
       │
       ▼
[AI Service :8083] — [kafka_consumer.py] listens
  IF documentType == "GUIDELINE":
    → Chunk text with RecursiveCharacterTextSplitter
    → Generate embeddings via NVIDIA NIM (nvidia/nv-embed-v1)
    → Store vectors in Postgres pgvector (vector_store table)
  ELSE:
    → Skip vectorization (only stored in DB for retrieval)

[Frontend SSE stream] — EventSource on GET /api/documents/progress/{jobId}
  → Terminal-style log shows live progress steps
  → Closes automatically on "complete" or "error" event
```

**Frontend Components:**
- `ClinicalProtocolsPage.jsx` — `GuidelineUploadPanel` with drag-and-drop + SSE log (GUIDELINE-only)
- `DocumentWorkspacePage.jsx` — General document upload with category selector

---

## Scenario 2 — Clinical Note → RAG-Augmented AI Pipeline ✅

**Demonstrates:** 4-agent sequential orchestration, NVIDIA NIM LLM, pgvector RAG, persistent result storage.

```
[Physician] writes clinical notes in [EncounterWorkspacePage.jsx]
  → Clicks "Generate AI Insights"
       │
       ▼
POST /api/ai/workflow/execute
  Body: { encounterId, noteContent, patientContext }
       │
       ▼
[API Gateway] → [AI Engine Service :8083]
       │
       ▼
[workflow.py] → [orchestrator.py]

  ┌─────────────────────────────────────────────────────────────┐
  │ STEP 1 — agents.py (Summarization Node)                    │
  │   Prompt: SUMMARIZATION_PROMPT                             │
  │   → NVIDIA NIM (meta/llama-3.1-8b-instruct)               │
  │   Returns: SummarySchema { subjective, objective,          │
  │             assessment, plan, keyFindings, criticalAlerts, │
  │             confidence }                                    │
  └────────────────────┬────────────────────────────────────────┘
                       │
  ┌─────────────────────────────────────────────────────────────┐
  │ STEP 2 — agents.py (Diagnostics Node)                      │
  │   Prompt: DIAGNOSTICS_PROMPT                               │
  │   → RAG: Vector search in pgvector for protocol matches    │
  │   → NVIDIA NIM (meta/llama-3.1-8b-instruct)               │
  │   Returns: DiagnosisSchema { primaryDiagnosis,              │
  │             secondaryDiagnoses[], confidenceFactors[],      │
  │             guidelines[] }                                  │
  └────────────────────┬────────────────────────────────────────┘
                       │
  ┌─────────────────────────────────────────────────────────────┐
  │ STEP 3 — agents.py (Coding Node)                           │
  │   Prompt: CODING_PROMPT                                    │
  │   → NVIDIA NIM (meta/llama-3.1-8b-instruct)               │
  │   Returns: CodingSchema { icd10Codes[], cptCodes[] }       │
  │   Each code: { code, type, description, confidence }       │
  └────────────────────┬────────────────────────────────────────┘
                       │
  ┌─────────────────────────────────────────────────────────────┐
  │ STEP 4 — agents.py (Pathway Node)                          │
  │   Prompt: PATHWAY_PROMPT                                   │
  │   → NVIDIA NIM (meta/llama-3.1-8b-instruct)               │
  │   Returns: PathwaySchema { recommendedSteps[],              │
  │             contraindications[], followUp }                 │
  └─────────────────────────────────────────────────────────────┘
                       │
                       ▼
  [orchestrator.py] → HITL check:
    IF confidence < 0.85 → hitlStatus = "REQUIRES_REVIEW_LOW_CONFIDENCE"
                       │
                       ▼
  [db.py / insight.py] → Postgres (encounter_ai_insights table):
    { encounterId, summaryJson, diagnosisJson, codesJson, pathwayJson,
      hitlStatus, generatedAt }
                       │
                       ▼
  Returns WorkflowResultSchema to frontend

[EncounterWorkspacePage.jsx] — On page mount:
  GET /api/ai/workflow/{encounterId}
  → Loads previously generated insights without re-running the pipeline
  → Populates all 4 AI tabs (Summary / Diagnosis / Coding / Pathway)
```

**AI Tabs rendered in UI:**
| Tab | Data Source | Key Fields Shown |
|-----|------------|-----------------|
| Summary | `SummarySchema` | Subjective, Objective, Assessment, Plan, Critical Alerts |
| Diagnosis | `DiagnosisSchema` | Primary Diagnosis, Differentials, Key Findings |
| Coding | `CodingSchema` | ICD-10 / CPT codes with confidence bars, Push to Workbench |
| Pathway | `PathwaySchema` | Step-by-step treatment timeline with stepType icons |

---

## Scenario 3 — ICD/CPT Coding Workbench & Encounter Lifecycle ✅

**Demonstrates:** Physician-in-the-loop code review, custom codes, save draft functionality, HIPAA activity logging, and strict encounter lifecycle state machine.

```
[Physician] clicks "Push to Workbench" from AI Coding tab
       │
       ▼
[EncounterWorkspacePage.jsx]
  dispatch(setSuggestedCodes(codes)) → Redux clinicalSlice
  navigate(`/coding/${patientId}`)   → Direct navigation to patient's coding view
       │
       ▼
[CodingWorkbenchPage.jsx] — CodingList component
  GET /api/encounters          → useAllEncounters() hook
  GET /api/patients            → usePatients() hook
  Joins encounters ↔ patients
  Shows color-coded badges for statuses: CODING_PENDING, CODING_COMPLETE, CODING_REVISION, BILLING_READY
       │
  [Physician/Coder] clicks "Review Codes" for a patient
       │
       ▼
[CodingWorkbenchPage.jsx] — CodingDetail component
  Loads codes from encounter.codingDraft OR AI suggestions
  Loads Activity Log: GET /api/encounters/{id}/coding-activity
       │
  [Coder] interacts with codes:
    - Approve / Modify / Reject AI codes
    - Add Custom ICD-10 or CPT code via modal
       ├── Updates React state + Debounced validation
       └── Logs to DB via POST /api/encounters/{id}/coding-activity
       │
  [Coder] clicks "Save Draft"
       ├── PUT /api/encounters/{id}/coding-draft (saves JSON to DB)
       │
  [Coder] clicks "Submit for Review" (or "Approve for Billing")
       │
       ▼
PUT /api/encounters/{id}/codes (persists approved codes)
PUT /api/encounters/{id}/status (moves state to CODING_COMPLETE or BILLING_READY)
PUT /api/encounters/{id}/request-revision (if sent back to physician)

Encounter status updated in Postgres and event logged to coding_activity_log table.
```

---

## Scenario 4 — Real-Time Analytics Dashboard ✅

**Demonstrates:** Live database aggregation, Recharts visualizations.

```
[Administrator] navigates to [DashboardPage.jsx] → /dashboard
       │
       ▼
GET /api/analytics/dashboard
       │
       ▼
[API Gateway] → [Clinical Service :8081]
       │
       ▼
[AnalyticsController.java] → [AnalyticsService.java]
  Queries Postgres:
    patientRepository.count()         → total patients
    encounterRepository.count()       → total encounters
    encounterRepository.countByStatus → status breakdown
    noteRepository.count()            → total notes
    Aggregations by encounter type, date range, etc.
       │
       ▼
[DashboardPage.jsx] renders:
  - KPI cards: Patients, Encounters, Active Sessions, AI Operations
  - Bar Chart: Encounter volume by department (Recharts)
  - Area Chart: Patient admissions trend (Recharts)
  - Recent encounters list with status badges
  - Real-time data (no mocks — all from live Postgres)
```

---

## Scenario 5 — Diagnosis Explainability Modal ✅

**Demonstrates:** AI transparency, citation display, confidence reasoning, and dynamic RAG injection.

```
[Physician] clicks ⓘ (Info) icon on a Diagnosis Card or Code Card
       │
       ▼
[EncounterWorkspacePage.jsx] → openExplainability(dx)
  Sets selectedData: { title, confidenceFactors[], evidence[], guidelines[] }
       │
       ▼
[ExplainabilityModal.jsx] renders:
  - Confidence factor bars (Symptom Match, Lab Correlation, Patient History)
  - Evidence text snippets dynamically loaded from patientNotes and encounterNotes
  - Guideline citation titles + sections

[renderTextWithCitations(text)] in EncounterWorkspacePage:
  Parses [Source: ADA_Protocol.pdf] style inline citations from AI text
  Renders as clickable purple badges → opens ExplainabilityModal
  Shows: "Vector Database Match" source with exact retrieved RAG text

STATUS: Fully Implemented. The AI dynamically pulls documents from pgvector, strips UUIDs from the metadata, and explicitly cites the source filename in the reasoning block, which the frontend parses into clickable React components.
```

---

## Scenario 6 — Real-Time Drug-Guideline Alerts ✅

**Demonstrates:** Proactive clinical safety, debounced API validation, inline UI warnings.

```
[Physician] types in the clinical note textarea in [EncounterWorkspacePage.jsx]
       │
       ▼
useEffect debounce (1000ms) triggers when note content changes
  IF note length > 0:
    POST /api/encounters/validate-note
    Body: { content: noteText }
       │
       ▼
[API Gateway] → [Clinical Service :8081]
       │
       ▼
[EncounterController.java] — validateNote()
  content.toLowerCase() checked against drug interaction rules:

  Rule 1: warfarin + (nsaid | ibuprofen | aspirin)
    → "⚠️ Drug Interaction Alert: Warfarin + NSAIDs → increased bleeding risk..."

  Rule 2: warfarin + amoxicillin
    → "⚠️ Drug Interaction Alert: Amoxicillin potentiates Warfarin anticoagulation..."

  Rule 3: glp-1 + metformin
    → "⚠️ Clinical Guideline Alert: ADA recommends verifying eGFR before GLP-1..."

  Rule 4: insulin + metformin
    → "ℹ️ Guideline Note: Monitor for hypoglycemia per ADA guidelines..."

  Rule 5: (penicillin | amoxicillin) + allerg
    → "🚨 Critical Alert: Verify penicillin allergy before prescribing..."

  Rule 6: (nsaid | ibuprofen) + (hypertension | heart failure | ckd | renal)
    → "⚠️ Clinical Alert: NSAIDs with caution in HTN/HF/CKD — per ACC/AHA..."

  Returns: { hasAlert: boolean, alertMessage: string }
       │
       ▼
[EncounterWorkspacePage.jsx]
  IF hasAlert:
    Renders amber AlertTriangle banner above the note textarea
  ELSE:
    Clears the alert banner
```

---

## Scenario 7 — AI-Generated Treatment Pathway ✅

**Demonstrates:** Multi-step agentic AI, structured JSON output, step-by-step UI rendering.

```
[Physician] clicks "Generate AI Insights" (after writing clinical notes)
       │
       ▼
AI Pipeline runs (see Scenario 2 for full flow)
  agents.py (Pathway Node) generates: PathwaySchema.Response
       │
       ▼
[EncounterWorkspacePage.jsx] — "Pathway" tab active
       │
       ▼
[PathwayTab.jsx] renders steps:
  Each PathwayStep shows:
  ┌─────────────────────────────────────────────┐
  │  stepType badge  (Immediate Action / etc.)  │
  │  title           (e.g., "Adjust Metformin") │
  │  description     (short summary)            │
  │  details[]       (bullet points)            │
  │  reasoning       (AI rationale)             │
  └─────────────────────────────────────────────┘
  Connected by vertical timeline line

  summaryRationale displayed at bottom of timeline

Result is PERSISTED to Postgres (encounter_ai_insights.pathwayJson)
  → Survives page refresh, reloaded on next visit without re-running LLM
```

---

## Scenario 8 — Hospital Guideline Upload → RAG Knowledge Base ✅

**Demonstrates:** Clinical protocols as vector embeddings, specialty tagging, AI knowledge base management.

```
[Admin/Physician] navigates to [ClinicalProtocolsPage.jsx] → /protocols
       │
       ▼
Clicks "+ Upload" → GuidelineUploadPanel expands (no page navigation needed)
       │
       ▼
[User fills in]
  - Medical Specialty: (Cardiology / Emergency / Neurology / Oncology /
                        Endocrinology / Pulmonology / General Medicine)
  - Drag-drop or browse to select PDF/DOCX file
       │
       ▼
FormData built:
  { file, documentType: "GUIDELINE", mrn: "HOSPITAL_WIDE", specialty }
       │
       ▼
POST /api/documents?jobId={uuid}
       │
       ▼
[Document Service] — full upload pipeline (see Scenario 1)
  category resolved → "Clinical Protocol"
  specialty saved to DocumentEntity
       │
       ▼
Kafka: document.parsed published
       │
       ▼
[AI Service — kafka_consumer.py]
  documentType == "GUIDELINE" → proceed with vectorization
  TokenTextSplitter → chunks
  NVIDIA NIM (nvidia/nv-embed-v1) → embeddings (symmetric model, no input_type needed)
  vectorStore.add(chunks) → Postgres pgvector (vector_store table)
       │
       ▼
[ClinicalProtocolsPage.jsx] protocol list refreshes
  Protocol shown with:
  ✅ "Active in AI Knowledge Base" status badge
  "In AI Knowledge Base" green badge
  Specialty tag (e.g., "Endocrinology")
       │
       ▼
[agents.py (Diagnostics Node) + agents.py (Pathway Node)]
  For every subsequent AI pipeline run:
  QuestionAnswerAdvisor retrieves TOP-K relevant chunks from pgvector
  Chunks injected into prompt → context-aware diagnoses and pathways
  (Graceful fallback if vector store empty or embedding temporarily unavailable)
```

---

## Scenario 9 — Audit Trail (AI Operations) ✅

**Demonstrates:** HIPAA-aligned traceability, AI decision logging.

```
[System] — AI pipeline operations automatically logged
  Every call to NVIDIA NIM / AI agents creates AiAuditEntity:
  {
    encounterId, action, model, prompt (truncated),
    response (truncated), latencyMs, timestamp
  }
  Saved to Postgres (ai_audit_logs table)
       │
       ▼
[AuditTrailsPage.jsx] → /audit
       │
       ▼
GET /api/ai/audits
       │
       ▼
[AuditController.java] → AuditRepository.findAll()
  Returns list of AiAuditEntity records
       │
       ▼
[AuditTrailsPage.jsx] renders:
  - Filter tabs: All / AI Summaries / Code Suggestions / Pathway Generation
  - Table: Timestamp, Action, Model Used, Encounter ID, Latency
  - Each row expandable to show prompt/response excerpt
  - Satisfies HIPAA audit trail requirements for AI-assisted decisions
```

---

## Scenario 10 — Blurry Document Resolution & Structuring Pipeline ✅

**Demonstrates:** OpenCV blur detection, interactive frontend annotation, dual-stage AI processing (Vision AI for OCR -> LLM for Structuring), and smart UI rendering.

```
[Physician/Admin] uploads a scanned document (e.g., LAB_REPORT or CLINICAL_NOTE)
       │
       ▼
[Document Service] -> Saves file -> Publishes `document.parsed`
       │
       ▼
[AI Service (kafka_consumer.py)]
  -> `check_image_blur()` (OpenCV) detects blurry regions
  -> IF blur detected:
       - Skips expensive Vision AI call immediately.
       - Saves stub analysis with `needs_blur_annotation = True`.
       - Updates Document status to `BLUR_DETECTED`.
       │
       ▼
[DocumentWorkspacePage.jsx] (Frontend)
  -> Detects `BLUR_DETECTED` status and `needsBlurAnnotation=true`.
  -> User clicks document -> opens `BlurAnnotationModal`.
       │
       ▼
[BlurAnnotationModal]
  -> Displays document with scaled glowing red bounding boxes over blurry areas.
  -> User inputs manual text for each blurry region.
  -> Clicks "Start Analyzing".
       │
       ▼
[AI Service (vision.py /reanalyze)]
  -> Runs NVIDIA Vision AI (meta/llama-3.2-90b-vision-instruct) to extract base OCR.
  -> Merges user's manual inputs into the extracted OCR text.
       │
       ▼
[AI Service (LLaMA Structuring)]
  -> IF LAB_REPORT:
       - Sends merged text to LLaMA (meta/llama-3.1-8b-instruct) for JSON structuring.
       - Generates `report_summary` and structured `clinical_findings` (Test Name, Result, Reference, Flag).
  -> IF CLINICAL_NOTE or OTHER:
       - Auto-saves the OCR text directly to the patient's Clinical Notes with a `CLINICAL_NOTE` tag.
       │
       ▼
[DocumentVisionViewer.jsx] (Frontend Results)
  -> IF LAB_REPORT:
       - Renders structured lab results in a dedicated table (Test Name, Result, Unit, Flag) in the main viewer.
       - Renders raw OCR text below the table.
       - Renders high-level AI Summary securely inside the AI Modal.
  -> Status updated to `COMPLETED`.
```

---

## Data Flow Summary

```
                        ┌─────────────────────────────┐
                        │        BROWSER               │
                        │  React + Redux + Vite        │
                        │  Port 3000 (Nginx) /         │
                        │  Port 5173 (Dev)             │
                        └──────────┬──────────────────┘
                                   │ HTTP / SSE
                                   ▼
                        ┌─────────────────────────────┐
                        │      API GATEWAY             │
                        │  Spring Cloud Gateway        │
                        │  Port 8080                   │
                        │  JWT validation              │
                        └────┬──────────┬───────┬─────┘
                             │          │       │
           ┌─────────────────┘          │       └──────────────────┐
           ▼                            ▼                           ▼
  ┌─────────────────┐       ┌─────────────────┐       ┌─────────────────────┐
  │ CLINICAL SERVICE│       │ DOCUMENT SERVICE│       │  AI ENGINE SERVICE  │
  │  Port 8081      │       │  Port 8082      │       │   Port 8083         │
  │                 │       │                 │       │                     │
  │ PatientCtrl     │       │ DocumentCtrl    │       │ workflow.py      │
  │ EncounterCtrl   │       │  - Upload       │       │ AuditController     │
  │ PatientTagNote  │       │  - GET list     │       │ CodingController    │
  │ Controller      │       │  - SSE progress │       │ ProtocolController  │
  │ AnalyticsCtrl   │       │  - Delete       │       │                     │
  │                 │       │                 │       │ ClinicalWorkflow    │
  │ validate-note   │       │ StorageService  │       │ Orchestrator        │
  │ (drug alerts)   │       │  → MinIO        │       │  ├─ Summarization   │
  │                 │       │ PdfParserService│       │  ├─ Diagnostics+RAG │
  │ PUT /{id}/codes │       │  → PDFBox       │       │  ├─ Coding          │
  │ (persist codes) │       │ DocumentProgress│       │  └─ Pathway+RAG     │
  └────────┬────────┘       │ Service (Sinks) │       │                     │
           │                └────────┬────────┘       │ db.py / insight.py    │
           │                         │                │ Service             │
           │          ┌──────────────┘                └──────────┬──────────┘
           │          ▼                                           │
           │    Kafka Topic:                                      │
           │    "document.parsed" ──────────────────────────────►│
           │                                                      │
           └──────────────────────────────────────────────────┐  │
                                                              ▼  ▼
                        ┌─────────────────────────────────────────────┐
                        │               POSTGRES (pgvector/pg16)       │
                        │  Schemas managed by Spring JPA (ddl-auto:   │
                        │  update)                                     │
                        │                                              │
                        │  Tables:                                     │
                        │  • patients                                  │
                        │  • encounters  (aiCodes, aiSummary, codingDraft, revisionNote)
                        │  • coding_activity_log (NEW)
                        │  • notes                                     │
                        │  • labs                                      │
                        │  • imaging                                   │
                        │  • document_uploads  (+specialty column)     │
                        │  • encounter_ai_insights                     │
                        │      summaryJson, diagnosisJson,             │
                        │      codesJson, pathwayJson, hitlStatus      │
                        │  • ai_audit_logs                             │
                        │  • vector_store  (pgvector embeddings)       │
                        └──────────────────┬──────────────────────────┘
                                           │
                        ┌──────────────────┴──────────────────────────┐
                        │         SUPPORTING INFRASTRUCTURE            │
                        │                                              │
                        │  MinIO (Port 9000/9001)                     │
                        │    → Raw document object storage             │
                        │                                              │
                        │  Redis (Port 6379)                          │
                        │    → Session / cache layer                   │
                        │                                              │
                        │  Kafka (Port 9092)  KRaft mode              │
                        │    Topics:                                   │
                        │    • document.parsed                         │
                        │    • note.created (NoteEventPublisher)       │
                        └─────────────────────────────────────────────┘
```

---

## API Route Map

| Method | Path | Service | Handler | Description |
|--------|------|---------|---------|-------------|
| GET | `/api/patients` | Clinical | PatientController | List all patients |
| GET | `/api/patients/{id}` | Clinical | PatientController | Patient detail |
| GET | `/api/encounters/patient/{id}` | Clinical | EncounterController | Patient encounters |
| GET | `/api/encounters` | Clinical | EncounterController | All encounters |
| POST | `/api/encounters` | Clinical | EncounterController | Create encounter |
| PUT | `/api/encounters/{id}/status` | Clinical | EncounterController | Update status |
| PUT | `/api/encounters/{id}/ai-data` | Clinical | EncounterController | Save AI summary/codes |
| PUT | `/api/encounters/{id}/codes` | Clinical | EncounterController | Persist approved codes |
| PUT | `/api/encounters/{id}/vitals` | Clinical | EncounterController | Update vitals |
| PUT | `/api/encounters/{id}/coding-draft` | Clinical | EncounterController | Save coding draft |
| PUT | `/api/encounters/{id}/request-revision` | Clinical | EncounterController | Request revision |
| PUT | `/api/encounters/{id}/approve-billing` | Clinical | EncounterController | Ready for billing |
| POST | `/api/encounters/{id}/coding-activity` | Clinical | EncounterController | Add activity log |
| GET | `/api/encounters/{id}/coding-activity` | Clinical | EncounterController | Get activity logs |
| POST | `/api/encounters/validate-note` | Clinical | EncounterController | Drug alert check |
| GET | `/api/analytics/dashboard` | Clinical | AnalyticsController | Dashboard stats |
| POST | `/api/clinical/patients/{mrn}/notes` | Clinical | PatientTagNoteController | Create patient note |
| GET | `/api/clinical/patients/{mrn}/notes` | Clinical | PatientTagNoteController | Get patient notes |
| DELETE | `/api/clinical/patients/{mrn}/notes/{noteId}` | Clinical | PatientTagNoteController | Delete patient note |
| POST | `/api/documents?jobId={id}` | Document | DocumentController | Upload document |
| GET | `/api/documents` | Document | DocumentController | List documents (optional `?category=`) |
| DELETE | `/api/documents/{id}` | Document | DocumentController | Delete document |
| GET | `/api/documents/progress/{jobId}` | Document | DocumentController | SSE progress stream |
| POST | `/api/ai/workflow/execute` | AI Engine | workflow.py | Run 4-agent pipeline |
| GET | `/api/ai/workflow/{encounterId}` | AI Engine | workflow.py | Load saved insights |
| POST | `/api/ai/codes` | AI Engine | CodingController | Standalone code suggestion |
| POST | `/api/ai/coding/validate` | AI Engine | CodingController | Validate code set |
| GET | `/api/ai/audits` | AI Engine | AuditController | AI audit log |
| POST | `/api/ai/protocols/match` | AI Engine | ProtocolController | RAG protocol match |
| POST | `/api/auth/login` | Gateway | AuthController | JWT login |
| GET | `/api/auth/me` | Gateway | AuthController | Current user |
