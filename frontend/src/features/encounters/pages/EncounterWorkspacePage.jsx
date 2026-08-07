import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams, useNavigate } from "react-router-dom";
import { usePatientDetail } from "../../../common/hooks/usePatients";
import { usePatientEncounters } from "../../../common/hooks/useEncounters";
import axiosInstance from "../../../config/axios";
import apiClient from "../../../services/api/apiClient";
import Button from "../../../components/ui/Button";
import DocumentVisionViewer from "../../documents/components/DocumentVisionViewer";
import { ArrowLeft, CheckCircle, Send, AlertTriangle } from "lucide-react";
import { setAiGenerating } from "../../../store/slices/clinicalSlice";
import { createEncounter, executeAiWorkflow, fetchAiWorkflow, validateNote } from "../../../store/slices/encounterSlice";
import { logPatientChartViewed, logLabReportOpened, logImagingViewed, logEncounterLocked } from "../../../services/api/auditService";
import { notifySuccess, notifyError } from "../../../common/utils/toast";
import { useConfirm } from "../../../contexts/ConfirmContext";


import EvidenceTab from "../components/EvidenceTab";
import EncounterNotesTab from "../components/EncounterNotesTab";
import EncounterLabsTab from "../components/EncounterLabsTab";
import EncounterImagingTab from "../components/EncounterImagingTab";
import EncounterVitalsTab from "../components/EncounterVitalsTab";
import EncounterAIPane from "../components/EncounterAIPane";
import EditFindingsModal from "../components/EditFindingsModal";


// --- MAIN PAGE ---

