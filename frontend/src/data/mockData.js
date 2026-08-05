export const mockPatients = [
  {
    id: "p-001",
    mrn: "MRN-1001",
    firstName: "John",
    lastName: "Doe",
    dob: "1965-04-12",
    gender: "M",
    allergies: ["Penicillin"],
    meds: ["Metformin 500mg", "Lisinopril 10mg"],
  },
  {
    id: "p-002",
    mrn: "MRN-1002",
    firstName: "Jane",
    lastName: "Smith",
    dob: "1978-09-23",
    gender: "F",
    allergies: [],
    meds: ["Omeprazole 20mg"],
  },
  {
    id: "p-003",
    mrn: "MRN-1003",
    firstName: "Robert",
    lastName: "Johnson",
    dob: "1955-01-10",
    gender: "M",
    allergies: ["Sulfa drugs", "Latex"],
    meds: ["Amlodipine 5mg", "Warfarin 2mg"],
  },
];

export const mockNotes = [
  {
    id: "n-001",
    type: "H&P",
    date: "2024-07-20",
    author: "Dr. Smith",
    text: "Patient presents with complaints of increased thirst, frequent urination, and fatigue over the past 3 weeks. History of hypertension. Vitals: BP 140/90, HR 78. Labs show HbA1c of 8.2%.",
  },
  {
    id: "n-002",
    type: "Progress",
    date: "2024-07-22",
    author: "Dr. Smith",
    text: "Continued on Metformin. Blood sugar logs show fasting levels around 160 mg/dL. Patient reports occasional headaches.",
  },
];

export const mockAiSummary = {
  subjective:
    "Patient complains of increased thirst, polyuria, and fatigue x 3 weeks.",
  objective:
    "Vitals: BP 140/90, HR 78. Labs: HbA1c 8.2%, Fasting Glucose 160 mg/dL.",
  assessment:
    "Uncontrolled Type 2 Diabetes Mellitus with Essential Hypertension.",
  plan: "1. Increase Metformin to 1000mg BID. 2. Start GLP-1 Agonist. 3. Repeat HbA1c in 3 months.",
  confidence: 0.92,
  criticalAlerts: [
    "HbA1c significantly above target (8.2%)",
    "BP slightly elevated",
  ],
};

export const mockCodes = [
  {
    code: "E11.9",
    type: "ICD-10",
    desc: "Type 2 Diabetes Mellitus without complications",
    confidence: 0.95,
    status: "PENDING",
  },
  {
    code: "I10",
    type: "ICD-10",
    desc: "Essential (Primary) Hypertension",
    confidence: 0.88,
    status: "PENDING",
  },
  {
    code: "99213",
    type: "CPT",
    desc: "Office Visit, Established Patient, Low Complexity",
    confidence: 0.99,
    status: "PENDING",
  },
];
