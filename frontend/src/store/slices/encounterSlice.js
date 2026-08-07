import { createSlice } from "@reduxjs/toolkit";
import axiosInstance from "../../config/axios";
import apiClient from "../../services/api/apiClient";
import { notificationActions } from "./notificationSlice";
import { toast } from "react-toastify";

const initialState = {
  activeEncounter: null,
  patientNotes: {},      // mrn -> notes[]
  visionRecords: {},     // mrn -> records[]
  labTrends: {},         // mrn -> trend
  aiWorkflowResult: {},  // encounterId -> result
  loading: false,
  loadingStates: {},
  error: null,
};

const encounterSlice = createSlice({
  name: "encounter",
  initialState,
  reducers: {
    setLoading(state, action) {
      if (typeof action.payload === 'object' && action.payload !== null) {
        const { id, isLoading } = action.payload;
        state.loadingStates[id] = isLoading;
      } else {
        state.loading = action.payload;
      }
    },
    setError(state, action) {
      state.error = action.payload;
    },
    setActiveEncounter(state, action) {
      state.activeEncounter = action.payload;
    },
    setPatientNotes(state, action) {
      const { mrn, notes } = action.payload;
      state.patientNotes[mrn] = notes;
    },
    addPatientNote(state, action) {
      const { mrn, note } = action.payload;
      if (!state.patientNotes[mrn]) state.patientNotes[mrn] = [];
      state.patientNotes[mrn].unshift(note);
    },
    updatePatientNote(state, action) {
      const { mrn, note } = action.payload;
      if (state.patientNotes[mrn]) {
        const index = state.patientNotes[mrn].findIndex(n => n.id === note.id);
        if (index !== -1) {
          state.patientNotes[mrn][index] = note;
        }
      }
    },
    removePatientNote(state, action) {
      const { mrn, noteId } = action.payload;
      if (state.patientNotes[mrn]) {
        state.patientNotes[mrn] = state.patientNotes[mrn].filter(n => n.id !== noteId);
      }
    },
    setVisionRecords(state, action) {
      const { mrn, records } = action.payload;
      state.visionRecords[mrn] = records;
    },
    updateVisionRecord(state, action) {
      const { mrn, record } = action.payload;
      if (state.visionRecords[mrn]) {
        const index = state.visionRecords[mrn].findIndex(r => r.id === record.id);
        if (index !== -1) {
          state.visionRecords[mrn][index] = record;
        }
      }
    },
    removeVisionRecord(state, action) {
      const { mrn, recordId } = action.payload;
      if (state.visionRecords[mrn]) {
        state.visionRecords[mrn] = state.visionRecords[mrn].filter(r => r.id !== recordId);
      }
    },
    setLabTrends(state, action) {
      const { mrn, trends } = action.payload;
      state.labTrends[mrn] = trends;
    },
    setAiWorkflowResult(state, action) {
      const { encounterId, result } = action.payload;
      state.aiWorkflowResult[encounterId] = result;
    },
  },
});

export const encounterActions = encounterSlice.actions;

export const fetchPatientNotes = (mrn) => {
  return async (dispatch) => {
    try {
      dispatch(encounterActions.setLoading({ id: `notes_${mrn}`, isLoading: true }));
      const response = await axiosInstance.get(`/api/clinical/patients/${mrn}/notes`);
      dispatch(encounterActions.setPatientNotes({ mrn, notes: response.data }));
    } catch (error) {
      dispatch(encounterActions.setError("Failed to fetch notes"));
    } finally {
      dispatch(encounterActions.setLoading({ id: `notes_${mrn}`, isLoading: false }));
    }
  };
};

export const createPatientNote = (mrn, payload) => {
  return async (dispatch) => {
    try {
      dispatch(encounterActions.setLoading({ id: `notes_${mrn}`, isLoading: true }));
      const response = await axiosInstance.post(`/api/clinical/patients/${mrn}/notes`, payload);
      dispatch(encounterActions.addPatientNote({ mrn, note: response.data }));
      toast.success("Note added successfully");
    } catch (error) {
      dispatch(encounterActions.setError("Failed to add note"));
      toast.error("Failed to add note");
    } finally {
      dispatch(encounterActions.setLoading({ id: `notes_${mrn}`, isLoading: false }));
    }
  };
};

export const updateNoteComment = (mrn, noteId, comment) => {
  return async (dispatch) => {
    try {
      const response = await axiosInstance.put(`/api/clinical/patients/${mrn}/notes/${noteId}`, { comment });
      dispatch(encounterActions.updatePatientNote({ mrn, note: response.data }));
      toast.success("Comment saved successfully");
    } catch (error) {
      toast.error("Failed to save comment");
    }
  };
};

export const deletePatientNote = (mrn, noteId) => {
  return async (dispatch) => {
    try {
      await axiosInstance.delete(`/api/clinical/patients/${mrn}/notes/${noteId}`);
      dispatch(encounterActions.removePatientNote({ mrn, noteId }));
      toast.success("Note deleted successfully");
    } catch (error) {
      toast.error("Failed to delete note");
    }
  };
};

