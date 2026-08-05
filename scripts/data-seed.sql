-- =============================================================================
-- HEXA MEDPLUS CLINICAL INTELLIGENCE PLATFORM - INITIAL DATA SEEDING SCRIPT
-- =============================================================================

-- Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

-- -----------------------------------------------------------------------------
-- 1. DDL: Create Tables (Schema Alignment with Spring JPA & SQLAlchemy)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(255) PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    specialty VARCHAR(100),
    profile_image_key VARCHAR(255),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mrn VARCHAR(20) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    date_of_birth DATE,
    gender VARCHAR(10),
    department VARCHAR(100),
    status VARCHAR(50),
    room VARCHAR(20),
    admission_date TIMESTAMP WITHOUT TIME ZONE,
    allergies TEXT,
    active_medications TEXT
);

CREATE TABLE IF NOT EXISTS encounters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    encounter_date TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    encounter_type VARCHAR(50),
    chief_complaint TEXT,
    blood_pressure VARCHAR(20),
    heart_rate INTEGER,
    temperature DOUBLE PRECISION,
    o2_sat INTEGER,
    status VARCHAR(50) DEFAULT 'IN_PROGRESS',
    ai_summary TEXT,
    ai_codes TEXT,
    coding_draft TEXT,
    revision_note TEXT,
    signed_at TIMESTAMP WITHOUT TIME ZONE,
    billed_at TIMESTAMP WITHOUT TIME ZONE
);

CREATE TABLE IF NOT EXISTS clinical_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    encounter_id UUID NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,
    note_type VARCHAR(50) NOT NULL,
    content TEXT,
    author VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    is_prescription BOOLEAN DEFAULT FALSE,
    is_clinical_note BOOLEAN DEFAULT TRUE,
    current_medication TEXT,
    history TEXT,
    additional_review TEXT
);

