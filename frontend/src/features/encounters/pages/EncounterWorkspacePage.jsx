import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams, useNavigate } from "react-router-dom";
import { usePatientDetail, usePatients } from "../../../common/hooks/usePatients";
import { usePatientEncounters } from "../../../common/hooks/useEncounters";
import axiosInstance from "../../../config/axios";
import apiClient from "../../../services/api/apiClient";
import { API_ENDPOINTS } from "../../../common/constants/apiEndpoints";
import Card from "../../../components/ui/Card";
import Button from "../../../components/ui/Button";
import StatusBadge from "../../../components/ui/Badge";
import ExplainabilityModal from "../../explainability/components/ExplainabilityModal/ExplainabilityModal";
import DocumentVisionViewer from "../../documents/components/DocumentVisionViewer";
import VoiceInputButton from "../../../components/ui/VoiceInputButton";
import {
    ArrowLeft, FileText, Beaker, Image as ImageIcon, Activity,
    Sparkles, Brain, ChevronRight, CheckCircle, Stethoscope, Pill, Send, Info, AlertTriangle, Layers, Database,
    Trash2, Edit2, Save, X, Loader2
} from "lucide-react";
import PathwayTab from "../../clinical/components/AIInsightsColumn/PathwayTab";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";
import { setSuggestedCodes, setAiGenerating } from "../../../store/slices/clinicalSlice";
import { createEncounter, updateEncounterVitals, executeAiWorkflow, fetchAiWorkflow, validateNote } from "../../../store/slices/encounterSlice";
import { clinicalService } from "../../../services/api/clinicalService";
import { logPatientChartViewed, logLabReportOpened, logImagingViewed } from "../../../services/api/auditService";


import EvidenceTab from "../components/EvidenceTab";
import EncounterNotesTab from "../components/EncounterNotesTab";
import EncounterLabsTab from "../components/EncounterLabsTab";
import EncounterImagingTab from "../components/EncounterImagingTab";
import EncounterVitalsTab from "../components/EncounterVitalsTab";
import EncounterAIPane from "../components/EncounterAIPane";


// --- MAIN PAGE ---

