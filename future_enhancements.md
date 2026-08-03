# Hexa MedPlus: Future Roadmap & System Actors

## 1. System Actors
The Hexa MedPlus platform is designed to serve distinct user roles, ensuring a seamless flow from patient intake to medical billing.

1. **Physician / Doctor**
   - **Role**: Primary care provider interacting with the patient.
   - **Actions**: Writes rough clinical notes, reviews uploaded external lab reports, triggers the AI to generate structured SOAP notes, and reviews AI-suggested differential diagnoses and treatment pathways.
   - **HITL (Human-in-the-Loop)**: Approves or edits the AI-generated clinical data and pushes suggested codes to the billing department.

2. **Medical Coder / Billing Specialist**
   - **Role**: Financial and compliance expert.
   - **Actions**: Uses the **Coding Workbench** to review the ICD-10 and CPT codes suggested by the AI.
   - **HITL**: Modifies codes for maximum insurance reimbursement accuracy, saves drafts, and submits final codes. If clinical context is missing, they can route the encounter back to the Physician for revision.

3. **Hospital Administrator**
   - **Role**: Operations and compliance oversight.
   - **Actions**: Uses the Dashboard to view hospital KPIs. Uploads hospital-specific "Clinical Protocols" (PDFs) which the AI uses for RAG (Retrieval-Augmented Generation). Reviews the AI Audit Trail to ensure HIPAA compliance and track LLM latency/decisions.

4. **Hexa MedPlus AI System (Autonomous Actor)**
   - **Role**: The intelligent orchestrator.
   - **Actions**: Listens to Kafka events asynchronously. Automatically runs OCR on uploaded documents, vectorizes protocols, and orchestrates the multi-agent LangGraph workflow.

---

## 2. Currently Integrated AI Models (NVIDIA NIM & LLaMA)

### Multimodal & Vision (Images & Blurry OCR) [✅ Implemented]
* **`meta/llama-3.2-90b-vision-instruct` (or 11b)**: Actively used in our AI pipeline. Instead of relying purely on traditional text OCR, this model processes uploaded lab reports and poorly scanned documents to extract text and contextual information visually.

### Document Structuring & Summarization [✅ Implemented]
* **`meta/llama-3.1-8b-instruct`**: Actively used to structure the raw OCR text into standardized JSON lab results and generate clinical summaries.

### Document Embedding (RAG Vectorization) [✅ Implemented]
* **`nvidia/nv-embed-v1`**: Actively used for embedding text. It is highly optimized for enterprise retrieval tasks and forms the backbone of our RAG architecture.

---

## 3. Future Enhancements & Immediate Roadmap

### A. Intelligent Lab Analysis Agent (Highly Feasible)
- **Current State**: This is extremely feasible right now. Since the Vision AI already extracts tabular results into JSON, we don't need complex tools.
- **Workflow**: We pass the structured JSON lab results to `llama-3.1-8b-instruct` with a strict system prompt containing standard medical reference ranges. The LLM simply compares the values and outputs flagged abnormal results (e.g., High LDL) which we can then render in the UI as a historical trend graph.

### B. Medical AI Assistant / Chat (Targeted Context-Stuffing)
- **The Problem**: Open-source models struggle with Agentic Tool Calling (MCP) to "search" for records autonomously. However, blindly "stuffing" all hospital data into the context window will instantly exceed the model's token limits.
- **The Solution (Mode Selection)**: We will build a Chat UI that forces the doctor to narrow the scope by selecting a "Chat Mode" before querying:
  1. **General Medical Mode**: No context is stuffed. The AI relies solely on its pre-trained weights to answer general medical questions.
  2. **Patient Data Mode**: The UI prompts the doctor to search/select a specific Patient by Name/MRN. *Only* that specific patient's historical notes and lab records are stuffed into the system prompt.
  3. **Protocols / Guidelines Mode**: The UI provides a dropdown of uploaded hospital guidelines. The doctor selects a specific protocol (e.g., "ADA Diabetes 2024"), and *only* that document's text is stuffed into the context for querying.
- **Workflow**: This heavily narrows the context, preventing token-limit crashes while entirely bypassing the need for unreliable MCP tool calling.

