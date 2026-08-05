import { createSlice } from "@reduxjs/toolkit";
import { clinicalService } from "../../services/api/clinicalService";
import { toast } from "react-toastify";
import { notificationActions } from "./notificationSlice";

const initialState = {
    isAiLoading: false,
    isProtocolLoading: false,
    aiSummary: null,
    suggestedCodes: [],
    protocolMatch: null,
    activeAiTab: "summary",
    error: null,
    pendingAiEncounterId: null,
};

const clinicalSlice = createSlice({
    name: "clinical",
    initialState,
    reducers: {
        setAiLoading(state, action) {
            state.isAiLoading = action.payload;
        },
        setProtocolLoading(state, action) {
            state.isProtocolLoading = action.payload;
        },
        setError(state, action) {
            state.error = action.payload;
        },
        setAiSummary(state, action) {
            state.aiSummary = action.payload;
        },
        setProtocolMatch(state, action) {
            state.protocolMatch = action.payload;
        },
        setActiveAiTab: (state, action) => {
            state.activeAiTab = action.payload;
        },
        updateCodeStatus: (state, action) => {
            const { code, status } = action.payload;
            const index = state.suggestedCodes.findIndex((c) => c.code === code);
            if (index !== -1) state.suggestedCodes[index].status = status;
        },
        setSuggestedCodes: (state, action) => {
            state.suggestedCodes = action.payload;
        },
        appendProtocolToPlan: (state, action) => {
            if (state.aiSummary && state.aiSummary.plan) {
                const steps = action.payload.join("\n- ");
                state.aiSummary.plan += `\n\n[PROTOCOL OVERRIDE APPLIED]:\n- ${steps}`;
            }
        },
        resetAnalysis: (state) => {
            state.aiSummary = null;
            state.suggestedCodes = [];
            state.protocolMatch = null;
            state.activeAiTab = "summary";
            state.error = null;
        },
        setAiGenerating: (state, action) => {
            state.pendingAiEncounterId = action.payload;
        },
    }
});

export const clinicalActions = clinicalSlice.actions;

export const fetchAiSummary = (requestBody) => {
  return async (dispatch) => {
    try {
      dispatch(clinicalActions.setAiLoading(true));
      const response = await clinicalService.getAiSummary(requestBody);
      dispatch(clinicalActions.setAiSummary(response));
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message || "Failed to fetch AI summary";
      dispatch(clinicalActions.setError(errorMsg));
      toast.error("Failed to fetch AI summary");
      setTimeout(() => dispatch(clinicalActions.setError(null)), 3000);
    } finally {
      dispatch(clinicalActions.setAiLoading(false));
    }
  };
};

export const fetchAiCodes = (requestBody) => {
  return async (dispatch) => {
    try {
      dispatch(clinicalActions.setAiLoading(true));
      const response = await clinicalService.getAiCodes(requestBody);
      dispatch(clinicalActions.setSuggestedCodes(response.suggestedCodes || []));
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message || "Failed to fetch AI codes";
      dispatch(clinicalActions.setError(errorMsg));
      toast.error("Failed to fetch AI codes");
      setTimeout(() => dispatch(clinicalActions.setError(null)), 3000);
    } finally {
      dispatch(clinicalActions.setAiLoading(false));
    }
  };
};

export const fetchProtocolMatch = (query) => {
  return async (dispatch) => {
    try {
      dispatch(clinicalActions.setProtocolLoading(true));
      const response = await clinicalService.getProtocolMatch(query);
      dispatch(clinicalActions.setProtocolMatch(response));
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message || "Failed to fetch protocol match";
      dispatch(clinicalActions.setError(errorMsg));
      toast.error("Failed to fetch protocol match");
      setTimeout(() => dispatch(clinicalActions.setError(null)), 3000);
    } finally {
      dispatch(clinicalActions.setProtocolLoading(false));
    }
  };
};

// Aliased exports to avoid breaking changes where possible, or if components import these specific actions
export const {
    setActiveAiTab,
    updateCodeStatus,
    setSuggestedCodes,
    appendProtocolToPlan,
    resetAnalysis,
    setAiGenerating
} = clinicalSlice.actions;

export default clinicalSlice.reducer;