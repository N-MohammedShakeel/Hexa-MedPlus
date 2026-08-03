export const kpiData = {
  totalPatients: {
    value: 142,
    change: "+12%",
    trend: "up",
    label: "Total Patients",
    icon: "users",
  },
  pendingReviews: {
    value: 18,
    change: "High Priority",
    trend: "alert",
    label: "Pending AI Reviews",
    icon: "clock",
  },
  codingAccuracy: {
    value: "98.2%",
    change: "Last 30 days",
    trend: "neutral",
    label: "Coding Accuracy",
    icon: "check-circle",
  },
  clinicalAlerts: {
    value: 3,
    change: "Requires attention",
    trend: "alert",
    label: "Clinical Alerts",
    icon: "alert-triangle",
  },
};

export const patientStatsData = {
  labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  values: [18, 24, 20, 28, 22, 15, 12],
};

export const todaysEncounters = [
  {
    id: "ENC-001",
    patientName: "Sarah Johnson",
    patientId: "MRN-84729",
    time: "09:30 AM",
    type: "Follow-up",
    status: "In Progress",
    statusColor: "info",
    diagnosis: "Hypertension",
    action: "Continue",
  },
  {
    id: "ENC-002",
    patientName: "Michael Chen",
    patientId: "MRN-72841",
    time: "10:15 AM",
    type: "New Patient",
    status: "Pending",
    statusColor: "neutral",
    diagnosis: "Type 2 Diabetes",
    action: "Start",
  },
  {
    id: "ENC-003",
    patientName: "Emily Rodriguez",
    patientId: "MRN-61953",
    time: "11:00 AM",
    type: "Follow-up",
    status: "Completed",
    statusColor: "success",
    diagnosis: "Asthma",
    action: "View",
  },
  {
    id: "ENC-004",
    patientName: "David Kim",
    patientId: "MRN-50287",
    time: "11:45 AM",
    type: "Urgent",
    status: "Completed",
    statusColor: "success",
    diagnosis: "Chest Pain",
    action: "View",
  },
];

export const aiSummaries = [
  {
    id: 1,
    patientName: "Sarah Johnson",
    summary:
      "Patient reports improved BP control with current Lisinopril dosage. Recommend continuing current regimen with follow-up in 4 weeks.",
    time: "2 min ago",
    confidence: 94,
  },
  {
    id: 2,
    patientName: "Michael Chen",
    summary:
      "New onset Type 2 Diabetes diagnosed based on HbA1c of 8.2%. Initiate Metformin and lifestyle modifications.",
    time: "15 min ago",
    confidence: 91,
  },
];
