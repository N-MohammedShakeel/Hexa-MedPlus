import apiClient from './apiClient';

export const clinicalService = {
  // Patients
  getPatients: async (archived = false) => {
    const response = await apiClient.get(`/patients?archived=${archived}`);
    return response.data;
  },
  getPatientById: async (id) => {
    const response = await apiClient.get(`/patients/${id}`);
    return response.data;
  },
  getPatientByMrn: async (mrn) => {
    try {
      const response = await apiClient.get(`/patients/mrn/${encodeURIComponent(mrn)}`);
      return response.data;
    } catch (err) {
      if (err.response?.status === 404) return null;
      throw err;
    }
  },
  createPatient: async (patientData) => {
    const response = await apiClient.post('/patients', patientData);
    return response.data;
  },
  archivePatient: async (id) => {
    const response = await apiClient.put(`/patients/${id}/archive`);
    return response.data;
  },
  unarchivePatient: async (id) => {
    const response = await apiClient.put(`/patients/${id}/unarchive`);
    return response.data;
  },

  // Encounters
  getPatientEncounters: async (patientId) => {
    const response = await apiClient.get(`/encounters/patient/${patientId}`);
    return response.data;
  },
  getEncounterById: async (id) => {
    const response = await apiClient.get(`/encounters/${id}`);
    return response.data;
  },

  // Dashboard / General Data
  getDashboardStats: async () => {
    const patients = await apiClient.get('/patients');
    return patients.data;
  },

  // AI Services
  getAiSummary: async (requestBody) => {
    const response = await apiClient.post('/ai/summarize', requestBody);
    return response.data;
  },
  getAiCodes: async (requestBody) => {
    const response = await apiClient.post('/ai/codes', requestBody);
    return response.data;
  },
  updateAiInsight: async (encounterId, updateData) => {
    const response = await apiClient.put(`/ai/workflow/${encounterId}`, updateData);
    return response.data;
  },
  
  getAiPreferences: async () => {
    try {
      const response = await apiClient.get('/ai/preferences');
      return response.data;
    } catch (error) {
      console.error("Error fetching AI preferences:", error);
      throw error;
    }
  },
  
  updateAiPreferences: async (model) => {
    try {
      const response = await apiClient.put('/ai/preferences', { model });
      return response.data;
    } catch (error) {
      console.error("Error updating AI preferences:", error);
      throw error;
    }
  },
  
  // Protocol Match (RAG) API
  getProtocolMatch: async (queryContext) => {
    try {
      const response = await apiClient.post('/ai/protocols/match', {
        clinicalNote: queryContext.clinicalNote,
        diagnoses: queryContext.diagnoses,
        hospitalId: queryContext.hospitalId
      });
      return response.data;
    } catch (error) {
      console.error("Error matching protocols:", error);
      throw error;
    }
  },

  // Audit Logs API
  getAuditLogs: async () => {
    try {
      const response = await apiClient.get('/ai/audits');
      return response.data;
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      throw error;
    }
  },

  // Document Uploads
  getDocuments: async (category) => {
    try {
      const url = category ? `/documents?category=${encodeURIComponent(category)}` : '/documents';
      const response = await apiClient.get(url);
      return response.data;
    } catch (error) {
      console.error("Error fetching documents:", error);
      throw error;
    }
  },
  deleteDocument: async (id) => {
    const response = await apiClient.delete(`/documents/${id}`);
    return response.data;
  },
  uploadDocument: async (file, documentType, mrn, specialty, expiryDate) => {
    const formData = new FormData();
    formData.append('file', file);
    if (documentType) formData.append('documentType', documentType);
    if (mrn) formData.append('mrn', mrn);
    if (specialty) formData.append('specialty', specialty);
    if (expiryDate) formData.append('expiryDate', expiryDate);

    const response = await apiClient.post('/documents', formData);
    return response.data;
  },
  supersedeDocument: async (id, file, expiryDate) => {
    const formData = new FormData();
    formData.append('file', file);
    if (expiryDate) formData.append('expiryDate', expiryDate);

    const response = await apiClient.post(`/documents/${id}/supersede`, formData);
    return response.data;
  },
  triggerExpirySweep: async () => {
    const response = await apiClient.post('/documents/admin/retire-expired');
    return response.data;
  },
  getVersionHistory: async (id) => {
    const response = await apiClient.get(`/documents/${id}/versions`);
    return response.data;
  }
};
