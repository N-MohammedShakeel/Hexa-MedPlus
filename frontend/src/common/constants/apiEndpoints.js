export const API_ENDPOINTS = {
    AUTH: {
        LOGIN: '/api/auth/login',
        ME: '/api/auth/me',
    },
    PATIENTS: {
        LIST: '/api/patients',
        DETAIL: (id) => `/api/patients/${id}`,
    },
    ENCOUNTERS: {
        BY_PATIENT: (patientId) => `/api/encounters/patient/${patientId}`,
        DETAIL: (id) => `/api/encounters/${id}`,
        UPDATE_STATUS: (id) => `/api/encounters/${id}/status`,
        UPDATE_CODES: (id) => `/api/encounters/${id}/codes`,
        CODING_DRAFT: (id) => `/api/encounters/${id}/coding-draft`,
        CODING_ACTIVITY: (id) => `/api/encounters/${id}/coding-activity`,
        VITALS: (id) => `/api/encounters/${id}/vitals`,
    },
    NOTES: {
        BY_ENCOUNTER: (encounterId) => `/api/notes/encounter/${encounterId}`,
        CREATE: '/api/notes',
        UPDATE: (id) => `/api/notes/${id}`,
        DELETE: (id) => `/api/notes/${id}`,
    },
    AI: {
        SUMMARIZE: '/api/ai/summarize',
        CODES: '/api/ai/codes',
        WORKFLOW_EXECUTE: '/api/ai/workflow/execute',
        WORKFLOW_GET: (encounterId) => `/api/ai/workflow/${encounterId}`,
        AUDITS: '/api/ai/audits',
        RAG_STATUS: '/api/ai/rag/status',
        VALIDATE_CODES: '/api/ai/coding/validate',
    },
    DOCUMENTS: {
        UPLOAD: '/api/documents',
        LIST: '/api/documents',
        DELETE: (id) => `/api/documents/${id}`,
        PROGRESS: (jobId) => `/api/documents/progress/${jobId}`,
    },
    ANALYTICS: {
        DASHBOARD: '/api/analytics/dashboard',
    },
};