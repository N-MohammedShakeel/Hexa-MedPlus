import apiClient from './apiClient';

/**
 * HIPAA Audit Service
 * Fires structured audit log events to the backend.
 *
 * Event Categories:
 *   PHI_ACCESS    — chart/lab/imaging viewed
 *   AUTH          — login/logout
 *   CLINICAL_DATA — note/vitals created/edited/deleted
 *   LIFECYCLE     — patient archived/unarchived, encounter locked
 *   DATA_EXPORT   — CSV/PDF exports
 *   AI            — AI insight generation (legacy)
 */

// --- Internal helper ---
const _log = async (payload) => {
  try {
    await apiClient.post('/ai/audits', payload);
  } catch (err) {
    // Audit logging must NEVER crash the UI. Silent fail.
    console.warn('[AuditService] Failed to log event:', payload.action, err);
  }
};

// --- Helpers to get actor info from Redux or localStorage ---
const getActor = () => {
  try {
    const auth = JSON.parse(localStorage.getItem('persist:auth') || '{}');
    const user = JSON.parse(auth.user || '{}');
    return { actorId: user?.id || null, actorName: user?.fullName || user?.name || 'Unknown User' };
  } catch {
    return { actorId: null, actorName: 'Unknown User' };
  }
};

// ─────────────────────────────────────────────────────────────
// PHI ACCESS
// ─────────────────────────────────────────────────────────────
export const logPatientChartViewed = (patientMrn, patientName) => {
  const { actorId, actorName } = getActor();
  return _log({
    action: 'PATIENT_CHART_VIEWED',
    event_category: 'PHI_ACCESS',
    actor_name: actorName,
    actor_type: 'USER',
    actor_id: actorId,
    patient_mrn: patientMrn,
    details: `Chart opened for patient: ${patientName || patientMrn}`,
  });
};

export const logLabReportOpened = (patientMrn) => {
  const { actorId, actorName } = getActor();
  return _log({
    action: 'LAB_REPORT_OPENED',
    event_category: 'PHI_ACCESS',
    actor_name: actorName,
    actor_type: 'USER',
    actor_id: actorId,
    patient_mrn: patientMrn,
    details: `Lab reports tab accessed for MRN: ${patientMrn}`,
  });
};

export const logImagingViewed = (patientMrn) => {
  const { actorId, actorName } = getActor();
  return _log({
    action: 'IMAGING_VIEWED',
    event_category: 'PHI_ACCESS',
    actor_name: actorName,
    actor_type: 'USER',
    actor_id: actorId,
    patient_mrn: patientMrn,
    details: `Imaging tab accessed for MRN: ${patientMrn}`,
  });
};

// ─────────────────────────────────────────────────────────────
// AUTHENTICATION
// ─────────────────────────────────────────────────────────────
export const logLoginSuccess = (username) => {
  return _log({
    action: 'USER_LOGIN_SUCCESS',
    event_category: 'AUTH',
    actor_name: username,
    actor_type: 'USER',
    details: `Successful login for user: ${username}`,
  });
};

export const logLoginFailed = (username) => {
  return _log({
    action: 'USER_LOGIN_FAILED',
    event_category: 'AUTH',
    actor_name: username || 'Unknown',
    actor_type: 'USER',
    details: `Failed login attempt for user: ${username || 'Unknown'}`,
  });
};

export const logLogout = () => {
  const { actorId, actorName } = getActor();
  return _log({
    action: 'USER_LOGOUT',
    event_category: 'AUTH',
    actor_name: actorName,
    actor_type: 'USER',
    actor_id: actorId,
    details: `User logged out: ${actorName}`,
  });
};

// ─────────────────────────────────────────────────────────────
// CLINICAL DATA MODIFICATION
// ─────────────────────────────────────────────────────────────
export const logNoteCreated = (patientMrn, noteTag) => {
  const { actorId, actorName } = getActor();
  return _log({
    action: 'NOTE_CREATED',
    event_category: 'CLINICAL_DATA',
    actor_name: actorName,
    actor_type: 'USER',
    actor_id: actorId,
    patient_mrn: patientMrn,
    details: `Clinical note created (tag: ${noteTag || 'General'}) for MRN: ${patientMrn}`,
  });
};

export const logNoteDeleted = (patientMrn, noteId) => {
  const { actorId, actorName } = getActor();
  return _log({
    action: 'NOTE_DELETED',
    event_category: 'CLINICAL_DATA',
    actor_name: actorName,
    actor_type: 'USER',
    actor_id: actorId,
    patient_mrn: patientMrn,
    details: `Clinical note deleted (id: ${noteId}) for MRN: ${patientMrn}`,
  });
};

export const logVitalsUpdated = (patientMrn, encounterId) => {
  const { actorId, actorName } = getActor();
  return _log({
    action: 'VITALS_UPDATED',
    event_category: 'CLINICAL_DATA',
    actor_name: actorName,
    actor_type: 'USER',
    actor_id: actorId,
    patient_mrn: patientMrn,
    encounter_id: encounterId,
    details: `Vitals updated for MRN: ${patientMrn} in encounter: ${encounterId}`,
  });
};

// ─────────────────────────────────────────────────────────────
// LIFECYCLE
// ─────────────────────────────────────────────────────────────
export const logPatientArchived = (patientMrn, patientName) => {
  const { actorId, actorName } = getActor();
  return _log({
    action: 'PATIENT_ARCHIVED',
    event_category: 'LIFECYCLE',
    actor_name: actorName,
    actor_type: 'USER',
    actor_id: actorId,
    patient_mrn: patientMrn,
    details: `Patient archived: ${patientName || patientMrn}`,
  });
};

export const logPatientUnarchived = (patientMrn, patientName) => {
  const { actorId, actorName } = getActor();
  return _log({
    action: 'PATIENT_UNARCHIVED',
    event_category: 'LIFECYCLE',
    actor_name: actorName,
    actor_type: 'USER',
    actor_id: actorId,
    patient_mrn: patientMrn,
    details: `Patient unarchived: ${patientName || patientMrn}`,
  });
};

export const logEncounterLocked = (encounterId, patientMrn) => {
  const { actorId, actorName } = getActor();
  return _log({
    action: 'ENCOUNTER_LOCKED',
    event_category: 'LIFECYCLE',
    actor_name: actorName,
    actor_type: 'USER',
    actor_id: actorId,
    patient_mrn: patientMrn,
    encounter_id: encounterId,
    details: `Encounter signed/locked by ${actorName}. Encounter: ${encounterId}`,
  });
};

// ─────────────────────────────────────────────────────────────
// DATA EXPORT
// ─────────────────────────────────────────────────────────────
export const logRecordExported = (exportType, count) => {
  const { actorId, actorName } = getActor();
  return _log({
    action: 'RECORD_DOWNLOADED',
    event_category: 'DATA_EXPORT',
    actor_name: actorName,
    actor_type: 'USER',
    actor_id: actorId,
    details: `${exportType} exported by ${actorName}. Records: ${count}`,
  });
};

// ─────────────────────────────────────────────────────────────
// EXPORT AUDITS AS CSV (frontend-triggered)
// ─────────────────────────────────────────────────────────────
export const downloadAuditsCsv = async () => {
  try {
    const response = await apiClient.get('/ai/audits/export', { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit-trail-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
    logRecordExported('Audit Trail CSV', 'all');
  } catch (err) {
    console.error('[AuditService] Failed to download audit CSV:', err);
    throw err;
  }
};
