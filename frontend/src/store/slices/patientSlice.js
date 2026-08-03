import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { clinicalService } from "../../services/api/clinicalService";

// Async Thunks
export const fetchPatients = createAsyncThunk(
  "patients/fetchPatients",
  async (_, { rejectWithValue }) => {
    try {
      const data = await clinicalService.getPatients();
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data || "Failed to fetch patients");
    }
  }
);

export const addNewPatient = createAsyncThunk(
  "patients/addNewPatient",
  async (patientData, { rejectWithValue }) => {
    try {
      const data = await clinicalService.createPatient(patientData);
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data || "Failed to add patient");
    }
  }
);

export const fetchArchivedPatients = createAsyncThunk(
  "patients/fetchArchivedPatients",
  async (_, { rejectWithValue }) => {
    try {
      const data = await clinicalService.getPatients(true);
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data || "Failed to fetch archived patients");
    }
  }
);

export const archivePatient = createAsyncThunk(
  "patients/archivePatient",
  async (id, { rejectWithValue }) => {
    try {
      const data = await clinicalService.archivePatient(id);
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data || "Failed to archive patient");
    }
  }
);

export const unarchivePatient = createAsyncThunk(
  "patients/unarchivePatient",
  async (id, { rejectWithValue }) => {
    try {
      const data = await clinicalService.unarchivePatient(id);
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data || "Failed to unarchive patient");
    }
  }
);

const mapPatient = (p) => ({
  id: p.id,
  mrn: p.mrn,
  name: `${p.firstName} ${p.lastName}`,
  age: p.dob ? new Date().getFullYear() - new Date(p.dob).getFullYear() : 0,
  gender: p.gender || "Unknown",
  status: p.status || "Active",
  department: p.department || "General",
  lastVisit: p.admissionDate ? p.admissionDate.split("T")[0] : "N/A",
  primaryDiagnosis: p.allergies || "None", // Mock mapping for UI
  alerts: 0,
  archived: !!p.archived,
  archivedAt: p.archivedAt || null,
});

const initialState = {
  patientsList: [],
  status: "idle", // 'idle' | 'loading' | 'succeeded' | 'failed'
  error: null,
  archivedList: [],
  archivedStatus: "idle",
};

const patientSlice = createSlice({
  name: "patients",
  initialState,
  reducers: {
    addPatient: (state, action) => {
      // Legacy optimistic update logic - now handled by addNewPatient extraReducer
    },
    updatePatient: (state, action) => {
      const index = state.patientsList.findIndex((p) => p.id === action.payload.id);
      if (index !== -1) {
        state.patientsList[index] = { ...state.patientsList[index], ...action.payload };
      }
    },
    deletePatient: (state, action) => {
      state.patientsList = state.patientsList.filter((p) => p.id !== action.payload);
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPatients.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchPatients.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.patientsList = action.payload.map(mapPatient);
      })
      .addCase(fetchPatients.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })
      .addCase(addNewPatient.fulfilled, (state, action) => {
        state.patientsList.unshift(mapPatient(action.payload));
      })
      .addCase(fetchArchivedPatients.pending, (state) => {
        state.archivedStatus = "loading";
      })
      .addCase(fetchArchivedPatients.fulfilled, (state, action) => {
        state.archivedStatus = "succeeded";
        state.archivedList = action.payload.map(mapPatient);
      })
      .addCase(fetchArchivedPatients.rejected, (state, action) => {
        state.archivedStatus = "failed";
        state.error = action.payload;
      })
      .addCase(archivePatient.fulfilled, (state, action) => {
        state.patientsList = state.patientsList.filter(p => p.id !== action.payload.id);
        state.archivedList.unshift(mapPatient(action.payload));
      })
      .addCase(unarchivePatient.fulfilled, (state, action) => {
        state.archivedList = state.archivedList.filter(p => p.id !== action.payload.id);
        state.patientsList.unshift(mapPatient(action.payload));
      });
  }
});

export const { addPatient, updatePatient, deletePatient } = patientSlice.actions;

export const selectAllPatients = (state) => state.patients.patientsList;
export const selectPatientStatus = (state) => state.patients.status;
export const selectPatientById = (state, patientId) => state.patients.patientsList.find(p => p.id === patientId);
export const selectArchivedPatients = (state) => state.patients.archivedList;
export const selectArchivedPatientStatus = (state) => state.patients.archivedStatus;

export default patientSlice.reducer;