export const fetchVisionRecords = (mrn) => {
  return async (dispatch) => {
    try {
      dispatch(encounterActions.setLoading({ id: `vision_${mrn}`, isLoading: true }));
      const response = await apiClient.get(`/ai/vision/results/${mrn}`);
      dispatch(encounterActions.setVisionRecords({ mrn, records: response.data }));
    } catch (error) {
      console.error("Failed to fetch vision records:", error);
    } finally {
      dispatch(encounterActions.setLoading({ id: `vision_${mrn}`, isLoading: false }));
    }
  };
};

export const deleteVisionRecord = (mrn, id, fileKey) => {
  return async (dispatch) => {
    try {
      await apiClient.delete(`/ai/vision/results/${id}`);
      if (fileKey) {
        try {
          await axiosInstance.delete(`/api/documents/by-file-key/${encodeURIComponent(fileKey)}`);
        } catch (_) {}
      }
      dispatch(encounterActions.removeVisionRecord({ mrn, recordId: id }));
      toast.success("Vision record deleted");
    } catch (error) {
      toast.error("Failed to delete vision record");
    }
  };
};

export const verifyVisionRecord = (mrn, id, fileKey) => {
  return async (dispatch) => {
    try {
      const response = await apiClient.put(`/ai/vision/results/${id}`, { verified: true });
      if (fileKey) {
        try {
          await axiosInstance.put(`/api/documents/by-file-key/${encodeURIComponent(fileKey)}/status?status=COMPLETED`);
        } catch (_) {}
      }
      dispatch(encounterActions.updateVisionRecord({ mrn, record: response.data }));
      toast.success("Record marked as verified");
    } catch (error) {
      toast.error("Failed to verify record");
    }
  };
};

export const updateVisionClinicalFindings = (mrn, id, findings) => {
  return async (dispatch) => {
    try {
      const response = await apiClient.put(`/ai/vision/results/${id}`, { clinicalFindings: findings });
      dispatch(encounterActions.updateVisionRecord({ mrn, record: response.data }));
      toast.success("Clinical findings updated");
    } catch (error) {
      toast.error("Failed to update clinical findings");
    }
  };
};

export const fetchLabTrends = (mrn) => {
  return async (dispatch) => {
    try {
      dispatch(encounterActions.setLoading({ id: `labs_${mrn}`, isLoading: true }));
      const response = await apiClient.get(`/ai/vision/results/${mrn}/labs/trend`);
      dispatch(encounterActions.setLabTrends({ mrn, trends: response.data }));
    } catch (error) {
      console.error("Failed to fetch lab trends:", error);
    } finally {
      dispatch(encounterActions.setLoading({ id: `labs_${mrn}`, isLoading: false }));
    }
  };
};

export const createEncounter = (payload) => {
  return async (dispatch) => {
    try {
      const response = await axiosInstance.post('/api/encounters', payload);
      dispatch(encounterActions.setActiveEncounter(response.data));
      toast.success("Encounter created successfully");
      return response.data;
    } catch (error) {
      toast.error("Failed to create encounter");
      throw error;
    }
  };
};

export const updateEncounterVitals = (encounterId, vitalsForm) => {
  return async (dispatch) => {
    try {
      await axiosInstance.put(`/api/encounters/${encounterId}/vitals`, vitalsForm);
      toast.success("Vitals saved successfully");
    } catch (error) {
      toast.error("Failed to save vitals");
      throw error;
    }
  };
};

export const executeAiWorkflow = (payload, encounterId) => {
  return async (dispatch) => {
    try {
      dispatch(encounterActions.setLoading({ id: `workflow_${encounterId}`, isLoading: true }));
      const response = await axiosInstance.post('/api/ai/workflow/execute', payload);
      dispatch(encounterActions.setAiWorkflowResult({ encounterId, result: response.data }));
      toast.success("AI Workflow executed");
      dispatch(notificationActions.addNotification({
        title: "AI Insights Generated",
        message: "Clinical summary, diagnosis, coding, and pathway insights are ready to review.",
        type: "success",
      }));
      return response.data;
    } catch (error) {
      toast.error("AI workflow failed");
      throw error;
    } finally {
      dispatch(encounterActions.setLoading({ id: `workflow_${encounterId}`, isLoading: false }));
    }
  };
};

export const fetchAiWorkflow = (encounterId) => {
  return async (dispatch) => {
    try {
      const response = await axiosInstance.get(`/api/ai/workflow/${encounterId}`);
      dispatch(encounterActions.setAiWorkflowResult({ encounterId, result: response.data }));
      return response.data;
    } catch (error) {
      if (error?.response?.status !== 404) {
        console.error("Failed to fetch AI workflow", error);
      }
      return null;
    }
  };
};

export const validateNote = (payload) => {
  return async (dispatch) => {
    try {
      const response = await axiosInstance.post('/api/encounters/validate-note', payload);
      return response.data;
    } catch (error) {
      toast.error("Failed to validate note with AI");
      throw error;
    }
  };
};

export default encounterSlice.reducer;