export default function EncounterWorkspacePage() {
    const { patientId } = useParams();
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { user } = useSelector(state => state.auth);
    const { pendingAiEncounterId } = useSelector(state => state.clinical);
    const [activeTab, setActiveTab] = useState("notes");
    const [activeAiTab, setActiveAiTab] = useState("summary");
    const [isEditingAi, setIsEditingAi] = useState(false);
    const [editableAiData, setEditableAiData] = useState(null);
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
    const [editingVisionId, setEditingVisionId] = useState(null);
    const [visionEditJson, setVisionEditJson] = useState("");

    const handleDeleteVisionRecord = async (id, e) => {
        e.stopPropagation();
        if (!window.confirm("Are you sure you want to delete this AI analysis record? This will also remove it from the Document list.")) return;
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
            alert("Failed to delete.");
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
            alert("Failed to verify.");
        }
    };

    const handleStartEditVision = (rec, e) => {
        e.stopPropagation();
        setEditingVisionId(rec.id);
        setVisionEditJson(JSON.stringify(rec.clinicalFindings || [], null, 2));
    };

    const handleCancelEditVision = (e) => {
        e.stopPropagation();
        setEditingVisionId(null);
        setVisionEditJson("");
    };

    const handleSaveVisionEdit = async (rec, e) => {
        e.stopPropagation();
        try {
            const parsed = JSON.parse(visionEditJson);
            await apiClient.put(`/ai/vision/results/${rec.id}`, { clinicalFindings: parsed });
            setVisionResults(prev => prev.map(r => r.id === rec.id ? { ...r, clinicalFindings: parsed } : r));
            setEditingVisionId(null);
        } catch (error) {
            console.error("Failed to update vision record:", error);
            alert("Invalid JSON format or server error.");
        }
    };

    // LIVE DATA HOOKS
    const { patient, loading: patientLoading } = usePatientDetail(patientId);
    const { encounters, loading: encountersLoading, refetch: refetchEncounters } = usePatientEncounters(patientId);

    React.useEffect(() => {
        if (!labTrendView || !patient?.mrn) return;
        let isActive = true;
        setLabTrendsLoading(true);
        dispatch(fetchLabTrends(patient.mrn))
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
                targetEncounterId = newEncounterRes.data.id;
                await refetchEncounters();
            }
            
            dispatch(setAiGenerating(targetEncounterId));
            
            // Gather clinical notes text
            let allNotesText = latestEncounter?.notes?.map(n => n.content).join("\n\n") || "";
            
            // Include global patient notes (like CLINICAL_NOTE, PRESCRIPTION, etc.) and their comments
            if (patientNotes && patientNotes.length > 0) {
                const boundaryDate = patient?.unarchivedAt ? new Date(patient.unarchivedAt) : null;
                const currentNotes = boundaryDate ? patientNotes.filter(n => new Date(n.createdAt) >= boundaryDate) : patientNotes;
                const pastNotes = boundaryDate ? patientNotes.filter(n => new Date(n.createdAt) < boundaryDate) : [];
                
                let pNotesText = "";
                if (currentNotes.length > 0) {
                    pNotesText += "--- CURRENT EPISODE OBSERVATIONS ---\n" + currentNotes.map(n => `[${n.tag === 'CUSTOM' ? n.customTag : n.tag}] ${n.content} ${n.comment ? `(Doctor Comment: ${n.comment})` : ''}`).join("\n\n");
                }
                if (pastNotes.length > 0) {
                    const dateStr = boundaryDate ? boundaryDate.toLocaleDateString() : '';
                    pNotesText += `\n\n--- PAST MEDICAL HISTORY (PREVIOUS EPISODE${dateStr ? ' BEFORE ' + dateStr : ''}) ---\n` + pastNotes.map(n => `[${n.tag === 'CUSTOM' ? n.customTag : n.tag}] ${n.content} ${n.comment ? `(Doctor Comment: ${n.comment})` : ''}`).join("\n\n");
                }
                
                allNotesText = allNotesText ? allNotesText + "\n\n" + pNotesText.trim() : pNotesText.trim();
            }

            // --- FIX: Serialize Lab Reports ---
            const labVisionResults = visionResults.filter(r =>
                r.documentType === 'LAB_REPORT' || (!r.documentType && !['IMAGING','XRAY','MRI','CT_SCAN','DICOM'].includes(r.documentType))
            );
            if (labVisionResults.length > 0) {
                const labText = labVisionResults.map(r => {
                    const heading = r.aiHeading || r.fileKey?.split('/').pop() || 'Lab Report';
                    const date = r.analyzedAt ? new Date(r.analyzedAt).toLocaleDateString() : 'Unknown date';
                    const findings = r.clinicalFindings?.length > 0
                        ? r.clinicalFindings.map(f => `  ${f.finding || f.test_name}: ${f.result} ${f.unit || ''} ${f.flag ? `[${f.flag}]` : ''} (Ref: ${f.reference_range || 'N/A'})`).join('\n')
                        : (r.extractedText || 'No structured findings');
                    return `LAB: ${heading} (${date})\n${findings}`;
                }).join('\n\n');
                allNotesText += `\n\n--- LAB REPORTS ---\n${labText}`;
            }

            // --- FIX: Serialize Imaging Summaries ---
            const imagingVisionResults = visionResults.filter(r =>
                ['IMAGING','XRAY','MRI','CT_SCAN','DICOM'].includes(r.documentType)
            );
            if (imagingVisionResults.length > 0) {
                const imagingText = imagingVisionResults.map(r => {
                    const heading = r.aiHeading || r.fileKey?.split('/').pop() || 'Imaging Study';
                    const date = r.analyzedAt ? new Date(r.analyzedAt).toLocaleDateString() : 'Unknown date';
                    return `IMAGING: ${heading} (${date})\n${r.reportSummary || r.extractedText || 'No summary available'}`;
                }).join('\n\n');
                allNotesText += `\n\n--- IMAGING STUDIES ---\n${imagingText}`;
            }

            // --- FIX: Include current vitals ---
            if (latestEncounter?.vitals) {
                const v = latestEncounter.vitals;
                allNotesText += `\n\n--- CURRENT VITALS ---\nBP: ${v.bloodPressure || 'N/A'}, HR: ${v.heartRate || 'N/A'} bpm, O2 Sat: ${v.o2Sat || 'N/A'}%, Temp: ${v.temperature || 'N/A'}°F`;
            }
            
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
    const [editingNoteId, setEditingNoteId] = useState(null);

    // Per-patient tagged notes (Prescription, Clinical Note, History, Custom)
    const [patientNotes, setPatientNotes] = useState([]);
    const [noteTag, setNoteTag] = useState('CLINICAL_NOTE');
    const [noteCustomTag, setNoteCustomTag] = useState('');
    const [noteCommentInputs, setNoteCommentInputs] = useState({}); // noteId -> draft comment
    const [expandedNoteId, setExpandedNoteId] = useState(null);

    const TAG_CONFIG = {
        PRESCRIPTION:   { label: 'Prescription',   color: 'bg-purple-100 text-purple-700 border-purple-200' },
        CLINICAL_NOTE:  { label: 'Clinical Note',  color: 'bg-blue-100 text-blue-700 border-blue-200' },
        HISTORY:        { label: 'History',         color: 'bg-amber-100 text-amber-700 border-amber-200' },
        CUSTOM:         { label: 'Custom',           color: 'bg-neutral-100 text-neutral-700 border-neutral-200' },
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
            };
            await axiosInstance.post(`/api/clinical/patients/${patient.mrn}/notes`, payload);
            setNewNoteContent("");
            setNoteTag('CLINICAL_NOTE');
            setNoteCustomTag('');
            await loadPatientNotes(patient.mrn);
        } catch (err) {
            console.error('Failed to save patient note:', err);
            alert('Failed to save note.');
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
        }
    };

    const handleDeletePatientNote = async (noteId) => {
        if (!window.confirm('Delete this note?')) return;
        try {
            await axiosInstance.delete(`/api/clinical/patients/${patient.mrn}/notes/${noteId}`);
            setPatientNotes(prev => prev.filter(n => n.id !== noteId));
        } catch (err) {
            console.error('Failed to delete note:', err);
            alert('Failed to delete note.');
        }
    };

    const handleEditPatientNote = async (noteId, newContent) => {
        try {
            await axiosInstance.put(`/api/clinical/patients/${patient.mrn}/notes/${noteId}`, { content: newContent });
            setPatientNotes(prev => prev.map(n => n.id === noteId ? { ...n, content: newContent } : n));
        } catch (err) {
            console.error('Failed to edit note:', err);
            alert('Failed to edit note.');
            throw err;
        }
    };


    // Load previously generated AI insights + Vision results
    React.useEffect(() => {
        if (!latestEncounter) return;
        const loadSavedInsights = async () => {
            try {
                const res = await dispatch(fetchAiWorkflow(latestEncounter.id));
                if (res && res.success) {
                    setAiData(res);
                }
            } catch (err) {
                if (err.response?.status !== 404) {
                    console.error('Failed to load saved AI insights:', err);
                }
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

    const handleSaveNote = async () => {
        if (!newNoteContent.trim()) return;
        try {
            setIsSavingNote(true);
            const authorId = "dr.chen@hexamedplus.com";
            let targetEncounterId = latestEncounter?.id;

            if (!targetEncounterId) {
                const newEncounterRes = await dispatch(createEncounter({
                    patientId: patientId,
                    encounterDate: new Date().toISOString(),
                    encounterType: 'Outpatient',
                    chiefComplaint: 'Initial Visit'
                }));
                targetEncounterId = newEncounterRes.data.id;
            }
            
            if (editingNoteId) {
                await axiosInstance.put(`/api/notes/${editingNoteId}`, {
                    encounterId: targetEncounterId,
                    author: authorId,
                    noteType: "Progress",
                    content: newNoteContent
                });
                setEditingNoteId(null);
                alert("Note updated successfully!");
            } else {
                await axiosInstance.post(API_ENDPOINTS.NOTES.CREATE, {
                    encounterId: targetEncounterId,
                    author: authorId,
                    noteType: "Progress",
                    content: newNoteContent
                });
                alert("Note saved successfully!");
            }
            
            setNewNoteContent("");
            await refetchEncounters();
        } catch (error) {
            console.error("Failed to save note:", error);
            alert("Failed to save note.");
        } finally {
            setIsSavingNote(false);
        }
    };

    const [isSigning, setIsSigning] = useState(false);
    const [isSavingVitals, setIsSavingVitals] = useState(false);
    const [vitalsForm, setVitalsForm] = useState({
        bloodPressure: '',
        heartRate: '',
        o2Sat: '',
        temperature: '',
    });

    // Encounter is locked once physician has signed it (any status except IN_PROGRESS)
    const isLocked = latestEncounter && latestEncounter.status !== 'IN_PROGRESS';

    const LOCKED_STATUS_LABELS = {
        CODING_PENDING:  { text: 'Sent to Coding',     color: 'bg-amber-100 text-amber-800 border-amber-200' },
        CODING_COMPLETE: { text: 'Under Review',       color: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
        CODING_REVISION: { text: 'Revision Requested', color: 'bg-orange-100 text-orange-800 border-orange-200' },
        BILLING_READY:   { text: 'Ready for Billing',  color: 'bg-green-100 text-green-800 border-green-200' },
        BILLED:          { text: 'Billed',             color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
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
            alert("Failed to start a new encounter.");
        }
    };

    const handleSignEncounter = async () => {
        if (!latestEncounter) return;
        try {
            setIsSigning(true);
            await axiosInstance.put(API_ENDPOINTS.ENCOUNTERS.UPDATE_STATUS(latestEncounter.id), {
                status: 'CODING_PENDING'
            });
            await refetchEncounters();
        } catch (error) {
            console.error("Failed to sign encounter", error);
            alert("Failed to sign encounter.");
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
                    className="inline-flex items-center px-1.5 py-0.5 mx-1 rounded bg-indigo-100 text-indigo-700 hover:bg-indigo-200 border border-indigo-200 transition-colors text-[10px] font-bold cursor-pointer"
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
            <div className="bg-white border-b border-neutral-500 px-6 py-3 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(-1)} className="p-2 rounded-4 hover:bg-neutral-100 transition-colors">
                        <ArrowLeft className="w-5 h-5 text-neutral-700" />
                    </button>
                    <div>
                        <h2 className="text-xl font-bold text-neutral-900">{patient.firstName} {patient.lastName}</h2>
                        <p className="text-xs text-neutral-600">
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
                            disabled={isSigning || (latestEncounter?.notes || []).length === 0}
                        >
                            {isSigning ? "Signing..." : "Sign Encounter"}
                        </Button>
                    ) : (
                        <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold ${
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
                <div className="flex-1 bg-neutral-50 flex flex-col border-r border-neutral-500">
                    <EvidenceTab activeTab={activeTab} setActiveTab={setActiveTab} />

                    <div className="flex-1 p-6 overflow-y-auto">
                        {/* Locked banner */}
                        {isLocked && (
                            <div className="max-w-3xl mx-auto mb-4 flex items-start justify-between gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                <div className="flex items-start gap-3">
                                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-xs font-bold text-amber-800">Encounter Locked for Editing</p>
                                        <p className="text-xs text-amber-700 mt-0.5">This encounter has been signed and is currently <strong>{latestEncounter?.status?.replace(/_/g, ' ')}</strong>. Notes cannot be modified.</p>
                                    </div>
                                </div>
                                <Button size="sm" variant="primary" onClick={handleCreateNewEncounter}>Start New Encounter</Button>
                            </div>
                        )}

                        {activeTab === "notes" && (
                            <EncounterNotesTab 
                                isLocked={isLocked}
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
                                editingVisionId={editingVisionId} visionEditJson={visionEditJson} setVisionEditJson={setVisionEditJson}
                                handleCancelEditVision={handleCancelEditVision} handleSaveVisionEdit={handleSaveVisionEdit}
                                unarchivedAt={patient?.unarchivedAt}
                                patient={patient}
                            />
                        )}

                        {activeTab === "imaging" && (
                            <EncounterImagingTab 
                                visionResults={visionResults} visionLoading={visionLoading}
                                setSelectedVisionDoc={setSelectedVisionDoc} handleVerifyVisionRecord={handleVerifyVisionRecord}
                                handleStartEditVision={handleStartEditVision} handleDeleteVisionRecord={handleDeleteVisionRecord}
                                editingVisionId={editingVisionId} visionEditJson={visionEditJson} setVisionEditJson={setVisionEditJson}
                                handleCancelEditVision={handleCancelEditVision} handleSaveVisionEdit={handleSaveVisionEdit}
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
                />
            )}
        </div>
    );
}
