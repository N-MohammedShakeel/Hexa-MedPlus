# Hexa MedPlus: Intelligent Clinical Workflow Platform
**GenAI Designathon Submission**

---

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
    Redis[(Redis\nIn-Memory Cache)]:::db
    
    %% External APIs
    LLM[LLM Provider\n(NVIDIA NIM / Llama 3)]:::infra

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
    AIService -->|Query RAG Hospital Guidelines| Postgres
    AIService <-->|Cache AI Responses| Redis
```

## 4. Technology Stack
- **Frontend**: React / Vite, Redux Toolkit, TailwindCSS
- **API Gateway**: Spring Cloud Gateway (Routing & JWT Validation)
- **Core Microservices**: Java Spring Boot (Document Service, Clinical Service)
- **AI Engine Service**: Python FastAPI, LangChain, LangGraph (Multi-Agent State Machine)
- **Message Broker**: Apache Kafka (Event-driven asynchronous communication)
- **Database**: PostgreSQL with `pgvector` (For relational clinical data and RAG embeddings)
- **Object Storage**: MinIO (S3-compatible storage for raw medical PDFs/images)
- **Caching**: Redis (For rapid session data and AI response caching)
- **GenAI Models (NVIDIA NIM)**: 
  - `meta/llama-3.1-8b-instruct` (Core orchestration & structuring)
  - `meta/llama-3.2-90b-vision-instruct` (Vision OCR & blurry document recovery)
  - `nvidia/nv-embed-v1` (RAG Vectorization)

## 5. GenAI Use Cases
1. **Intelligent Diagnostics with RAG**: Utilizing LangGraph, the AI analyzes the clinical note against the hospital's uploaded clinical protocols (via pgvector) to formulate an assessment and cite its sources directly in the UI.
2. **Automated Medical Coding (HITL)**: The AI acts as a Medical Coder, suggesting ICD-10 and CPT codes. These codes are sent to a "Coding Workbench" where human billing specialists must approve or modify them before final submission.
3. **Vision AI Document Recovery**: When blurry scanned documents are uploaded, OpenCV detects the blur and routes the document to a powerful LLaMA Vision model to recover the lost text, merging it seamlessly into the patient's record.
4. **Proactive Drug Alerts**: As the physician types a note, the system evaluates the text in real-time, flashing amber warnings if it detects contraindications (e.g., prescribing NSAIDs to a patient on Warfarin).

## 6. UI Wireframes & Workflows (For PPT)

- **Screen 1: Dashboard Overview**
  - **Content**: Left sidebar for navigation. Main area shows "Patients", "Encounters", and dynamic, real-time KPI charts powered by Recharts (e.g., Encounters by Department).
- **Screen 2: Encounter Workspace & AI Insights**
  - **Content**: Split-screen view. The left side holds the Physician's scratchpad for writing rough clinical notes, alongside real-time drug interaction alerts. The right side features the generated AI Insights divided into four tabs: Summary, Diagnosis, Coding, and Pathway.
- **Screen 3: AI Explainability Modal**
  - **Content**: Clicking on an AI-generated Diagnosis opens a modal showing exactly *why* the AI made that decision. It displays the AI's confidence levels and explicitly highlights the exact paragraph from the hospital's uploaded guidelines (RAG) that led to the conclusion.
- **Screen 4: The Coding Workbench (Human-in-the-Loop)**
  - **Content**: A dedicated dashboard for Medical Coders. Displays all pending patient encounters with AI-suggested ICD-10 codes. Coders can click "Approve", "Modify", or send the chart back to the physician for revision, ensuring 100% compliance.