### C. Patient Archiving & Audits (Replaces Encounter Locking)
- **Current State**: Currently, we lock individual encounters when billed, which is clunky and not how real hospitals archive data.
- **New Workflow**:
  1. **Archive Flag**: When a patient's treatment is completed and billed, the *entire patient* is flagged as `is_archived = true` in the DB. This removes them completely from the active Patient Management workspace.
  2. **Audit/Records Page**: We build a dedicated, Read-Only "Medical Records / Audits" page where management can view all archived patients, their billed encounters, and historical notes.
  3. **Returning Patients**: If an archived patient returns to the hospital with a new problem, the receptionist goes to "Add Patient", searches their name, and clicks "Unarchive/Open New Encounter". This removes the `is_archived` flag, bringing their entire history back into the active workspace. No need to lock individual notes!

### D. Ambient Clinical Listening (Voice-to-Text)
- **Goal**: Implement a Voice-to-Text microphone button in the Chat Page and Patient Notes section.
- **Workflow**: The doctor clicks "Record" and speaks their notes. We can use the browser's native Web Speech API (or a lightweight transcription tool) to transcribe the speech directly into the text area, saving the doctor from typing.

### E. Intelligent RAG Guideline Lifecycle Management
- **Workflow**: Enhance the `document-service` and `pgvector` store to explicitly track document metadata such as versioning, expiry dates, and department tags. 
- **Goal**: Implement an automated CRON job that retires old guidelines (removes their vector embeddings) and regenerates embeddings for new versions to ensure the AI never retrieves outdated medical protocols.

---

## 4. Educational / Not Planned for Implementation
The following are advanced concepts mapped out for architectural knowledge, but will **not** be implemented in the current scope:

### F. Vision AI & Automated Imaging Reports (Not Planned)
- **Reason**: Current open-source vision models (like LLaMA 3.2 Vision) can describe findings but cannot accurately output exact spatial coordinates (bounding boxes) to highlight fractures on X-rays without extensive custom fine-tuning.

### G. Aggressive Redis Application Caching (Not Planned)
- **Reason**: Our current scale does not require shaving milliseconds off response times. Redis remains for basic pub/sub and rate limiting only.

### H. HL7 FHIR / EHR Interoperability Writeback (Not Planned)
- **Reason**: Requires complex enterprise integration layers (Epic/Cerner) which is out of scope for the current standalone application.

---

## 5. Does the current workflow make sense medically?
**Yes, absolutely.** The flow you have built is exactly what billion-dollar HealthTech companies (like Epic Systems, Cerner, or AI startups like Ambience Healthcare) are trying to perfect right now.

1. **The Problem**: Doctors hate typing. They spend 2 hours typing notes for every 1 hour they spend with a patient.
2. **Your Solution**: The doctor types a messy, quick stream-of-consciousness note. Hexa MedPlus instantly structures it into a standard SOAP format, cross-references it with hospital guidelines (RAG) to ensure the doctor didn't miss a treatment step, and instantly generates the billing codes so the hospital gets paid faster.
3. **The Safety Net**: You built a "Human-in-the-Loop" architecture. The AI doesn't just write to the database blindly. It puts the codes in a "Coding Workbench" for a human to review. It surfaces Drug Interaction alerts inline. 

It is a highly realistic, incredibly valuable enterprise architecture.

---

## 6. Architecture & Infrastructure (AWS - Not Planned For Now)

*Note: The following AWS Cloud architecture represents a potential future enterprise deployment model. However, it is strictly educational and is **not planned for implementation** in the current project scope. The system will continue to run locally via Docker Compose.*

**Proposed AWS Integration:**
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
                                                            |    NVIDIA NIM API              |
                                                            |      (External Cloud)          |
                                                            +--------------+-----------------+
                                                                           |
                                                                           | - - - Response (Unmask PII)
                                                                           v
                                                                   PHI Redaction (HF)


==========================================================================================
REQUEST FLOW
==========================================================================================

Users
   │
   ▼
CloudFront
   ├──► S3 (React App)
   │
   └──► ALB
         │
         ▼
    API Gateway
      ├──► Clinical Service ───► RDS
      ├──► Document Service ───► S3
      └──► AI Engine
                │
                ├──► Redis (Cache)
                ├──► Kafka (Consume Events)
                └──► PHI Redaction
                          │
                          ▼
                   VPC Endpoint
                          │
                          ▼
                  NVIDIA NIM API
                          │
                          ▼
                 Unmasked AI Response
```