export default function EncounterWorkspacePage() {
    const { patientId } = useParams();
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { user } = useSelector(state => state.auth);
    const { pendingAiEncounterId } = useSelector(state => state.clinical);
    const confirm = useConfirm();
    const [activeTab, setActiveTab] = useState("notes");
    const [activeAiTab, setActiveAiTab] = useState("summary");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedData, setSelectedData] = useState(null);
    const [selectedVisionDoc, setSelectedVisionDoc] = useState(null);

    // Vision AI results state
    const [visionResults, setVisionResults] = useState([]);
    const [visionLoading, setVisionLoading] = useState(false);

    // Lab trend view state
    const [labTrendView, setLabTrendView] = useState(false);
    const [labTrends, setLabTrends] = useState([]);
    const [labTrendsLoading, setLabTrendsLoading] = useState(false);

    // AI State
    const [aiData, setAiData] = useState(null);
    const [aiError, setAiError] = useState(null);

    // Vision Editing State
    const [editingVisionRecord, setEditingVisionRecord] = useState(null);

    const handleDeleteVisionRecord = async (id, e) => {
        if (e && e.stopPropagation) e.stopPropagation();
        const ok = await confirm("Are you sure you want to delete this AI analysis record? This will also remove it from the Document list.");
        if (!ok) return;
        const rec = visionResults.find(r => r.id === id);
        try {
            await apiClient.delete(`/ai/vision/results/${id}`);
            // Cascade: also delete the source document from document-service
            if (rec?.fileKey) {
                try { await axiosInstance.delete(`/api/documents/by-file-key/${encodeURIComponent(rec.fileKey)}`); } catch (_) {}
            }
            setVisionResults(prev => prev.filter(r => r.id !== id));
        } catch (error) {
            console.error("Failed to delete vision record:", error);
            notifyError("Failed to delete.");
        }
    };

    const handleVerifyVisionRecord = async (id, e) => {
        if (e && e.stopPropagation) {
            e.stopPropagation();
        }
        try {
            await apiClient.put(`/ai/vision/results/${id}`, { verified: true });

            // Update visionResults list
            setVisionResults(prev => prev.map(r => r.id === id ? { ...r, verified: true } : r));

            // Also sync the open modal record immediately so button disappears and badge updates
            if (selectedVisionDoc && selectedVisionDoc.id === id) {
                setSelectedVisionDoc(prev => ({ ...prev, verified: true }));
            }

            // Update global document status in document-service using fileKey
            const record = visionResults.find(r => r.id === id);
            if (record && record.fileKey) {
                try {
                    await axiosInstance.put(`/api/documents/by-file-key/${encodeURIComponent(record.fileKey)}/status?status=COMPLETED`);
                } catch (docErr) {
                    console.warn("Failed to update global document status", docErr);
                }
            }
        } catch (error) {
            console.error("Failed to verify vision record:", error);
            notifyError("Failed to verify.");
        }
    };

    const handleConfirmIdentity = async (id) => {
        try {
            await apiClient.put(`/ai/vision/results/${id}/confirm-identity`);
            setVisionResults(prev => prev.map(r => r.id === id ? { ...r, identityConfirmed: true } : r));
            if (selectedVisionDoc && selectedVisionDoc.id === id) {
                setSelectedVisionDoc(prev => ({ ...prev, identityConfirmed: true }));
            }
        } catch (error) {
            console.error("Failed to confirm identity:", error);
            notifyError("Failed to confirm patient identity.");
        }
    };

    const handleStartEditVision = (rec, e) => {
        if (e && e.stopPropagation) e.stopPropagation();
        setEditingVisionRecord(rec);
    };

    const handleSaveVisionEdit = async (id, updatedData) => {
        try {
            const payload = (typeof updatedData === 'object' && !Array.isArray(updatedData))
                ? updatedData
                : { clinicalFindings: updatedData };
            await apiClient.put(`/ai/vision/results/${id}`, payload);
            setVisionResults(prev => prev.map(r => r.id === id ? { ...r, ...payload } : r));
            if (selectedVisionDoc && selectedVisionDoc.id === id) {
                setSelectedVisionDoc(prev => ({ ...prev, ...payload }));
            }
            notifySuccess("Analysis updated successfully.");
        } catch (error) {
            console.error("Failed to update vision record:", error);
            notifyError("Failed to save changes.");
        }
    };

    // LIVE DATA HOOKS
    const { patient, loading: patientLoading } = usePatientDetail(patientId);
    const { encounters, loading: encountersLoading, refetch: refetchEncounters } = usePatientEncounters(patientId);

    React.useEffect(() => {
        if (!labTrendView || !patient?.mrn) return;
        let isActive = true;
        setLabTrendsLoading(true);
        apiClient.get(`/ai/vision/results/${patient.mrn}/labs/trend`)
            .then(res => { if (isActive) setLabTrends(res.data?.trends || []); })
            .catch(err => { console.error("Failed to load lab trends:", err); if (isActive) setLabTrends([]); })
            .finally(() => { if (isActive) setLabTrendsLoading(false); });
        return () => { isActive = false; };
    }, [labTrendView, patient?.mrn]);

    // AUDIT: Log chart viewed on mount (when patient data loads)
    React.useEffect(() => {
        if (patient?.mrn) {
            logPatientChartViewed(patient.mrn, `${patient.firstName || ''} ${patient.lastName || ''}`.trim());
        }
    }, [patient?.mrn]);

    // AUDIT: Log tab access for PHI (labs and imaging)
    React.useEffect(() => {
        if (!patient?.mrn) return;
        if (activeTab === 'labs') logLabReportOpened(patient.mrn);
        if (activeTab === 'imaging') logImagingViewed(patient.mrn);
    }, [activeTab, patient?.mrn]);
    const latestEncounter = encounters && encounters.length > 0 ? encounters[0] : null;
    
    // Derive AI loading state from Redux
    const aiLoading = pendingAiEncounterId === latestEncounter?.id;

    const handleGenerateAI = async () => {
        try {
            setAiError(null);
            
            let targetEncounterId = latestEncounter?.id;
            if (!targetEncounterId) {
                const newEncounterRes = await dispatch(createEncounter({
                    patientId: patientId,
                    encounterDate: new Date().toISOString(),
                    encounterType: 'Outpatient',
                    chiefComplaint: 'AI Generated Assessment'
                }));
                // createEncounter's thunk already returns response.data (the encounter
                // itself), not an axios response — .data here was always undefined,
                // throwing and failing the very first AI generation for a patient with
                // no prior encounter.
                targetEncounterId = newEncounterRes.id;
                await refetchEncounters();
            }
            
            dispatch(setAiGenerating(targetEncounterId));
            
            // Gather clinical notes, labs, imaging, and vitals grouped strictly by episode
            const boundaryDate = patient?.unarchivedAt ? new Date(patient.unarchivedAt) : null;
            
            // 1. Separate patient notes into Current vs Past
            const currentNotes = boundaryDate ? (patientNotes || []).filter(n => new Date(n.createdAt) >= boundaryDate) : (patientNotes || []);
            const pastNotes = boundaryDate ? (patientNotes || []).filter(n => new Date(n.createdAt) < boundaryDate) : [];
            
            let promptSections = [];
            
            // CURRENT EPISODE NOTES
            if (currentNotes.length > 0) {
                const currentNotesStr = currentNotes.map(n => `[${n.tag === 'CUSTOM' ? n.customTag : n.tag}] ${n.content} ${n.comment ? `(Doctor Comment: ${n.comment})` : ''}`).join("\n\n");
                promptSections.push(`--- CURRENT EPISODE OBSERVATIONS ---\n${currentNotesStr}`);
            } else {
                promptSections.push(`--- CURRENT EPISODE OBSERVATIONS ---\nNo new clinical notes written for current episode yet.`);
            }

            // CURRENT LAB REPORTS (analyzed during current episode)
            const currentLabs = boundaryDate 
                ? (visionResults || []).filter(r => (r.documentType === 'LAB_REPORT' || (!r.documentType && !['IMAGING','XRAY','MRI','CT_SCAN','DICOM'].includes(r.documentType))) && new Date(r.analyzedAt || r.createdAt) >= boundaryDate)
                : (visionResults || []).filter(r => r.documentType === 'LAB_REPORT' || (!r.documentType && !['IMAGING','XRAY','MRI','CT_SCAN','DICOM'].includes(r.documentType)));

            if (currentLabs.length > 0) {
                const labText = currentLabs.map(r => {
                    const heading = r.aiHeading || r.fileKey?.split('/').pop() || 'Lab Report';
                    const findings = r.clinicalFindings?.length > 0
                        ? r.clinicalFindings.map(f => `  ${f.finding || f.test_name}: ${f.result} ${f.unit || ''} ${f.flag ? `[${f.flag}]` : ''} (Ref: ${f.reference_range || 'N/A'})`).join('\n')
                        : (r.extractedText || 'No structured findings');
                    return `LAB: ${heading}\n${findings}`;
                }).join('\n\n');
                promptSections.push(`--- CURRENT LAB REPORTS ---\n${labText}`);
            }

            // CURRENT IMAGING STUDIES (analyzed during current episode)
            const currentImaging = boundaryDate 
                ? (visionResults || []).filter(r => ['IMAGING','XRAY','MRI','CT_SCAN','DICOM'].includes(r.documentType) && new Date(r.analyzedAt || r.createdAt) >= boundaryDate)
                : (visionResults || []).filter(r => ['IMAGING','XRAY','MRI','CT_SCAN','DICOM'].includes(r.documentType));

            if (currentImaging.length > 0) {
                const imagingText = currentImaging.map(r => {
                    const heading = r.aiHeading || r.fileKey?.split('/').pop() || 'Imaging Study';
                    return `IMAGING: ${heading}\n${r.reportSummary || r.extractedText || 'No summary available'}`;
                }).join('\n\n');
                promptSections.push(`--- CURRENT IMAGING STUDIES ---\n${imagingText}`);
            }

            // CURRENT VITALS
            if (latestEncounter?.vitals) {
                const v = latestEncounter.vitals;
                promptSections.push(`--- CURRENT VITALS ---\nBP: ${v.bloodPressure || 'N/A'}, HR: ${v.heartRate || 'N/A'} bpm, O2 Sat: ${v.o2Sat || 'N/A'}%, Temp: ${v.temperature || 'N/A'}°F`);
            }

            // PAST MEDICAL HISTORY (HISTORICAL CONTEXT ONLY - PREVIOUS EPISODE)
            let pastHistoryStr = "";
            if (pastNotes.length > 0) {
                pastHistoryStr += pastNotes.map(n => `[${n.tag === 'CUSTOM' ? n.customTag : n.tag}] ${n.content} ${n.comment ? `(Doctor Comment: ${n.comment})` : ''}`).join("\n");
            }

            const pastLabs = boundaryDate ? (visionResults || []).filter(r => (r.documentType === 'LAB_REPORT' || (!r.documentType && !['IMAGING','XRAY','MRI','CT_SCAN','DICOM'].includes(r.documentType))) && new Date(r.analyzedAt || r.createdAt) < boundaryDate) : [];
            if (pastLabs.length > 0) {
                pastHistoryStr += "\n[Historical Lab Reports]\n" + pastLabs.map(r => `${r.aiHeading || 'Lab'}: ${r.reportSummary || 'Historical lab record'}`).join("\n");
            }

            const pastImaging = boundaryDate ? (visionResults || []).filter(r => ['IMAGING','XRAY','MRI','CT_SCAN','DICOM'].includes(r.documentType) && new Date(r.analyzedAt || r.createdAt) < boundaryDate) : [];
            if (pastImaging.length > 0) {
                pastHistoryStr += "\n[Historical Imaging Studies]\n" + pastImaging.map(r => `${r.aiHeading || 'Imaging'}: ${r.reportSummary || 'Historical scan'}`).join("\n");
            }

            if (pastHistoryStr.trim()) {
                const dateStr = boundaryDate ? boundaryDate.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '';
                promptSections.push(`--- PAST MEDICAL HISTORY (HISTORICAL CONTEXT ONLY - PREVIOUS EPISODE BEFORE ${dateStr}) ---\nCRITICAL INSTRUCTION FOR AI: The following records belong strictly to a PREVIOUS care episode. Treat as resolved/historical background context ONLY. Do NOT use past symptoms (e.g. headaches, hypertension) or past imaging findings as current active diagnoses unless explicitly noted in CURRENT EPISODE OBSERVATIONS above.\n\n${pastHistoryStr.trim()}`);
            }

            const allNotesText = promptSections.join("\n\n");
            
            // Prepare patient context
            const patientContext = `${patient.firstName} ${patient.lastName}, ${patient.dob}, ${patient.gender}. MRN: ${patient.mrn}`;

            const response = await dispatch(executeAiWorkflow({
                encounterId: targetEncounterId,
                noteContent: allNotesText,
                patientContext: patientContext
            }, targetEncounterId));
            
            setAiData(response);
            
        } catch (error) {
            console.error("AI Generation Failed:", error);
            setAiError("Failed to generate AI insights. Please try again.");
        } finally {
            dispatch(setAiGenerating(null));
        }
    };

    const [newNoteContent, setNewNoteContent] = useState("");
    const [isSavingNote, setIsSavingNote] = useState(false);
    const [noteAlert, setNoteAlert] = useState(null);

    // Per-patient tagged notes (Prescription, Clinical Note, History, Custom)
    const [patientNotes, setPatientNotes] = useState([]);
    const [noteTag, setNoteTag] = useState('CLINICAL_NOTE');
    const [noteCustomTag, setNoteCustomTag] = useState('');
    const [noteCommentInputs, setNoteCommentInputs] = useState({}); // noteId -> draft comment
    const [expandedNoteId, setExpandedNoteId] = useState(null);

    const TAG_CONFIG = {
        PRESCRIPTION:   { label: 'Prescription',   color: 'bg-primary-50 text-primary-700 border-primary-200 dark:bg-primary-900/20 dark:text-primary-400 dark:border-primary-800' },
        CLINICAL_NOTE:  { label: 'Clinical Note',  color: 'bg-info-50 text-info-600 border-info-200 dark:bg-info-900/20 dark:text-info-500 dark:border-info-800' },
        HISTORY:        { label: 'History',         color: 'bg-warning-50 text-warning-500 border-warning-200 dark:bg-warning-500/10 dark:border-warning-500/30' },
        CUSTOM:         { label: 'Custom',           color: 'bg-neutral-100 text-neutral-700 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700' },
    };

    const loadPatientNotes = async (mrn) => {
        try {
            const res = await axiosInstance.get(`/api/clinical/patients/${mrn}/notes`);
            setPatientNotes(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error('Failed to load patient notes:', err);
        }
    };

    const handleSavePatientNote = async () => {
        if (!newNoteContent.trim() || !patient?.mrn) return;
        try {
            setIsSavingNote(true);
            const payload = {
                tag: noteTag,
                customTag: noteTag === 'CUSTOM' ? noteCustomTag : undefined,
                content: newNoteContent.trim(),
                status: 'Active',
                encounterId: latestEncounter?.id || undefined,
            };
            await axiosInstance.post(`/api/clinical/patients/${patient.mrn}/notes`, payload);
            setNewNoteContent("");
            setNoteTag('CLINICAL_NOTE');
            setNoteCustomTag('');
            await loadPatientNotes(patient.mrn);
            notifySuccess('Note saved');
        } catch (err) {
            console.error('Failed to save patient note:', err);
            notifyError('Failed to save note.');
        } finally {
            setIsSavingNote(false);
        }
    };

    const handleSaveNoteComment = async (note) => {
        const comment = noteCommentInputs[note.id] || '';
        if (!comment.trim()) return;
        try {
            await axiosInstance.put(`/api/clinical/patients/${patient.mrn}/notes/${note.id}`, { comment });
            setPatientNotes(prev => prev.map(n => n.id === note.id ? { ...n, comment } : n));
            setNoteCommentInputs(prev => ({ ...prev, [note.id]: '' }));
        } catch (err) {
            console.error('Failed to save comment:', err);
            notifyError('Failed to save comment.');
        }
    };

    const handleDeletePatientNote = async (noteId) => {
        const ok = await confirm('Delete this note?');
        if (!ok) return;
        try {
            await axiosInstance.delete(`/api/clinical/patients/${patient.mrn}/notes/${noteId}`);
            setPatientNotes(prev => prev.filter(n => n.id !== noteId));
        } catch (err) {
            console.error('Failed to delete note:', err);
            notifyError('Failed to delete note.');
        }
    };

    const handleEditPatientNote = async (noteId, newContent) => {
        try {
            await axiosInstance.put(`/api/clinical/patients/${patient.mrn}/notes/${noteId}`, { content: newContent });
            setPatientNotes(prev => prev.map(n => n.id === noteId ? { ...n, content: newContent } : n));
        } catch (err) {
            console.error('Failed to edit note:', err);
            notifyError('Failed to edit note.');
            throw err;
        }
    };


    // Load previously generated AI insights + Vision results
    React.useEffect(() => {
        if (!latestEncounter) {
            setAiData(null);
            return;
        }
        const loadSavedInsights = async () => {
            try {
                const res = await dispatch(fetchAiWorkflow(latestEncounter.id));
                // A new/different encounter has no insights of its own yet — clear
                // whatever the PREVIOUS encounter left in aiData instead of leaving it
                // displayed until a refresh happens to reset it.
                setAiData(res && res.success ? res : null);
            } catch (err) {
                if (err.response?.status !== 404) {
                    console.error('Failed to load saved AI insights:', err);
                }
                setAiData(null);
            }
        };
        loadSavedInsights();
    }, [latestEncounter?.id]);

    // Load Vision AI results when patient is known — polls every 3s while processing
    React.useEffect(() => {
        if (!patient?.mrn) return;
        let intervalId = null;
        let active = true;

        const loadVisionResults = async (isInitial = false) => {
            if (isInitial) setVisionLoading(true);
            try {
                const res = await apiClient.get(`/ai/vision/results/${patient.mrn}`);
                const results = Array.isArray(res.data) ? res.data : [];
                if (active) {
                    setVisionResults(results);
                    // Stop polling when all records are fully processed
                    const anyProcessing = results.some(r =>
                        r.imageMetadata &&
                        r.imageMetadata.total_pages > 0 &&
                        r.imageMetadata.processed_pages < r.imageMetadata.total_pages
                    );
                    if (!anyProcessing && intervalId) {
                        clearInterval(intervalId);
                        intervalId = null;
                    }
                }
            } catch (err) {
                console.error('Failed to load Vision AI results:', err);
            } finally {
                if (isInitial && active) setVisionLoading(false);
            }
        };

        loadVisionResults(true);
        // Always start polling — stops itself when nothing is processing
        intervalId = setInterval(() => loadVisionResults(false), 3000);

        return () => {
            active = false;
            if (intervalId) clearInterval(intervalId);
        };
    }, [patient?.mrn]);

    // Load per-patient tagged notes when patient is known
    React.useEffect(() => {
        if (!patient?.mrn) return;
        loadPatientNotes(patient.mrn);
    }, [patient?.mrn]);


    React.useEffect(() => {
        if (!newNoteContent.trim()) {
            setNoteAlert(null);
            return;
        }
        const performValidation = async () => {
            try {
                const res = await dispatch(validateNote({
                    content: newNoteContent
                }));
                if (res && res.hasAlert) {
                    setNoteAlert(res.alertMessage);
                } else {
                    setNoteAlert(null);
                }
            } catch (err) {
                console.error("Note validation failed", err);
            }
        };
        const timeout = setTimeout(performValidation, 1000);
        return () => clearTimeout(timeout);
    }, [newNoteContent]);

const [isSigning, setIsSigning] = useState(false);

    // Encounter is locked once physician has signed it (any status except IN_PROGRESS)
    const isLocked = latestEncounter && latestEncounter.status !== 'IN_PROGRESS';

    // patientNotes is every note the patient has ever had, across all encounters —
    // scope down to just THIS encounter's own notes so a brand-new encounter can't
    // be signed just because the patient has old notes from a previous visit.
    const currentEncounterNotes = (patientNotes || []).filter(n => n.encounterId === latestEncounter?.id);

    const LOCKED_STATUS_LABELS = {
        CODING_PENDING:  { text: 'Sent to Coding',     color: 'bg-warning-50 text-warning-500 border-warning-200 dark:bg-warning-500/10 dark:border-warning-500/30' },
        CODING_COMPLETE: { text: 'Under Review',       color: 'bg-info-50 text-info-600 border-info-200 dark:bg-info-500/10 dark:text-info-500 dark:border-info-500/30' },
        CODING_REVISION: { text: 'Revision Requested', color: 'bg-danger-50 text-danger-600 border-danger-200 dark:bg-danger-500/10 dark:text-danger-500 dark:border-danger-500/30' },
        BILLING_READY:   { text: 'Ready for Billing',  color: 'bg-primary-50 text-primary-600 border-primary-200 dark:bg-primary-500/10 dark:text-primary-400 dark:border-primary-500/30' },
        BILLED:          { text: 'Billed',             color: 'bg-success-50 text-success-600 border-success-200 dark:bg-success-500/10 dark:text-success-500 dark:border-success-500/30' },
    };

    const handleCreateNewEncounter = async () => {
        try {
            await dispatch(createEncounter({
                patientId: patientId,
                encounterDate: new Date().toISOString(),
                encounterType: 'Outpatient',
                chiefComplaint: 'Follow-up Visit'
            }));
            await refetchEncounters();
        } catch (error) {
            console.error("Failed to create new encounter", error);
            notifyError("Failed to start a new encounter.");
        }
    };

    const handleSignEncounter = async () => {
        if (!latestEncounter) return;
        const ok = await confirm("Sign & lock this encounter? Existing notes become permanent — you can still add addenda afterward.");
        if (!ok) return;
        try {
            setIsSigning(true);
            const signedBy = user?.name || user?.email || 'Physician';
            await axiosInstance.put(`/api/encounters/${latestEncounter.id}/sign`, { signedBy });
            logEncounterLocked(latestEncounter.id, patient?.mrn);
            await refetchEncounters();
        } catch (error) {
            console.error("Failed to sign encounter", error);
            notifyError("Failed to sign encounter.");
        } finally {
            setIsSigning(false);
        }
    };

    if (patientLoading || encountersLoading) {
        return <div className="p-8 text-center text-slate-500">Loading Patient Workspace...</div>;
    }

    if (!patient) {
        return <div className="p-8 text-center text-red-500">Patient not found</div>;
    }

    const openExplainability = (data) => {
        // Use real AI reasoning + citations if available from DiagnosticsAgent
        const diagnosisData = aiData?.diagnosis;
        
        let combinedNotes = latestEncounter?.notes?.map(n => n.content).join("\n\n") || "";
        if (patientNotes && patientNotes.length > 0) {
            combinedNotes += "\n" + patientNotes.map(n => n.content).join("\n");
        }
        
        setSelectedData({
            title: data.name || data.code || data.title || "AI Analysis",
            reasoning: data.reasoning || diagnosisData?.reasoning || "No detailed reasoning provided by the AI.",
            citations: data.citations || diagnosisData?.citations || [],
            confidenceFactors: data.confidenceFactors || [],
            evidence: data.evidence || [
                { source: "Clinical Note", text: combinedNotes.slice(0, 200) || "No clinical note found." }
            ],
            guidelines: data.guidelines || []
        });
        setIsModalOpen(true);
    };


    const renderTextWithCitations = (text) => {
        if (!text) return null;
        // Match things like [Source: ADA] or [Doc 1]
        const regex = /\[(.*?)\]/g;
        const parts = [];
        let lastIndex = 0;
        let match;

        while ((match = regex.exec(text)) !== null) {
            if (match.index > lastIndex) {
                parts.push(<span key={`text-${lastIndex}`}>{text.substring(lastIndex, match.index)}</span>);
            }
            
            const citationText = match[1];
            parts.push(
                <button 
                    key={`cite-${match.index}`}
                    onClick={() => openExplainability({
                        title: "Document Reference",
                        evidence: [{ source: "Vector Database Match", text: `Retrieved context for: ${citationText}` }],
                        confidenceFactors: [{ label: "Vector Similarity", weight: 95 }],
                        guidelines: [{ title: citationText, section: "Highlighting Exact Match in Document..." }]
                    })}
                    className="inline-flex items-center px-1.5 py-0.5 mx-1 rounded-6 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 hover:bg-primary-100 dark:hover:bg-primary-900/30 border border-primary-200 dark:border-primary-800 transition-colors text-[10px] font-bold cursor-pointer"
                >
                    {citationText}
                </button>
            );
            lastIndex = regex.lastIndex;
        }
        
        if (lastIndex < text.length) {
            parts.push(<span key={`text-${lastIndex}`}>{text.substring(lastIndex)}</span>);
        }
        return parts;
    };

    return (
        <div className="flex flex-col h-[calc(100vh-64px)] animate-fade-in">

            {/* Top Header */}
            <div className="bg-white dark:bg-neutral-900 border-b border-neutral-500 dark:border-neutral-800 px-6 py-3 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(-1)} className="p-2 rounded-6 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
                        <ArrowLeft className="w-5 h-5 text-neutral-700 dark:text-neutral-300" />
                    </button>
                    <div>
                        <h2 className="text-xl font-bold text-neutral-900 dark:text-white">{patient.firstName} {patient.lastName}</h2>
                        <p className="text-xs text-neutral-600 dark:text-neutral-400">
                            {patient.dob} / {patient.gender} · MRN: {patient.mrn}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {!isLocked ? (
                        <Button
                            variant="secondary"
                            icon={Send}
                            onClick={handleSignEncounter}
                            disabled={isSigning || currentEncounterNotes.length === 0}
                        >
                            {isSigning ? "Signing..." : "Sign & Lock Encounter"}
                        </Button>
                    ) : (
                        <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-6 border text-xs font-bold ${
                            (LOCKED_STATUS_LABELS[latestEncounter?.status] || LOCKED_STATUS_LABELS.CODING_PENDING).color
                        }`}>
                            <CheckCircle className="w-3.5 h-3.5" />
                            {(LOCKED_STATUS_LABELS[latestEncounter?.status] || LOCKED_STATUS_LABELS.CODING_PENDING).text}
                        </span>
                    )}
                </div>
            </div>

            {/* 2-Pane Layout */}
            <div className="flex flex-1 overflow-hidden">

                
                {/* Left Pane: Clinical Evidence */}
                <div className="flex-1 bg-neutral-50 dark:bg-neutral-900/50 flex flex-col border-r border-neutral-500 dark:border-neutral-800">
                    <EvidenceTab activeTab={activeTab} setActiveTab={setActiveTab} />

                    <div className="flex-1 p-6 overflow-y-auto">
                        {/* Locked banner */}
                        {isLocked && (
                            <div className="max-w-3xl mx-auto mb-4 flex items-start justify-between gap-3 p-3 bg-warning-50 dark:bg-warning-500/10 border border-warning-200 dark:border-warning-500/30 rounded-8">
                                <div className="flex items-start gap-3">
                                    <AlertTriangle className="w-4 h-4 text-warning-500 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-xs font-bold text-warning-500">Encounter Locked for Editing</p>
                                        <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">This encounter has been signed and is currently <strong>{latestEncounter?.status?.replace(/_/g, ' ')}</strong>. Notes cannot be modified — add an addendum below instead.</p>
                                    </div>
                                </div>
                                <Button size="sm" variant="primary" onClick={handleCreateNewEncounter}>Start New Encounter</Button>
                            </div>
                        )}

                        {/* Coder requested a revision — physician needs to see why and respond with an addendum */}
                        {latestEncounter?.status === 'CODING_REVISION' && latestEncounter?.revisionNote && (
                            <div className="max-w-3xl mx-auto mb-4 flex items-start gap-3 p-3 bg-danger-50 dark:bg-danger-500/10 border border-danger-200 dark:border-danger-500/30 rounded-8">
                                <AlertTriangle className="w-4 h-4 text-danger-500 shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-xs font-bold text-danger-600 dark:text-danger-500">Coder Requested a Revision</p>
                                    <p className="text-xs text-neutral-700 dark:text-neutral-300 mt-0.5">{latestEncounter.revisionNote}</p>
                                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">Add an addendum below addressing this — the original signed note stays as-is.</p>
                                </div>
                            </div>
                        )}

                        {activeTab === "notes" && (
                            <EncounterNotesTab
                                isLocked={isLocked}
                                patient={patient}
                                latestEncounter={latestEncounter}
                                noteTag={noteTag} setNoteTag={setNoteTag}
                                noteCustomTag={noteCustomTag} setNoteCustomTag={setNoteCustomTag}
                                noteAlert={noteAlert}
                                newNoteContent={newNoteContent} setNewNoteContent={setNewNoteContent}
                                handleSavePatientNote={handleSavePatientNote} isSavingNote={isSavingNote}
                                patientNotes={patientNotes}
                                expandedNoteId={expandedNoteId} setExpandedNoteId={setExpandedNoteId}
                                handleDeletePatientNote={handleDeletePatientNote}
                                handleEditPatientNote={handleEditPatientNote}
                                noteCommentInputs={noteCommentInputs} setNoteCommentInputs={setNoteCommentInputs}
                                handleSaveNoteComment={handleSaveNoteComment}
                                TAG_CONFIG={TAG_CONFIG}
                                unarchivedAt={patient?.unarchivedAt}
                            />
                        )}

                        {activeTab === "labs" && (
                            <EncounterLabsTab 
                                labTrendView={labTrendView} setLabTrendView={setLabTrendView}
                                labTrendsLoading={labTrendsLoading} labTrends={labTrends}
                                visionResults={visionResults} visionLoading={visionLoading}
                                setSelectedVisionDoc={setSelectedVisionDoc} handleVerifyVisionRecord={handleVerifyVisionRecord}
                                handleStartEditVision={handleStartEditVision} handleDeleteVisionRecord={handleDeleteVisionRecord}
                                unarchivedAt={patient?.unarchivedAt}
                                patient={patient}
                            />
                        )}

                        {activeTab === "imaging" && (
                            <EncounterImagingTab 
                                visionResults={visionResults} visionLoading={visionLoading}
                                setSelectedVisionDoc={setSelectedVisionDoc} handleVerifyVisionRecord={handleVerifyVisionRecord}
                                handleStartEditVision={handleStartEditVision} handleDeleteVisionRecord={handleDeleteVisionRecord}
                                unarchivedAt={patient?.unarchivedAt}
                                patient={patient}
                            />
                        )}

                        {activeTab === "vitals" && (
                            <EncounterVitalsTab 
                                latestEncounter={latestEncounter}
                                isLocked={isLocked}
                                patientId={patientId}
                                refetchEncounters={refetchEncounters}
                            />
                        )}
                    </div>
                </div>

                {/* Right Pane: AI Assistance */}
                <EncounterAIPane 
                    aiData={aiData} setAiData={setAiData}
                    aiLoading={aiLoading} aiError={aiError}
                    activeAiTab={activeAiTab} setActiveAiTab={setActiveAiTab}
                    handleGenerateAI={handleGenerateAI} latestEncounter={latestEncounter}
                    patientNotes={patientNotes} patientId={patientId} user={user}
                    isLocked={isLocked} renderTextWithCitations={renderTextWithCitations}
                    openExplainability={openExplainability}
                    isModalOpen={isModalOpen} setIsModalOpen={setIsModalOpen}
                    selectedData={selectedData}
                />
            </div>

            {selectedVisionDoc && (
                <DocumentVisionViewer 
                    record={selectedVisionDoc}
                    onClose={() => setSelectedVisionDoc(null)}
                    onSaveHitl={(id, vals) => {
                        console.log("HITL saved for", id, vals);
                        setSelectedVisionDoc(null);
                    }}
                    onVerify={(id) => handleVerifyVisionRecord(id)}
                    onConfirmIdentity={(id) => handleConfirmIdentity(id)}
                    onEditFindings={(rec) => setEditingVisionRecord(rec)}
                />
            )}

            {editingVisionRecord && (
                <EditFindingsModal
                    record={editingVisionRecord}
                    onClose={() => setEditingVisionRecord(null)}
                    onSave={handleSaveVisionEdit}
                />
            )}
        </div>
    );
}