CREATE TABLE IF NOT EXISTS diagnoses (
    id VARCHAR(255) PRIMARY KEY,
    encounter_id UUID NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    description VARCHAR(255) NOT NULL,
    confidence_score DOUBLE PRECISION,
    source VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING_REVIEW',
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS labs (
    id VARCHAR(255) PRIMARY KEY,
    encounter_id UUID NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,
    test_name VARCHAR(255) NOT NULL,
    result_value VARCHAR(100) NOT NULL,
    unit VARCHAR(50),
    reference_range VARCHAR(100),
    result_date TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    status VARCHAR(50) DEFAULT 'FINAL',
    is_abnormal BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS imaging (
    id VARCHAR(255) PRIMARY KEY,
    encounter_id UUID NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,
    modality VARCHAR(50) NOT NULL,
    body_part VARCHAR(100) NOT NULL,
    imaging_date TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    report_text TEXT,
    status VARCHAR(50) DEFAULT 'FINAL',
    dicom_url VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS treatments (
    id VARCHAR(255) PRIMARY KEY,
    encounter_id UUID NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,
    description VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    source VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING_REVIEW',
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS coding_activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    encounter_id VARCHAR(255) NOT NULL,
    actor_name VARCHAR(255),
    actor_type VARCHAR(50),
    action VARCHAR(100) NOT NULL,
    code_ref VARCHAR(50),
    details TEXT,
    timestamp TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS document_uploads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_name VARCHAR(255) NOT NULL,
    file_key VARCHAR(255) NOT NULL,
    document_type VARCHAR(50),
    category VARCHAR(100),
    status VARCHAR(50) DEFAULT 'COMPLETED',
    file_size BIGINT,
    target_mrn VARCHAR(50),
    specialty VARCHAR(100),
    uploaded_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_insights (
    encounter_id VARCHAR(255) PRIMARY KEY,
    ai_summary JSONB,
    ai_diagnosis JSONB,
    ai_codes JSONB,
    ai_pathway JSONB,
    hitl_status VARCHAR(50) DEFAULT 'NONE',
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_audit_log (
    id VARCHAR(255) PRIMARY KEY,
    encounter_id VARCHAR(255),
    actor_name VARCHAR(255),
    actor_type VARCHAR(50),
    action VARCHAR(255),
    code_ref VARCHAR(255),
    details TEXT,
    timestamp TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 2. DATA SEEDING: Users / Healthcare Staff
-- -----------------------------------------------------------------------------

INSERT INTO users (id, username, email, full_name, role, specialty)
VALUES 
    ('u-101', 'sarah_chen', 'dr.chen@hexamedplus.com', 'Dr. Sarah Chen', 'PHYSICIAN', 'Endocrinology'),
    ('u-102', 'marcus_vance', 'dr.vance@hexamedplus.com', 'Dr. Marcus Vance', 'PHYSICIAN', 'Cardiology'),
    ('u-103', 'elena_rostova', 'dr.rostova@hexamedplus.com', 'Dr. Elena Rostova', 'PHYSICIAN', 'Dermatology'),
    ('u-104', 'coder_maria', 'maria.coder@hexamedplus.com', 'Maria Rodriguez', 'MEDICAL_CODER', 'Health Information Management')
ON CONFLICT (username) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 3. DATA SEEDING: Patients
-- -----------------------------------------------------------------------------

INSERT INTO patients (id, mrn, first_name, last_name, date_of_birth, gender, department, status, room, admission_date, allergies, active_medications)
VALUES 
    -- Patient 1: Primary Demo Patient (Endocrinology / T2DM & HTN)
    (
        '11111111-1111-1111-1111-111111111111'::uuid,
        'MRN-849201',
        'James',
        'Wilson',
        '1956-04-12',
        'M',
        'Endocrinology',
        'Admitted',
        'Room 402',
        NOW() - INTERVAL '2 days',
        'Penicillin|Sulfa Drugs',
        'Metformin 500mg BID|Lisinopril 10mg QD|Atorvastatin 20mg QD'
    ),
    -- Patient 2: Emergency Department / Acute Asthma Exacerbation
    (
        '22222222-2222-2222-2222-222222222222'::uuid,
        'MRN-339201',
        'Maria',
        'Garcia',
        '1982-08-25',
        'F',
        'Emergency',
        'Under Observation',
        'ED Bed 08',
        NOW() - INTERVAL '1 day',
        'Aspirin|NSAIDs',
        'Albuterol HFA Inhaler PRN|Fluticasone Propionate 110mcg'
    ),
    -- Patient 3: Cardiology / Acute Coronary Syndrome
    (
        '33333333-3333-3333-3333-333333333333'::uuid,
        'MRN-100300',
        'Robert',
        'Johnson',
        '1955-01-10',
        'M',
        'Cardiology',
        'CCU Admitted',
        'CCU-03',
        NOW() - INTERVAL '3 days',
        'Latex|Shellfish',
        'Amlodipine 5mg QD|Metoprolol Succinate 50mg QD|Aspirin 81mg QD'
    ),
    -- Patient 4: Dermatology Clinic / Fungal Infection (Ringworm)
    (
        '44444444-4444-4444-4444-444444444444'::uuid,
        'MRN-409182',
        'Emily',
        'Watson',
        '1994-11-03',
        'F',
        'Dermatology',
        'Outpatient',
        'Exam Rm 2B',
        NOW() - INTERVAL '5 hours',
        'Codeine',
        'Multivitamins'
    ),
    -- Patient 5: Nephrology / Chronic Kidney Disease Stage 3b
    (
        '55555555-5555-5555-5555-555555555555'::uuid,
        'MRN-552190',
        'David',
        'Chen',
        '1961-07-19',
        'M',
        'Nephrology',
        'Outpatient',
        'Clinic 1A',
        NOW() - INTERVAL '4 days',
        'Contrast Dye (Iodinated)',
        'Furosemide 40mg QD|Sevelamer Carbonate 800mg TID'
    )
ON CONFLICT (mrn) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 4. DATA SEEDING: Encounters
-- -----------------------------------------------------------------------------

INSERT INTO encounters (id, patient_id, encounter_date, encounter_type, chief_complaint, blood_pressure, heart_rate, temperature, o2_sat, status)
VALUES 
    -- Encounter 1: James Wilson (Endocrinology Follow-up)
    (
        'e1111111-1111-1111-1111-111111111111'::uuid,
        '11111111-1111-1111-1111-111111111111'::uuid,
        NOW() - INTERVAL '1 day',
        'Outpatient Visit',
        'Fatigue, polyuria, and blurred vision x 3 weeks.',
        '142/88',
        78,
        98.6,
        98,
        'IN_PROGRESS'
    ),
    -- Encounter 2: Maria Garcia (ED Acute Shortness of Breath)
    (
        'e2222222-2222-2222-2222-222222222222'::uuid,
        '22222222-2222-2222-2222-222222222222'::uuid,
        NOW() - INTERVAL '12 hours',
        'Emergency Department',
        'Sudden onset severe shortness of breath, wheezing, and chest tightness.',
        '134/84',
        110,
        99.1,
        91,
        'IN_PROGRESS'
    ),
    -- Encounter 3: Robert Johnson (CCU Chest Pain Evaluation)
    (
        'e3333333-3333-3333-3333-333333333333'::uuid,
        '33333333-3333-3333-3333-333333333333'::uuid,
        NOW() - INTERVAL '2 days',
        'Inpatient Admission',
        'Substernal crushing chest pain radiating to left arm starting during exertion.',
        '158/94',
        92,
        98.4,
        95,
        'UNDER_REVIEW'
    ),
    -- Encounter 4: Emily Watson (Dermatology Rash Evaluation)
    (
        'e4444444-4444-4444-4444-444444444444'::uuid,
        '44444444-4444-4444-4444-444444444444'::uuid,
        NOW() - INTERVAL '4 hours',
        'Outpatient Consultation',
        'Pruritic annular red erythematous rash with active border on forearm x 10 days.',
        '118/76',
        72,
        98.2,
        99,
        'IN_PROGRESS'
    ),
    -- Encounter 5: David Chen (Nephrology CKD Follow-up)
    (
        'e5555555-5555-5555-5555-555555555555'::uuid,
        '55555555-5555-5555-5555-555555555555'::uuid,
        NOW() - INTERVAL '3 days',
        'Outpatient Consultation',
        'Bilateral lower extremity edema, elevated serum creatinine, and fatigue.',
        '148/92',
        76,
        98.5,
        97,
        'SIGNED'
    )
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 5. DATA SEEDING: Clinical Notes (H&P & SOAP Documentation)
-- -----------------------------------------------------------------------------

INSERT INTO clinical_notes (id, encounter_id, note_type, author, content, created_at, is_prescription, is_clinical_note)
VALUES 
    -- Note 1: James Wilson
    (
        'a1111111-1111-1111-1111-111111111111'::uuid,
        'e1111111-1111-1111-1111-111111111111'::uuid,
        'H&P',
        'Dr. Sarah Chen',
        'CHIEF COMPLAINT: Fatigue and polyuria x 3 weeks.

HISTORY OF PRESENT ILLNESS: Patient is a 68-year-old male with a history of T2DM and essential hypertension presenting for follow-up. He reports increasing lethargy, polydipsia, and nocturia 3-4 times per night. Denies chest pain, shortness of breath, fever, chills, or dysuria. Compliance with Metformin has been erratic due to mild GI upset.

PHYSICAL EXAMINATION:
- Vitals: BP 142/88 mmHg, HR 78 bpm, Temp 98.6 F, O2 Sat 98% on room air. BMI 32.4 kg/m2.
- General: Overweight male in no acute distress.
- HEENT: Mucous membranes slightly dry. No scleral icterus.
- Cardiovascular: Regular rate and rhythm, S1/S2 present, no murmurs or gallops.
- Lungs: Clear to auscultation bilaterally.
- Extremities: No peripheral edema. Pulses 2+ bilaterally. Monofilament exam reveals intact sensation bilaterally.

ASSESSMENT & PLAN:
1. Uncontrolled Type 2 Diabetes Mellitus - HbA1c elevated at 8.8%. Increase Metformin to 1000mg BID with meals. Initiate Empagliflozin (Jardiance) 10mg daily for glycemic control and renal protection.
2. Essential Hypertension - Suboptimally controlled at 142/88. Continue Lisinopril 10mg QD, recheck BP in 4 weeks.',
        NOW() - INTERVAL '1 day',
        FALSE,
        TRUE
    ),
    -- Note 2: Maria Garcia
    (
        'a2222222-2222-2222-2222-222222222222'::uuid,
        'e2222222-2222-2222-2222-222222222222'::uuid,
        'Emergency Note',
        'Dr. Marcus Vance',
        'CHIEF COMPLAINT: Severe shortness of breath and wheezing x 2 hours.

HPI: 42 y/o female with a history of moderate persistent asthma presenting to the ED with acute respiratory distress triggered by an upper respiratory tract infection. Reports cough, dyspnea, and poor response to home Albuterol inhaler (used 4 times today without relief).

PHYSICAL EXAM:
- Vitals: BP 134/84, HR 110, RR 28, Temp 99.1 F, O2 Sat 91% ambient air.
- Resp: Tachypneic, accessory muscle use present, diffuse bilateral expiratory wheezing with prolonged expiratory phase.

ASSESSMENT & PLAN:
1. Acute Moderate-to-Severe Asthma Exacerbation.
2. Immediate continuous nebulized Albuterol/Ipratropium (DuoNeb) x 3 treatments.
3. IV Methylprednisolone 125mg administered immediately. Supplemental oxygen via nasal cannula 2L to maintain O2 Sat > 95%.',
        NOW() - INTERVAL '12 hours',
        FALSE,
        TRUE
    ),
    -- Note 3: Robert Johnson
    (
        'a3333333-3333-3333-3333-333333333333'::uuid,
        'e3333333-3333-3333-3333-333333333333'::uuid,
        'Progress Note',
        'Dr. Marcus Vance',
        'CHIEF COMPLAINT: Exertional chest pressure and diaphoresis.

HPI: 71 y/o male admitted to CCU with suspected NSTEMI. Initial Cardiac Troponin I elevated at 1.45 ng/mL. EKG demonstrates ST segment depressions in anterior leads V3-V5. Patient currently pain-free after initiation of Nitroglycerin drip and Heparin infusion.

ASSESSMENT & PLAN:
1. Acute Coronary Syndrome - NSTEMI (ICD-10: I21.4).
2. Dual Antiplatelet Therapy (DAPT) with Aspirin 81mg and Ticagrelor 90mg BID.
3. Cardiac Catheterization scheduled for tomorrow morning.',
        NOW() - INTERVAL '2 days',
        FALSE,
        TRUE
    ),
    -- Note 4: Emily Watson
    (
        'a4444444-4444-4444-4444-444444444444'::uuid,
        'e4444444-4444-4444-4444-444444444444'::uuid,
        'Clinical Note',
        'Dr. Elena Rostova',
        'CHIEF COMPLAINT: Itchy expanding red ring on right forearm.

HPI: 30 y/o female presenting with a 10-day history of a solitary, highly pruritic circular rash on her right volar forearm. Patient recently adopted a rescue kitten. Denies fever, systemic symptoms, joint pain, or prior skin disorders.

PHYSICAL EXAM:
- Skin: 3.5 cm annular erythematous plaque with central clearing and a raised, scaly active border on right forearm. KOH preparation of scale demonstrates hyphae consistent with dermatophytosis.

ASSESSMENT & PLAN:
1. Tinea Corporis (Ringworm of the body) - ICD-10: B35.2.
2. Prescribed topical Terbinafine 1% cream BID for 14 days. Educated on pet hygiene.',
        NOW() - INTERVAL '4 hours',
        FALSE,
        TRUE
    )
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 6. DATA SEEDING: Diagnoses (ICD-10)
-- -----------------------------------------------------------------------------

INSERT INTO diagnoses (id, encounter_id, code, description, confidence_score, source, status, created_at)
VALUES 
    ('d-101', 'e1111111-1111-1111-1111-111111111111'::uuid, 'E11.65', 'Type 2 diabetes mellitus with hyperglycemia', 96.5, 'AI', 'APPROVED', NOW() - INTERVAL '1 day'),
    ('d-102', 'e1111111-1111-1111-1111-111111111111'::uuid, 'I10', 'Essential (primary) hypertension', 94.0, 'AI', 'APPROVED', NOW() - INTERVAL '1 day'),
    ('d-103', 'e1111111-1111-1111-1111-111111111111'::uuid, 'E66.9', 'Obesity, unspecified', 88.0, 'HUMAN', 'APPROVED', NOW() - INTERVAL '1 day'),
    ('d-201', 'e2222222-2222-2222-2222-222222222222'::uuid, 'J45.51', 'Severe persistent asthma with (acute) exacerbation', 97.2, 'AI', 'APPROVED', NOW() - INTERVAL '12 hours'),
    ('d-301', 'e3333333-3333-3333-3333-333333333333'::uuid, 'I21.4', 'Non-ST elevation (NSTEMI) myocardial infarction', 98.4, 'AI', 'APPROVED', NOW() - INTERVAL '2 days'),
    ('d-401', 'e4444444-4444-4444-4444-444444444444'::uuid, 'B35.2', 'Tinea corporis (Ringworm of body)', 99.1, 'AI', 'APPROVED', NOW() - INTERVAL '4 hours'),
    ('d-501', 'e5555555-5555-5555-5555-555555555555'::uuid, 'N18.32', 'Chronic kidney disease, stage 3b', 93.5, 'HUMAN', 'APPROVED', NOW() - INTERVAL '3 days')
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 7. DATA SEEDING: Labs
-- -----------------------------------------------------------------------------

INSERT INTO labs (id, encounter_id, test_name, result_value, unit, reference_range, result_date, status, is_abnormal)
VALUES 
    -- Labs for James Wilson
    ('l-101', 'e1111111-1111-1111-1111-111111111111'::uuid, 'Hemoglobin A1c (HbA1c)', '8.8', '%', '4.0 - 5.6', NOW() - INTERVAL '1 day', 'FINAL', TRUE),
    ('l-102', 'e1111111-1111-1111-1111-111111111111'::uuid, 'Fasting Serum Glucose', '186', 'mg/dL', '70 - 99', NOW() - INTERVAL '1 day', 'FINAL', TRUE),
    ('l-103', 'e1111111-1111-1111-1111-111111111111'::uuid, 'Serum Creatinine', '1.1', 'mg/dL', '0.7 - 1.3', NOW() - INTERVAL '1 day', 'FINAL', FALSE),
    ('l-104', 'e1111111-1111-1111-1111-111111111111'::uuid, 'eGFR', '74', 'mL/min/1.73m2', '> 60', NOW() - INTERVAL '1 day', 'FINAL', FALSE),
    
    -- Labs for Maria Garcia
    ('l-201', 'e2222222-2222-2222-2222-222222222222'::uuid, 'Arterial Blood Gas (pH)', '7.38', '', '7.35 - 7.45', NOW() - INTERVAL '11 hours', 'FINAL', FALSE),
    ('l-202', 'e2222222-2222-2222-2222-222222222222'::uuid, 'Arterial pCO2', '44', 'mmHg', '35 - 45', NOW() - INTERVAL '11 hours', 'FINAL', FALSE),
    ('l-203', 'e2222222-2222-2222-2222-222222222222'::uuid, 'White Blood Cell (WBC)', '11.8', 'x10^3/uL', '4.5 - 11.0', NOW() - INTERVAL '11 hours', 'FINAL', TRUE),
    
    -- Labs for Robert Johnson
    ('l-301', 'e3333333-3333-3333-3333-333333333333'::uuid, 'Cardiac Troponin I', '1.45', 'ng/mL', '< 0.04', NOW() - INTERVAL '2 days', 'FINAL', TRUE),
    ('l-302', 'e3333333-3333-3333-3333-333333333333'::uuid, 'CK-MB', '14.2', 'ng/mL', '0.0 - 5.0', NOW() - INTERVAL '2 days', 'FINAL', TRUE),
    
    -- Labs for Emily Watson
    ('l-401', 'e4444444-4444-4444-4444-444444444444'::uuid, 'Skin Scraping KOH Prep', 'Positive for fungal hyphae', '', 'Negative', NOW() - INTERVAL '3 hours', 'FINAL', TRUE)
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 8. DATA SEEDING: Imaging Reports
-- -----------------------------------------------------------------------------

INSERT INTO imaging (id, encounter_id, modality, body_part, imaging_date, report_text, status, dicom_url)
VALUES 
    ('img-101', 'e1111111-1111-1111-1111-111111111111'::uuid, 'X-RAY', 'Chest PA/LAT', NOW() - INTERVAL '1 day', 'FINDINGS: Lungs are clear without focal consolidation, effusion, or pneumothorax. Cardiac silhouette size is within normal limits.', 'FINAL', 'https://dicom.hexamedplus.com/studies/101'),
    ('img-201', 'e2222222-2222-2222-2222-222222222222'::uuid, 'X-RAY', 'Chest 2 Views', NOW() - INTERVAL '11 hours', 'FINDINGS: Hyperinflation of lungs consistent with small airway disease/asthma. No active pulmonary infiltrates.', 'FINAL', 'https://dicom.hexamedplus.com/studies/201'),
    ('img-301', 'e3333333-3333-3333-3333-333333333333'::uuid, 'EKG', '12-Lead Electrocardiogram', NOW() - INTERVAL '2 days', 'FINDINGS: Sinus rhythm at 92 bpm. ST-segment depression of 1.5mm in leads V3-V5. T-wave inversions in aVL. Suggests anterior myocardial ischemia.', 'FINAL', 'https://dicom.hexamedplus.com/studies/301')
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 9. DATA SEEDING: Treatments & Pathways
-- -----------------------------------------------------------------------------

INSERT INTO treatments (id, encounter_id, description, type, source, status, created_at)
VALUES 
    ('t-101', 'e1111111-1111-1111-1111-111111111111'::uuid, 'Increase Metformin to 1000mg BID with meals', 'Medication Adjustment', 'HUMAN', 'APPROVED', NOW() - INTERVAL '1 day'),
    ('t-102', 'e1111111-1111-1111-1111-111111111111'::uuid, 'Initiate Empagliflozin (Jardiance) 10mg QD', 'Medication Addition', 'AI', 'APPROVED', NOW() - INTERVAL '1 day'),
    ('t-201', 'e2222222-2222-2222-2222-222222222222'::uuid, 'Albuterol / Ipratropium Nebulizer x 3', 'Emergency Therapy', 'HUMAN', 'APPROVED', NOW() - INTERVAL '12 hours'),
    ('t-301', 'e3333333-3333-3333-3333-333333333333'::uuid, 'Coronary Angiography & Percutaneous Coronary Intervention', 'Procedure', 'HUMAN', 'APPROVED', NOW() - INTERVAL '2 days'),
    ('t-401', 'e4444444-4444-4444-4444-444444444444'::uuid, 'Apply Terbinafine 1% Topical Cream BID x 14 days', 'Topical Antifungal', 'AI', 'APPROVED', NOW() - INTERVAL '4 hours')
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 10. DATA SEEDING: Coding Audit Log
-- -----------------------------------------------------------------------------

INSERT INTO coding_activity_log (id, encounter_id, actor_name, actor_type, action, code_ref, details, timestamp)
VALUES 
    (gen_random_uuid(), 'e1111111-1111-1111-1111-111111111111', 'AI Engine', 'AI', 'AI_CODES_GENERATED', 'E11.65', 'Suggested ICD-10 E11.65 based on H&P note.', NOW() - INTERVAL '1 day'),
    (gen_random_uuid(), 'e1111111-1111-1111-1111-111111111111', 'Dr. Sarah Chen', 'PHYSICIAN', 'CODE_APPROVED', 'E11.65', 'Physician confirmed diagnosis code E11.65.', NOW() - INTERVAL '1 day'),
    (gen_random_uuid(), 'e4444444-4444-4444-4444-444444444444', 'AI Engine', 'AI', 'AI_CODES_GENERATED', 'B35.2', 'Suggested ICD-10 B35.2 Tinea Corporis.', NOW() - INTERVAL '4 hours')
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 11. DATA SEEDING: Document Uploads (Uploaded Files)
-- -----------------------------------------------------------------------------

INSERT INTO document_uploads (id, file_name, file_key, document_type, category, status, file_size, target_mrn, specialty, uploaded_at)
VALUES
    ('f1111111-1111-1111-1111-111111111111'::uuid, 'wilson_lab_report_hba1c.pdf', 'docs/wilson_lab_report_hba1c.pdf', 'LAB_REPORT', 'Lab Reports', 'COMPLETED', 2451000, 'MRN-849201', 'Endocrinology', NOW() - INTERVAL '1 day'),
    ('f2222222-2222-2222-2222-222222222222'::uuid, 'garcia_ed_chest_xray.dcm', 'docs/garcia_ed_chest_xray.dcm', 'IMAGING', 'Imaging', 'COMPLETED', 14820000, 'MRN-339201', 'Emergency', NOW() - INTERVAL '11 hours'),
    ('f3333333-3333-3333-3333-333333333333'::uuid, 'johnson_cardiac_ekg.pdf', 'docs/johnson_cardiac_ekg.pdf', 'IMAGING', 'Imaging', 'COMPLETED', 3120000, 'MRN-100300', 'Cardiology', NOW() - INTERVAL '2 days'),
    ('f4444444-4444-4444-4444-444444444444'::uuid, 'watson_dermatology_hp.pdf', 'docs/watson_dermatology_hp.pdf', 'CLINICAL_NOTE', 'Clinical Notes', 'COMPLETED', 1850000, 'MRN-409182', 'Dermatology', NOW() - INTERVAL '4 hours')
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 12. DATA SEEDING: AI Insights Pre-population
-- -----------------------------------------------------------------------------

INSERT INTO ai_insights (encounter_id, ai_summary, ai_diagnosis, ai_codes, ai_pathway, hitl_status)
VALUES 
    (
        'e1111111-1111-1111-1111-111111111111',
        '{"subjective": "Patient reports 3 weeks of fatigue, polydipsia, and polyuria. History of T2DM and HTN.", "objective": "BP 142/88, BMI 32.4. Labs: HbA1c 8.8%, Fasting Glucose 186 mg/dL.", "assessment": "Uncontrolled Type 2 Diabetes Mellitus with hyperglycemia and suboptimally controlled essential hypertension.", "plan": "Increase Metformin to 1000mg BID, initiate SGLT2 inhibitor Empagliflozin 10mg QD, recheck BP in 4 weeks.", "keyFindings": ["HbA1c 8.8%", "Fasting Glucose 186 mg/dL", "Polyuria & polydipsia"], "criticalAlerts": ["Uncontrolled Glycemia (HbA1c > 8.0%)"], "confidence": 0.94}'::jsonb,
        '{"primaryDiagnosis": "Type 2 diabetes mellitus with hyperglycemia (E11.65)", "differentialDiagnoses": ["Essential hypertension (I10)", "Diabetic nephropathy (E11.21)"], "reasoning": "Elevated HbA1c (8.8%) and elevated fasting serum glucose (186 mg/dL) along with classical symptoms of polyuria and polydipsia confirm uncontrolled T2DM.", "citations": ["ADA Standards of Medical Care in Diabetes 2024", "JNC-8 Hypertension Guidelines"]}'::jsonb,
        '{"suggestedCodes": [{"code": "E11.65", "type": "ICD10", "description": "Type 2 diabetes mellitus with hyperglycemia", "confidence": 0.96, "evidence": ["HbA1c 8.8%", "Fasting Glucose 186 mg/dL"]}, {"code": "I10", "type": "ICD10", "description": "Essential (primary) hypertension", "confidence": 0.94, "evidence": ["BP 142/88 mmHg"]}, {"code": "99214", "type": "CPT", "description": "Office visit, established patient, moderate complexity", "confidence": 0.98, "evidence": ["Moderate complexity MDM", "Prescription drug management"]}]}'::jsonb,
        '{"pathwayId": "PATH-T2DM-01", "pathwayName": "ADA T2DM Glycemic Control & Cardiovascular Protection Pathway", "steps": [{"stepName": "Step 1: Oral Antidiabetic Optimization", "description": "Titrate Metformin to max tolerated dose (1000mg BID).", "reasoning": "First-line pharmacotherapy for glycemic control."}, {"stepName": "Step 2: SGLT2 Inhibitor Initiation", "description": "Add Empagliflozin 10mg daily.", "reasoning": "Provides dual benefit of glycemic control and cardiorenal protection."}, {"stepName": "Step 3: Follow-up & Lab Monitoring", "description": "Schedule repeat HbA1c and renal panel in 12 weeks.", "reasoning": "Assess treatment efficacy and glycemic target achievement."}]}'::jsonb,
        'NONE'
    )
ON CONFLICT (encounter_id) DO NOTHING;
