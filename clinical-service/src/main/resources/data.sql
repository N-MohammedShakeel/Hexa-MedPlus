-- =============================================================================
-- HEXA MEDPLUS CLINICAL SERVICE - PATIENT INITIAL DATA SEEDING
-- =============================================================================

INSERT INTO patients (id, mrn, first_name, last_name, date_of_birth, gender, department, status, room, admission_date, allergies, active_medications)
VALUES 
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
        CURRENT_TIMESTAMP - INTERVAL '2 days',
        'Penicillin|Sulfa Drugs',
        'Metformin 500mg BID|Lisinopril 10mg QD|Atorvastatin 20mg QD'
    ),
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
        CURRENT_TIMESTAMP - INTERVAL '1 day',
        'Aspirin|NSAIDs',
        'Albuterol HFA Inhaler PRN|Fluticasone Propionate 110mcg'
    ),
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
        CURRENT_TIMESTAMP - INTERVAL '3 days',
        'Latex|Shellfish',
        'Amlodipine 5mg QD|Metoprolol Succinate 50mg QD|Aspirin 81mg QD'
    ),
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
        CURRENT_TIMESTAMP - INTERVAL '5 hours',
        'Codeine',
        'Multivitamins'
    ),
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
        CURRENT_TIMESTAMP - INTERVAL '4 days',
        'Contrast Dye (Iodinated)',
        'Furosemide 40mg QD|Sevelamer Carbonate 800mg TID'
    )
ON CONFLICT (mrn) DO NOTHING;
