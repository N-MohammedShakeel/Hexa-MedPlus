import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { clinicalService } from "../../services/api/clinicalService";

// Async Thunks
export const fetchAiSummary = createAsyncThunk(
  "clinical/fetchAiSummary",
  async (requestBody, { rejectWithValue }) => {
    try {
      const data = await clinicalService.getAiSummary(requestBody);
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data || "Failed to fetch AI summary");
    }
  }
);

export const fetchAiCodes = createAsyncThunk(
  "clinical/fetchAiCodes",
  async (requestBody, { rejectWithValue }) => {
    try {
      const data = await clinicalService.getAiCodes(requestBody);
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data || "Failed to fetch AI codes");
    }
  }
);

export const fetchProtocolMatch = createAsyncThunk(
  "clinical/fetchProtocolMatch",
  async (query, { rejectWithValue }) => {
    try {
      const data = await clinicalService.getProtocolMatch(query);
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data || "Failed to fetch protocol match");
    }
  }
);

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
                // Append the steps to the existing plan
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
            state.pendingAiEncounterId = action.payload; // encounterId or null
        },
    },
    extraReducers: (builder) => {
      builder
        // fetchAiSummary
        .addCase(fetchAiSummary.pending, (state) => {
          state.isAiLoading = true;
          state.error = null;
        })
        .addCase(fetchAiSummary.fulfilled, (state, action) => {
          state.isAiLoading = false;
          state.aiSummary = action.payload;
        })
        .addCase(fetchAiSummary.rejected, (state, action) => {
          state.isAiLoading = false;
          state.error = action.payload;
        })
        // fetchAiCodes
        .addCase(fetchAiCodes.pending, (state) => {
          state.isAiLoading = true;
          state.error = null;
        })
        .addCase(fetchAiCodes.fulfilled, (state, action) => {
          state.isAiLoading = false;
          // The backend returns { suggestedCodes: [...] }
          state.suggestedCodes = action.payload.suggestedCodes || [];
        })
        .addCase(fetchAiCodes.rejected, (state, action) => {
          state.isAiLoading = false;
          state.error = action.payload;
        })
        // fetchProtocolMatch
        .addCase(fetchProtocolMatch.pending, (state) => {
          state.isProtocolLoading = true;
          state.error = null;
        })
        .addCase(fetchProtocolMatch.fulfilled, (state, action) => {
          state.isProtocolLoading = false;
          state.protocolMatch = action.payload;
        })
        .addCase(fetchProtocolMatch.rejected, (state, action) => {
          state.isProtocolLoading = false;
          state.error = action.payload;
        });
    }
});

export const {
    setActiveAiTab,
    updateCodeStatus,
    setSuggestedCodes,
    appendProtocolToPlan,
    resetAnalysis,
    setAiGenerating
} = clinicalSlice.actions;

export default clinicalSlice.reducer;