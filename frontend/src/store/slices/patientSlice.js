import { createSlice } from "@reduxjs/toolkit";
import { clinicalService } from "../../services/api/clinicalService";
import { notificationActions } from "./notificationSlice";
import { toast } from "react-toastify";

const mapPatient = (p) => ({
  id: p.id,
  mrn: p.mrn,
  name: `${p.firstName} ${p.lastName}`,
  age: p.dob ? new Date().getFullYear() - new Date(p.dob).getFullYear() : 0,
  gender: p.gender || "Unknown",
  status: p.status || "Active",
  department: p.department || "General",
  lastVisit: p.admissionDate ? p.admissionDate.split("T")[0] : "N/A",
  primaryDiagnosis: p.primaryDiagnosis || "Pending Review",
  alerts: 0,
  archived: !!p.archived,
  archivedAt: p.archivedAt || null,
  unarchivedAt: p.unarchivedAt || null,
});

const patientSlice = createSlice({
  name: "patients",
  initialState: {
    patientsList: [],
    archivedList: [],
    patientsStatus: 'idle',
    archivedStatus: 'idle',
    loading: false,
    error: null,
  },
  reducers: {
    setLoading(state, action) {
      state.loading = action.payload;
    },
    setPatientsStatus(state, action) {
      state.patientsStatus = action.payload;
    },
    setArchivedStatus(state, action) {
      state.archivedStatus = action.payload;
    },
    setError(state, action) {
      state.error = action.payload;
    },
    setPatientsList(state, action) {
      state.patientsList = action.payload.map(mapPatient);
    },
    setArchivedList(state, action) {
      state.archivedList = action.payload.map(mapPatient);
    },
    addPatient(state, action) {
      state.patientsList.unshift(mapPatient(action.payload));
    },
    removePatientFromList(state, action) {
      state.patientsList = state.patientsList.filter((p) => p.id !== action.payload.id);
    },
    updatePatientInList(state, action) {
      const updated = mapPatient(action.payload);
      const idx = state.patientsList.findIndex((p) => p.id === updated.id);
      if (idx !== -1) state.patientsList[idx] = updated;
    },
    addArchivedPatient(state, action) {
      state.archivedList.unshift(mapPatient(action.payload));
    },
    removeArchivedPatient(state, action) {
      state.archivedList = state.archivedList.filter((p) => p.id !== action.payload.id);
    },
  },
});

export const patientActions = patientSlice.actions;

export const fetchPatients = () => {
  return async (dispatch) => {
    try {
      dispatch(patientActions.setLoading(true));
      dispatch(patientActions.setPatientsStatus('loading'));
      const response = await clinicalService.getPatients();
      dispatch(patientActions.setPatientsList(response));
      dispatch(patientActions.setPatientsStatus('succeeded'));
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message || "Failed to fetch patients";
      dispatch(patientActions.setError(errorMsg));
      toast.error("Failed to fetch patients");
      setTimeout(() => dispatch(patientActions.setError(null)), 3000);
    } finally {
      dispatch(patientActions.setLoading(false));
    }
  };
};

export const fetchArchivedPatients = () => {
  return async (dispatch) => {
    try {
      dispatch(patientActions.setLoading(true));
      dispatch(patientActions.setArchivedStatus('loading'));
      const response = await clinicalService.getPatients(true);
      dispatch(patientActions.setArchivedList(response));
      dispatch(patientActions.setArchivedStatus('succeeded'));
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message || "Failed to fetch archived patients";
      dispatch(patientActions.setError(errorMsg));
      toast.error("Failed to fetch archived patients");
      setTimeout(() => dispatch(patientActions.setError(null)), 3000);
    } finally {
      dispatch(patientActions.setLoading(false));
    }
  };
};

export const addNewPatient = (patientData) => {
  return async (dispatch) => {
    try {
      dispatch(patientActions.setLoading(true));
      const response = await clinicalService.createPatient(patientData);
      dispatch(patientActions.addPatient(response));
      toast.success("Patient added successfully");
      dispatch(
        notificationActions.addNotification({
          title: "Patient Added",
          message: "New patient added successfully",
          type: "success",
        })
      );
      return response;
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message || "Failed to add patient";
      dispatch(patientActions.setError(errorMsg));
      dispatch(
        notificationActions.addNotification({
          title: "Add Patient Failed",
          message: errorMsg,
          type: "error",
        })
      );
      toast.error(errorMsg);
      setTimeout(() => dispatch(patientActions.setError(null)), 3000);
      throw error;
    } finally {
      dispatch(patientActions.setLoading(false));
    }
  };
};

export const updatePatient = (id, updates) => {
  return async (dispatch) => {
    try {
      const response = await clinicalService.updatePatient(id, updates);
      dispatch(patientActions.updatePatientInList(response));
      toast.success("Patient record updated");
      return response;
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message || "Failed to update patient";
      toast.error(errorMsg);
      throw error;
    }
  };
};

export const archivePatient = (id) => {
  return async (dispatch) => {
    try {
      dispatch(patientActions.setLoading(true));
      const response = await clinicalService.archivePatient(id);
      dispatch(patientActions.removePatientFromList(response));
      dispatch(patientActions.addArchivedPatient(response));
      toast.success("Patient archived successfully");
      dispatch(
        notificationActions.addNotification({
          title: "Patient Archived",
          message: "Patient archived successfully",
          type: "success",
        })
      );
      return response;
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message || "Failed to archive patient";
      dispatch(patientActions.setError(errorMsg));
      toast.error(errorMsg);
      setTimeout(() => dispatch(patientActions.setError(null)), 3000);
      throw error;
    } finally {
      dispatch(patientActions.setLoading(false));
    }
  };
};

export const unarchivePatient = (id) => {
  return async (dispatch) => {
    try {
      dispatch(patientActions.setLoading(true));
      const response = await clinicalService.unarchivePatient(id);
      dispatch(patientActions.removeArchivedPatient(response));
      dispatch(patientActions.addPatient(response));
      toast.success("Patient unarchived successfully");
      dispatch(
        notificationActions.addNotification({
          title: "Patient Unarchived",
          message: "Patient unarchived successfully",
          type: "success",
        })
      );
      return response;
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message || "Failed to unarchive patient";
      dispatch(patientActions.setError(errorMsg));
      toast.error(errorMsg);
      setTimeout(() => dispatch(patientActions.setError(null)), 3000);
      throw error;
    } finally {
      dispatch(patientActions.setLoading(false));
    }
  };
};

export const selectAllPatients = (state) => state.patients.patientsList;
export const selectPatientError = (state) => state.patients.error;
export const selectPatientById = (state, patientId) => state.patients.patientsList.find(p => p.id === patientId);
export const selectPatientStatus = (state) => state.patients.patientsStatus;
export const selectArchivedPatients = (state) => state.patients.archivedList;
export const selectArchivedPatientStatus = (state) => state.patients.archivedStatus;

export default patientSlice.reducer;