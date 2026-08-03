import React, { useState, useEffect, useCallback } from "react";
import Card from "../../../components/ui/Card";
import Button from "../../../components/ui/Button";
import StatusBadge from "../../../components/ui/Badge";
import {
    ArrowLeft, Stethoscope, FileText, Activity, CheckCircle, XCircle,
    Edit3, ChevronDown, Sparkles, Shield, Info, Beaker, HeartPulse,
    Brain, History, Send, Save, Search, Filter, Plus, Trash2, Clock,
    AlertTriangle, User, ChevronRight, RefreshCw
} from "lucide-react";
import { useSelector } from "react-redux";
import { useParams, useNavigate } from "react-router-dom";
import { usePatientDetail, usePatients } from "../../../common/hooks/usePatients";
import { usePatientEncounters, useAllEncounters } from "../../../common/hooks/useEncounters";
import axiosInstance from "../../../config/axios";
import { API_ENDPOINTS } from "../../../common/constants/apiEndpoints";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getConfidenceBg = (c) =>
    c >= 90 ? "bg-success-500" : c >= 80 ? "bg-info-500" : c >= 70 ? "bg-amber-500" : "bg-danger-500";

const getConfidenceLabel = (c) =>
    c >= 90 ? "High" : c >= 80 ? "Medium-High" : c >= 70 ? "Medium" : "Low";

const ENCOUNTER_STATUS_CONFIG = {
    IN_PROGRESS:     { label: "In Progress",       variant: "info",    badgeClass: "bg-blue-100 text-blue-700" },
    CODING_PENDING:  { label: "Awaiting Coding",   variant: "warning", badgeClass: "bg-amber-100 text-amber-700" },
    CODING_COMPLETE: { label: "Under Review",      variant: "info",    badgeClass: "bg-indigo-100 text-indigo-700" },
    CODING_REVISION: { label: "Revision Needed",   variant: "danger",  badgeClass: "bg-red-100 text-red-700" },
    BILLING_READY:   { label: "Ready to Bill",     variant: "success", badgeClass: "bg-green-100 text-green-700" },
    BILLED:          { label: "Billed",            variant: "success", badgeClass: "bg-emerald-100 text-emerald-700" },
    SIGNED:          { label: "Signed",            variant: "success", badgeClass: "bg-teal-100 text-teal-700" },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function ConfidenceBar({ value }) {
    return (
        <div className="flex items-center gap-2 w-full">
            <div className="flex-1 h-1.5 bg-neutral-300 dark:bg-slate-700 rounded-full overflow-hidden">
                <div className={`h-full ${getConfidenceBg(value)} rounded-full transition-all`} style={{ width: `${value}%` }} />
            </div>
            <span className="text-xs font-semibold text-neutral-900 dark:text-slate-300 min-w-[36px]">{value}%</span>
        </div>
    );
}

function CodeSuggestionCard({ code, type, onAction, expanded, onToggle, isCustom, isEditable = true }) {
    const [editMode, setEditMode] = useState(false);
    const [editCode, setEditCode] = useState(code.code);
    const [editDesc, setEditDesc] = useState(code.description);

    const statusMap = {
        pending:  { variant: "neutral",  label: "Pending Review" },
        approved: { variant: "success",  label: "Approved" },
        rejected: { variant: "danger",   label: "Rejected" },
        modified: { variant: "info",     label: "Modified" },
    };
    const statusInfo = statusMap[code.status] || statusMap.pending;

    const handleSaveEdit = () => {
        onAction(code.id, "modified", { code: editCode, description: editDesc });
        setEditMode(false);
    };

    return (
        <div className={`border rounded-4 transition-all ${
            code.status === "approved" ? "border-success-300 dark:border-success-700/50 bg-success-50/30 dark:bg-success-900/10"
            : code.status === "rejected" ? "border-danger-300 dark:border-danger-700/50 bg-danger-50/30 dark:bg-danger-900/10 opacity-75"
            : "border-neutral-400 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-primary-300 dark:hover:border-primary-600"
        }`}>
            <div className="p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-start gap-3 flex-1">
                        <div className={`w-10 h-10 rounded-4 flex items-center justify-center flex-shrink-0 ${type === "icd" ? "bg-info-100 text-info-500" : "bg-primary-100 text-primary-600"}`}>
                            {type === "icd" ? <Stethoscope className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                            {editMode ? (
                                <div className="space-y-2">
                                    <input value={editCode} onChange={e => setEditCode(e.target.value)}
                                        className="w-full text-sm font-mono border border-primary-300 rounded-3 px-2 py-1 bg-white dark:bg-slate-700 dark:text-white"
                                        placeholder="Code (e.g. E11.9)" />
                                    <input value={editDesc} onChange={e => setEditDesc(e.target.value)}
                                        className="w-full text-sm border border-primary-300 rounded-3 px-2 py-1 bg-white dark:bg-slate-700 dark:text-white"
                                        placeholder="Description" />
                                    <div className="flex gap-2">
                                        <button onClick={handleSaveEdit} className="px-3 py-1 text-xs bg-primary-500 text-white rounded-3 hover:bg-primary-600">Save</button>
                                        <button onClick={() => setEditMode(false)} className="px-3 py-1 text-xs border border-neutral-400 rounded-3 hover:bg-neutral-100 dark:hover:bg-slate-700 dark:text-slate-300">Cancel</button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-mono text-base font-bold text-neutral-900 dark:text-slate-100">{code.code}</span>
                                        {code.isPrimary && <span className="px-1.5 py-0.5 bg-primary-50 dark:bg-primary-900/30 border border-primary-200 text-primary-600 text-[10px] font-bold uppercase rounded-2">Primary</span>}
                                        {isCustom && <span className="px-1.5 py-0.5 bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-bold uppercase rounded-2">Custom</span>}
                                        <StatusBadge status={statusInfo.variant} label={statusInfo.label} />
                                    </div>
                                    <p className="text-sm text-neutral-800 dark:text-slate-300 mt-1">{code.description}</p>
                                </>
                            )}
                        </div>
                    </div>
                    <button onClick={onToggle} className="p-1.5 rounded-2 hover:bg-neutral-200 dark:hover:bg-slate-700 transition-colors flex-shrink-0">
                        <ChevronDown className={`w-4 h-4 text-neutral-600 transition-transform ${expanded ? "rotate-180" : ""}`} />
                    </button>
                </div>

                {!editMode && (
                    <div className="mb-3">
                        <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-semibold text-neutral-800 dark:text-slate-400 uppercase tracking-wider">AI Confidence</span>
                            <span className="text-xs font-bold text-neutral-700 dark:text-slate-300">{getConfidenceLabel(code.confidence)}</span>
                        </div>
                        <ConfidenceBar value={code.confidence} />
                    </div>
                )}

                {expanded && !editMode && (
                    <div className="mt-4 pt-4 border-t border-neutral-400 dark:border-slate-700 space-y-4">
                        {code.evidence?.length > 0 && (
                            <div>
                                <div className="flex items-center gap-1.5 mb-2">
                                    <Sparkles className="w-3.5 h-3.5 text-primary-500" />
                                    <h5 className="text-xs font-semibold text-neutral-900 dark:text-slate-200 uppercase tracking-wider">Why Suggested</h5>
                                </div>
                                <ul className="space-y-1.5">
                                    {code.evidence.map((ev, i) => (
                                        <li key={i} className="flex items-start gap-2 text-xs text-neutral-800 dark:text-slate-300">
                                            <span className="text-primary-500 font-bold mt-0.5">›</span><span>{ev}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        {code.guideline && (
                            <div>
                                <div className="flex items-center gap-1.5 mb-2">
                                    <Shield className="w-3.5 h-3.5 text-neutral-700 dark:text-slate-400" />
                                    <h5 className="text-xs font-semibold text-neutral-900 dark:text-slate-200 uppercase tracking-wider">Clinical Guideline</h5>
                                </div>
                                <div className="p-2.5 bg-neutral-100 dark:bg-slate-800/50 border border-neutral-400 dark:border-slate-700 rounded-4">
                                    <p className="text-xs text-neutral-800 dark:text-slate-300">{code.guideline}</p>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {(!editMode && isEditable) && (
                    <div className="flex items-center gap-2 mt-4 pt-4 border-t border-neutral-400 dark:border-slate-700 flex-wrap">
                        {code.status === "pending" || code.status === "modified" ? (
                            <>
                                <Button variant="primary" size="sm" icon={CheckCircle} onClick={() => onAction(code.id, "approved")}>Approve</Button>
                                <Button variant="secondary" size="sm" icon={Edit3} onClick={() => setEditMode(true)}>Modify</Button>
                                <Button variant="ghost" size="sm" icon={XCircle} onClick={() => onAction(code.id, "rejected")} className="text-danger-600 hover:bg-danger-50">Reject</Button>
                            </>
                        ) : code.status === "approved" ? (
                            <>
                                <Button variant="ghost" size="sm" icon={Edit3} onClick={() => setEditMode(true)}>Edit</Button>
                                <Button variant="ghost" size="sm" onClick={() => onAction(code.id, "pending")}>Reset</Button>
                            </>
                        ) : (
                            <Button variant="ghost" size="sm" onClick={() => onAction(code.id, "pending")}>Reset to Pending</Button>
                        )}
                        {isCustom && (
                            <Button variant="ghost" size="sm" icon={Trash2} onClick={() => onAction(code.id, "delete")} className="ml-auto text-danger-500">Remove</Button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

function AddCustomCodeModal({ onAdd, onClose }) {
    const [codeVal, setCodeVal] = useState("");
    const [descVal, setDescVal] = useState("");
    const [codeType, setCodeType] = useState("ICD10");

    const handleAdd = () => {
        if (!codeVal.trim() || !descVal.trim()) return;
        onAdd({ code: codeVal.trim().toUpperCase(), description: descVal.trim(), type: codeType });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-800 rounded-8 shadow-2xl p-6 w-full max-w-md">
                <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-4">Add Custom Code</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-neutral-700 dark:text-slate-300 mb-1.5">Code Type</label>
                        <div className="flex gap-3">
                            {["ICD10", "CPT"].map(t => (
                                <button key={t} onClick={() => setCodeType(t)}
                                    className={`flex-1 py-2 text-sm font-semibold rounded-4 border transition-colors ${codeType === t ? "bg-primary-500 text-white border-primary-500" : "border-neutral-400 dark:border-slate-600 text-neutral-700 dark:text-slate-300 hover:border-primary-400"}`}>
                                    {t === "ICD10" ? "ICD-10" : "CPT"}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-neutral-700 dark:text-slate-300 mb-1.5">
                            {codeType === "ICD10" ? "ICD-10 Code (e.g. E11.9)" : "CPT Code (e.g. 99214)"}
                        </label>
                        <input value={codeVal} onChange={e => setCodeVal(e.target.value)}
                            className="w-full border border-neutral-400 dark:border-slate-600 rounded-4 px-3 py-2 text-sm font-mono bg-white dark:bg-slate-700 dark:text-white focus:outline-none focus:border-primary-500"
                            placeholder={codeType === "ICD10" ? "E.g. E11.65" : "E.g. 99215"} />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-neutral-700 dark:text-slate-300 mb-1.5">Description</label>
                        <input value={descVal} onChange={e => setDescVal(e.target.value)}
                            className="w-full border border-neutral-400 dark:border-slate-600 rounded-4 px-3 py-2 text-sm bg-white dark:bg-slate-700 dark:text-white focus:outline-none focus:border-primary-500"
                            placeholder="Enter code description..." />
                    </div>
                </div>
                <div className="flex gap-3 mt-6">
                    <Button variant="primary" className="flex-1" onClick={handleAdd} icon={Plus}>Add Code</Button>
                    <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
                </div>
            </div>
        </div>
    );
}

// ─── CodingList (Patient Queue) ───────────────────────────────────────────────

function CodingList() {
    const navigate = useNavigate();
    const [search, setSearch] = useState("");
    const { patients, loading: patientsLoading } = usePatients();
    const { encounters, loading: encountersLoading } = useAllEncounters();
    const CODING_STATUSES = new Set(['CODING_PENDING', 'CODING_COMPLETE', 'CODING_REVISION', 'BILLING_READY', 'BILLED']);

    if (patientsLoading || encountersLoading) {
        return <div className="p-8 text-center text-slate-500">Loading Patient Queue...</div>;
    }

    const codingQueue = (encounters || [])
        .filter(e => CODING_STATUSES.has(e.status))
        .map(e => {
            const p = (patients || []).find(pt => String(pt.id) === String(e.patientId));
            if (!p) return null;
            const statusCfg = ENCOUNTER_STATUS_CONFIG[e.status] || ENCOUNTER_STATUS_CONFIG.IN_PROGRESS;
            return {
                id: p.id, encounterId: e.id,
                encounterDate: e.encounterDate?.split('T')[0] || "—",
                status: e.status, statusCfg,
                name: `${p.firstName} ${p.lastName}`, mrn: p.mrn,
                department: e.encounterType || "General Practice"
            };
        })
        .filter(Boolean)
        .filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.mrn.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="p-8 max-w-7xl mx-auto animate-fade-in">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Coding Workbench</h1>
                    <p className="text-sm text-neutral-600 dark:text-slate-400 mt-1">Review AI-suggested ICD-10 and CPT codes for clinical encounters</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="w-4 h-4 text-neutral-600 dark:text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                            placeholder="Search patient or MRN..."
                            className="w-64 pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-neutral-400 dark:border-slate-700 rounded-6 text-sm dark:text-slate-200 focus:outline-none focus:border-primary-500" />
                    </div>
                </div>
            </div>

            <Card padding="none" className="overflow-hidden">
                {codingQueue.length === 0 ? (
                    <div className="p-12 text-center text-neutral-500 dark:text-slate-400">
                        <Brain className="w-10 h-10 mx-auto mb-3 opacity-40" />
                        <p className="font-semibold">No encounters in queue</p>
                        <p className="text-sm mt-1">Generate AI Insights from an encounter and push codes here to begin review.</p>
                    </div>
                ) : (
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-neutral-500 dark:border-slate-700 bg-neutral-100 dark:bg-slate-800/50">
                                {["Patient", "Encounter Date", "Department", "Status", "Action"].map(h => (
                                    <th key={h} className={`px-6 py-4 text-xs font-bold text-neutral-800 dark:text-slate-300 uppercase tracking-wider ${h === "Action" ? "text-right" : "text-left"}`}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-400 dark:divide-slate-700">
                            {codingQueue.map(p => (
                                <tr key={p.encounterId} className="hover:bg-neutral-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-xs">
                                                {p.name.split(' ').map(n => n[0]).join('')}
                                            </div>
                                            <div>
                                                <div className="text-sm font-bold text-neutral-900 dark:text-slate-200">{p.name}</div>
                                                <div className="text-xs text-neutral-600 dark:text-slate-400 font-mono mt-0.5">{p.mrn}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-neutral-800 dark:text-slate-300">{p.encounterDate}</td>
                                    <td className="px-6 py-4 text-sm text-neutral-800 dark:text-slate-300">{p.department}</td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-4 text-xs font-semibold ${p.statusCfg.badgeClass}`}>
                                            {p.statusCfg.label}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <Button size="sm" onClick={() => navigate(`/coding/${p.id}`)} icon={ChevronRight}>
                                            Review
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </Card>
        </div>
    );
}

// ─── CodingDetail (Code Review Screen) ───────────────────────────────────────

function CodingDetail({ patientId }) {
    const navigate = useNavigate();
    const { patient, loading: patientLoading } = usePatientDetail(patientId);
    const { encounters, loading: encountersLoading } = usePatientEncounters(patientId);
    const reduxSuggestedCodes = useSelector(state => state.clinical.suggestedCodes);

    const latestEncounter = encounters?.length > 0 ? encounters[0] : null;

    // ── State ──
    const [aiInsights, setAiInsights] = useState(null);
    const [aiInsightsLoading, setAiInsightsLoading] = useState(false);
    const [icdCodes, setIcdCodes] = useState([]);
    const [cptCodes, setCptCodes] = useState([]);
    const [customIcdCodes, setCustomIcdCodes] = useState([]);
    const [customCptCodes, setCustomCptCodes] = useState([]);
    const [expandedCards, setExpandedCards] = useState({});
    const [showAddModal, setShowAddModal] = useState(false);
    const [activityLog, setActivityLog] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSavingDraft, setIsSavingDraft] = useState(false);
    const [draftSavedAt, setDraftSavedAt] = useState(null);
    const [toast, setToast] = useState(null);

    const showToast = (msg, type = "success") => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    };

    // ── Load AI Insights & draft on encounter load ──
    useEffect(() => {
        if (!latestEncounter?.id) return;
        setAiInsightsLoading(true);

        axiosInstance.get(API_ENDPOINTS.AI.WORKFLOW_GET(latestEncounter.id))
            .then(res => {
                if (res.data) setAiInsights(res.data);
            })
            .catch(() => {})
            .finally(() => setAiInsightsLoading(false));

        // Load activity log
        axiosInstance.get(API_ENDPOINTS.ENCOUNTERS.CODING_ACTIVITY(latestEncounter.id))
            .then(res => setActivityLog(Array.isArray(res.data) ? res.data : []))
            .catch(() => {});
    }, [latestEncounter?.id]);

    // ── Derive code lists from AI insights or Redux ──
    useEffect(() => {
        let suggestedCodes = [];

        if (aiInsights?.codes?.suggestedCodes?.length > 0) {
            suggestedCodes = aiInsights.codes.suggestedCodes;
        } else if (reduxSuggestedCodes?.length > 0) {
            suggestedCodes = reduxSuggestedCodes;
        }

        // Try to restore draft first
        if (latestEncounter?.codingDraft) {
            try {
                const draft = JSON.parse(latestEncounter.codingDraft);
                if (draft.icd?.length > 0 || draft.cpt?.length > 0) {
                    setIcdCodes(draft.icd || []);
                    setCptCodes(draft.cpt || []);
                    setCustomIcdCodes(draft.customIcd || []);
                    setCustomCptCodes(draft.customCpt || []);
                    setDraftSavedAt(draft.savedAt);
                    return;
                }
            } catch (e) {}
        }

        if (suggestedCodes.length > 0) {
            const mapCode = (c, i, prefix) => ({
                id: c.id || `${prefix}-${i}`,
                code: c.code, description: c.description,
                confidence: typeof c.confidence === 'number'
                    ? Math.round((c.confidence > 1 ? c.confidence / 100 : c.confidence) * 100)
                    : 85,
                status: c.status || "pending",
                isPrimary: i === 0,
                evidence: c.evidence || ["AI Generated from clinical note"],
                guideline: c.guideline || "AI Suggested",
            });

            const icd = suggestedCodes.filter(c => {
                const t = (c.type || "").toUpperCase();
                return t.includes("ICD") || t === "DIAGNOSIS";
            }).map((c, i) => mapCode(c, i, "icd"));

            const cpt = suggestedCodes.filter(c => {
                const t = (c.type || "").toUpperCase();
                return t === "CPT" || t === "PROCEDURE";
            }).map((c, i) => mapCode(c, i, "cpt"));

            setIcdCodes(icd);
            setCptCodes(cpt);
        }
    }, [aiInsights, reduxSuggestedCodes, latestEncounter?.codingDraft]);

    // ── Action Handlers ──
    const logActivity = useCallback(async (action, codeRef = null, details = "") => {
        if (!latestEncounter?.id) return;
        const event = {
            actorName: "Medical Coder", actorType: "USER",
            action, codeRef, details, timestamp: new Date().toISOString()
        };
        try {
            const res = await axiosInstance.post(
                API_ENDPOINTS.ENCOUNTERS.CODING_ACTIVITY(latestEncounter.id), event
            );
            setActivityLog(prev => [res.data, ...prev]);
        } catch (e) {
            setActivityLog(prev => [{ ...event, id: Date.now() }, ...prev]);
        }
    }, [latestEncounter?.id]);

    const handleCodeAction = useCallback((id, newStatus, modifications = null) => {
        const updateCodes = (setter) => setter(prev => prev.map(c => {
            if (c.id !== id) return c;
            if (newStatus === "delete") return null;
            return {
                ...c, status: newStatus,
                ...(modifications ? { code: modifications.code, description: modifications.description } : {})
            };
        }).filter(Boolean));

        // Find the code for logging
        const allCodes = [...icdCodes, ...cptCodes, ...customIcdCodes, ...customCptCodes];
        const targetCode = allCodes.find(c => c.id === id);

        updateCodes(setIcdCodes);
        updateCodes(setCptCodes);
        updateCodes(setCustomIcdCodes);
        updateCodes(setCustomCptCodes);

        if (newStatus !== "delete") {
            logActivity(`CODE_${newStatus.toUpperCase()}`, targetCode?.code, modifications ? `Modified to: ${modifications.code} - ${modifications.description}` : "");
        } else {
            logActivity("CODE_DELETED", targetCode?.code, "Custom code removed");
        }
    }, [icdCodes, cptCodes, customIcdCodes, customCptCodes, logActivity]);

    const handleAddCustomCode = (newCode) => {
        const codeObj = {
            id: `custom-${Date.now()}`, ...newCode,
            confidence: 100, status: "approved", isCustom: true,
            evidence: ["Manually added by coder"], guideline: "Manual Entry"
        };
        if (newCode.type === "ICD10") setCustomIcdCodes(prev => [...prev, codeObj]);
        else setCustomCptCodes(prev => [...prev, codeObj]);
        logActivity("CODE_ADDED", newCode.code, `Custom ${newCode.type} code added: ${newCode.description}`);
        showToast(`Custom code ${newCode.code} added`);
    };

    const handleSaveDraft = async () => {
        if (!latestEncounter?.id) return;
        setIsSavingDraft(true);
        try {
            const draft = {
                icd: icdCodes, cpt: cptCodes,
                customIcd: customIcdCodes, customCpt: customCptCodes,
                savedAt: new Date().toISOString()
            };
            await axiosInstance.put(API_ENDPOINTS.ENCOUNTERS.CODING_DRAFT(latestEncounter.id), { draft });
            setDraftSavedAt(new Date().toLocaleTimeString());
            showToast("Draft saved successfully");
        } catch (e) {
            showToast("Failed to save draft", "error");
        } finally {
            setIsSavingDraft(false);
        }
    };

    const handleSubmitForReview = async () => {
        if (!latestEncounter?.id) return;
        setIsSubmitting(true);
        try {
            // Implicitly save draft first to preserve the exact code states (approved/rejected/modified)
            const draft = {
                icd: icdCodes, cpt: cptCodes,
                customIcd: customIcdCodes, customCpt: customCptCodes,
                savedAt: new Date().toISOString()
            };
            await axiosInstance.put(API_ENDPOINTS.ENCOUNTERS.CODING_DRAFT(latestEncounter.id), { draft });
            setDraftSavedAt(new Date().toLocaleTimeString());

            const allApproved = [
                ...icdCodes.filter(c => c.status === 'approved'),
                ...cptCodes.filter(c => c.status === 'approved'),
                ...customIcdCodes.filter(c => c.status === 'approved'),
                ...customCptCodes.filter(c => c.status === 'approved'),
            ];
            if (allApproved.length > 0) {
                await axiosInstance.put(API_ENDPOINTS.ENCOUNTERS.UPDATE_CODES(latestEncounter.id), { codes: allApproved });
            }
            await axiosInstance.put(API_ENDPOINTS.ENCOUNTERS.UPDATE_STATUS(latestEncounter.id), { status: 'CODING_COMPLETE' });
            logActivity("SUBMITTED_FOR_REVIEW", null, `Submitted ${allApproved.length} approved codes for physician review`);
            showToast("Submitted for physician review! ✓");
            setTimeout(() => navigate('/coding'), 1500);
        } catch (e) {
            showToast("Failed to submit", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    // ── Physician Review handlers ──
    const [showRevisionModal, setShowRevisionModal] = useState(false);
    const [revisionNote, setRevisionNote] = useState('');
    const [isApprovingBilling, setIsApprovingBilling] = useState(false);
    const [isRequestingRevision, setIsRequestingRevision] = useState(false);

    const handleApproveBilling = async () => {
        if (!latestEncounter?.id) return;
        
        const currentPending = [...icdCodes, ...cptCodes, ...customIcdCodes, ...customCptCodes]
                                .filter(c => c.status === 'pending').length;
        if (currentPending > 0) {
            showToast(`Cannot approve for billing: ${currentPending} codes are still pending.`, "error");
            return;
        }

        setIsApprovingBilling(true);
        try {
            await axiosInstance.put(`/api/encounters/${latestEncounter.id}/approve-billing`);
            logActivity("APPROVED_FOR_BILLING", null, "Codes approved by physician — sent to billing");
            showToast("Approved for billing! ✓");
            setTimeout(() => navigate('/coding'), 1500);
        } catch (e) {
            showToast("Failed to approve", "error");
        } finally {
            setIsApprovingBilling(false);
        }
    };

    const handleRequestRevision = async () => {
        if (!latestEncounter?.id || !revisionNote.trim()) return;
        setIsRequestingRevision(true);
        try {
            await axiosInstance.put(`/api/encounters/${latestEncounter.id}/request-revision`, {
                revisionNote: revisionNote.trim()
            });
            logActivity("REVISION_REQUESTED", null, revisionNote.trim());
            showToast("Revision requested — sent back to coder");
            setShowRevisionModal(false);
            setRevisionNote('');
            setTimeout(() => navigate('/coding'), 1500);
        } catch (e) {
            showToast("Failed to request revision", "error");
        } finally {
            setIsRequestingRevision(false);
        }
    };

    // ── Loading states ──
    if (patientLoading || encountersLoading) {
        return (
            <div className="p-8 max-w-7xl mx-auto">
                <div className="flex items-center gap-3 mb-6">
                    <button onClick={() => navigate('/coding')} className="p-2 rounded-4 hover:bg-neutral-200 dark:hover:bg-slate-700">
                        <ArrowLeft className="w-5 h-5 text-neutral-700 dark:text-slate-300" />
                    </button>
                    <div className="h-6 w-48 bg-neutral-200 dark:bg-slate-700 rounded animate-pulse" />
                </div>
                <div className="grid grid-cols-3 gap-6">
                    {[1,2,3].map(i => <div key={i} className="h-48 bg-neutral-200 dark:bg-slate-700 rounded-8 animate-pulse" />)}
                </div>
            </div>
        );
    }

    if (!patient) return <div className="p-8 text-center text-neutral-500">Patient not found.</div>;
    if (!latestEncounter) return <div className="p-8 text-center text-neutral-500">No encounters found for this patient.</div>;

    // ── Derive display data from encounter ──
    const vitals = [
        { label: "BP", value: latestEncounter.bloodPressure || "—" },
        { label: "HR", value: latestEncounter.heartRate ? `${latestEncounter.heartRate} bpm` : "—" },
        { label: "O₂ Sat", value: latestEncounter.o2Sat ? `${latestEncounter.o2Sat}%` : "—" },
        { label: "Temp", value: latestEncounter.temperature ? `${latestEncounter.temperature}°F` : "—" },
    ];

    const keyLabs = latestEncounter.labs || [];
    const activeConditions = latestEncounter.diagnoses || [];
    const soapSummary = aiInsights?.summary?.assessment || latestEncounter.chiefComplaint || "No summary available";

    const stats = {
        approved: [...icdCodes, ...cptCodes, ...customIcdCodes, ...customCptCodes].filter(c => c.status === 'approved').length,
        pending: [...icdCodes, ...cptCodes, ...customIcdCodes, ...customCptCodes].filter(c => c.status === 'pending').length,
        rejected: [...icdCodes, ...cptCodes, ...customIcdCodes, ...customCptCodes].filter(c => c.status === 'rejected').length,
    };

    const statusCfg = ENCOUNTER_STATUS_CONFIG[latestEncounter.status] || ENCOUNTER_STATUS_CONFIG.IN_PROGRESS;
    const isEditable = !["BILLING_READY", "BILLED", "ARCHIVED"].includes(latestEncounter.status);

    const activityIcons = { AI: <Sparkles className="w-3.5 h-3.5 text-primary-500" />, SYSTEM: <Activity className="w-3.5 h-3.5 text-neutral-500" />, USER: <User className="w-3.5 h-3.5 text-info-500" /> };
    const formatTimestamp = (ts) => {
        try { return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); } catch { return ts; }
    };

    return (
        <div className="min-h-screen bg-neutral-50 dark:bg-slate-900">
            {/* Toast */}
            {toast && (
                <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-6 shadow-xl text-sm font-semibold animate-fade-in ${toast.type === 'error' ? 'bg-danger-500 text-white' : 'bg-success-500 text-white'}`}>
                    {toast.msg}
                </div>
            )}

            {/* Header */}
            <div className="bg-white dark:bg-slate-800 border-b border-neutral-400 dark:border-slate-700 px-8 py-4">
                <div className="max-w-[1600px] mx-auto flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate('/coding')} className="p-2 rounded-4 hover:bg-neutral-100 dark:hover:bg-slate-700 transition-colors">
                            <ArrowLeft className="w-5 h-5 text-neutral-700 dark:text-slate-300" />
                        </button>
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-lg font-bold text-neutral-900 dark:text-white">
                                    {patient.firstName} {patient.lastName}
                                </h1>
                                <span className={`px-2.5 py-0.5 rounded-4 text-xs font-semibold ${statusCfg.badgeClass}`}>
                                    {statusCfg.label}
                                </span>
                                {latestEncounter.revisionNote && latestEncounter.status === 'CODING_REVISION' && (
                                    <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-semibold rounded-4">
                                        ⚠ Revision Requested
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-neutral-600 dark:text-slate-400 mt-0.5">
                                {patient.mrn} · {latestEncounter.encounterType || "Office Visit"} · {latestEncounter.encounterDate?.split("T")[0]}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {draftSavedAt && <span className="text-xs text-neutral-500 flex items-center gap-1"><Clock className="w-3.5 h-3.5" />Draft saved {draftSavedAt}</span>}

                        {/* CODING_COMPLETE: Physician Review Actions */}
                        {latestEncounter.status === 'CODING_COMPLETE' && (
                            <>
                                <Button variant="ghost" icon={RefreshCw}
                                    onClick={() => setShowRevisionModal(true)}
                                    className="text-orange-600 hover:bg-orange-50 border border-orange-300"
                                >
                                    Request Revision
                                </Button>
                                <Button variant="primary" icon={CheckCircle}
                                    onClick={handleApproveBilling}
                                    disabled={isApprovingBilling}
                                    className="bg-green-600 hover:bg-green-700"
                                >
                                    {isApprovingBilling ? "Approving..." : "Approve for Billing"}
                                </Button>
                            </>
                        )}

                        {/* Coder actions: only while editable and not yet under review */}
                        {isEditable && latestEncounter.status !== 'CODING_COMPLETE' && (
                            <>
                                <Button variant="secondary" icon={Save} onClick={handleSaveDraft} disabled={isSavingDraft}>
                                    {isSavingDraft ? "Saving..." : "Save Draft"}
                                </Button>
                                <Button variant="primary" icon={Send} onClick={handleSubmitForReview} disabled={isSubmitting}>
                                    {isSubmitting ? "Submitting..." : "Submit for Review"}
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Revision note banner */}
            {latestEncounter.revisionNote && latestEncounter.status === 'CODING_REVISION' && (
                <div className="bg-orange-50 border-b border-orange-200 px-8 py-3">
                    <div className="max-w-[1600px] mx-auto flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-semibold text-orange-800">Physician Revision Request</p>
                            <p className="text-sm text-orange-700">{latestEncounter.revisionNote}</p>
                        </div>
                    </div>
                </div>
            )}

            <div className="max-w-[1600px] mx-auto px-8 py-6">

                {/* Physician Review Banner — shown when coder has submitted for review */}
                {latestEncounter.status === 'CODING_COMPLETE' && (
                    <div className="mb-6 rounded-8 border border-indigo-200 bg-indigo-50 dark:bg-indigo-900/20 dark:border-indigo-700 p-4">
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                            <div className="flex items-start gap-3">
                                <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-800 flex items-center justify-center flex-shrink-0">
                                    <CheckCircle className="w-5 h-5 text-indigo-600 dark:text-indigo-300" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-indigo-900 dark:text-indigo-200">Pending Physician Review</p>
                                    <p className="text-xs text-indigo-700 dark:text-indigo-400 mt-0.5">
                                        The medical coder has submitted {stats.approved} approved codes. Review the codes below and approve for billing or send back for revision.
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <button onClick={() => setShowRevisionModal(true)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-5 border border-orange-300 text-orange-700 bg-white hover:bg-orange-50 transition-colors">
                                    <RefreshCw className="w-3.5 h-3.5" /> Request Revision
                                </button>
                                <button onClick={handleApproveBilling} disabled={isApprovingBilling}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-5 bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-70">
                                    <CheckCircle className="w-3.5 h-3.5" />
                                    {isApprovingBilling ? 'Approving...' : 'Approve for Billing'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Stats bar */}

                <div className="grid grid-cols-3 gap-4 mb-6">
                    {[
                        { label: "Approved", count: stats.approved, color: "text-success-600 bg-success-50 border-success-200" },
                        { label: "Pending", count: stats.pending, color: "text-amber-600 bg-amber-50 border-amber-200" },
                        { label: "Rejected", count: stats.rejected, color: "text-danger-600 bg-danger-50 border-danger-200" },
                    ].map(s => (
                        <div key={s.label} className={`flex items-center justify-between px-4 py-3 rounded-6 border ${s.color}`}>
                            <span className="text-sm font-semibold">{s.label}</span>
                            <span className="text-2xl font-bold">{s.count}</span>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-12 gap-6">
                    {/* Left: Clinical Context */}
                    <div className="col-span-4 space-y-4">
                        {/* SOAP Summary */}
                        <Card>
                            <div className="flex items-center gap-2 mb-3">
                                <Brain className="w-4 h-4 text-primary-500" />
                                <h3 className="text-sm font-bold text-neutral-900 dark:text-white">AI SOAP Summary</h3>
                            </div>
                            {aiInsightsLoading ? (
                                <div className="h-16 bg-neutral-200 dark:bg-slate-700 rounded animate-pulse" />
                            ) : (
                                <p className="text-sm text-neutral-700 dark:text-slate-300 leading-relaxed">{soapSummary}</p>
                            )}
                        </Card>

                        {/* Vitals */}
                        <Card>
                            <div className="flex items-center gap-2 mb-3">
                                <HeartPulse className="w-4 h-4 text-danger-500" />
                                <h3 className="text-sm font-bold text-neutral-900 dark:text-white">Vitals</h3>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                {vitals.map(v => (
                                    <div key={v.label} className="text-center p-2 bg-neutral-50 dark:bg-slate-800/50 rounded-4">
                                        <div className="text-lg font-bold text-neutral-900 dark:text-white">{v.value}</div>
                                        <div className="text-xs text-neutral-600 dark:text-slate-400 mt-0.5">{v.label}</div>
                                    </div>
                                ))}
                            </div>
                        </Card>

                        {/* Key Labs */}
                        {keyLabs.length > 0 && (
                            <Card>
                                <div className="flex items-center gap-2 mb-3">
                                    <Beaker className="w-4 h-4 text-info-500" />
                                    <h3 className="text-sm font-bold text-neutral-900 dark:text-white">Key Labs</h3>
                                </div>
                                <div className="space-y-2">
                                    {keyLabs.slice(0, 5).map(lab => (
                                        <div key={lab.id} className="flex items-center justify-between py-1.5 border-b border-neutral-300 dark:border-slate-700 last:border-0">
                                            <div>
                                                <div className="text-xs font-semibold text-neutral-800 dark:text-slate-200">{lab.testName}</div>
                                                {lab.referenceRange && <div className="text-[10px] text-neutral-500">Ref: {lab.referenceRange}</div>}
                                            </div>
                                            <span className={`text-sm font-bold ${lab.isAbnormal ? "text-danger-600" : "text-success-600"}`}>
                                                {lab.resultValue} {lab.unit || ""}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        )}

                        {/* Active Conditions */}
                        {activeConditions.length > 0 && (
                            <Card>
                                <div className="flex items-center gap-2 mb-3">
                                    <Activity className="w-4 h-4 text-warning-500" />
                                    <h3 className="text-sm font-bold text-neutral-900 dark:text-white">Active Conditions</h3>
                                </div>
                                <ul className="space-y-1.5">
                                    {activeConditions.map((c, i) => (
                                        <li key={i} className="flex items-center gap-2 text-sm text-neutral-800 dark:text-slate-300">
                                            <span className="w-1.5 h-1.5 rounded-full bg-primary-500 flex-shrink-0" />
                                            {c.name || c.diagnosisCode || c}
                                        </li>
                                    ))}
                                </ul>
                            </Card>
                        )}
                    </div>

                    {/* Center: Code Review */}
                    <div className="col-span-5 space-y-6">
                        {/* ICD-10 Section */}
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <Stethoscope className="w-4 h-4 text-info-500" />
                                    <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                                        ICD-10 Diagnosis Codes
                                        <span className="ml-2 px-1.5 py-0.5 bg-info-100 text-info-700 text-xs rounded-full">{icdCodes.length + customIcdCodes.length}</span>
                                    </h3>
                                </div>
                                {isEditable && (
                                    <button onClick={() => setShowAddModal(true)}
                                        className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-semibold">
                                        <Plus className="w-3.5 h-3.5" />Add Custom
                                    </button>
                                )}
                            </div>
                            <div className="space-y-3">
                                {[...icdCodes, ...customIcdCodes].length === 0 ? (
                                    <div className="text-center py-6 text-neutral-500 text-sm border-2 border-dashed border-neutral-300 rounded-6">
                                        No ICD-10 codes yet. Generate AI codes or add custom codes.
                                    </div>
                                ) : (
                                    [...icdCodes.map(c => ({ ...c, isCustom: false })), ...customIcdCodes.map(c => ({ ...c, isCustom: true }))].map(code => (
                                        <CodeSuggestionCard
                                            key={code.id} code={code} type="icd" isCustom={code.isCustom} isEditable={isEditable}
                                            expanded={!!expandedCards[code.id]}
                                            onToggle={() => setExpandedCards(p => ({ ...p, [code.id]: !p[code.id] }))}
                                            onAction={isEditable ? handleCodeAction : () => {}}
                                        />
                                    ))
                                )}
                            </div>
                        </div>

                        {/* CPT Section */}
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-primary-500" />
                                    <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                                        CPT Procedure Codes
                                        <span className="ml-2 px-1.5 py-0.5 bg-primary-100 text-primary-700 text-xs rounded-full">{cptCodes.length + customCptCodes.length}</span>
                                    </h3>
                                </div>
                                {isEditable && (
                                    <button onClick={() => setShowAddModal(true)}
                                        className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-semibold">
                                        <Plus className="w-3.5 h-3.5" />Add Custom
                                    </button>
                                )}
                            </div>
                            <div className="space-y-3">
                                {[...cptCodes, ...customCptCodes].length === 0 ? (
                                    <div className="text-center py-6 text-neutral-500 text-sm border-2 border-dashed border-neutral-300 rounded-6">
                                        No CPT codes yet.
                                    </div>
                                ) : (
                                    [...cptCodes.map(c => ({ ...c, isCustom: false })), ...customCptCodes.map(c => ({ ...c, isCustom: true }))].map(code => (
                                        <CodeSuggestionCard
                                            key={code.id} code={code} type="cpt" isCustom={code.isCustom} isEditable={isEditable}
                                            expanded={!!expandedCards[code.id]}
                                            onToggle={() => setExpandedCards(p => ({ ...p, [code.id]: !p[code.id] }))}
                                            onAction={isEditable ? handleCodeAction : () => {}}
                                        />
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right: Activity Log */}
                    <div className="col-span-3">
                        <Card className="sticky top-6">
                            <div className="flex items-center gap-2 mb-4">
                                <History className="w-4 h-4 text-neutral-600 dark:text-slate-400" />
                                <h3 className="text-sm font-bold text-neutral-900 dark:text-white">Activity Log</h3>
                                <span className="ml-auto text-xs text-neutral-500">{activityLog.length} events</span>
                            </div>
                            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                                {activityLog.length === 0 ? (
                                    <p className="text-xs text-neutral-500 text-center py-4">No activity recorded yet.</p>
                                ) : activityLog.map((event, i) => (
                                    <div key={event.id || i} className="flex gap-2.5">
                                        <div className="w-6 h-6 rounded-full bg-neutral-100 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                                            {activityIcons[event.actorType] || activityIcons.USER}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-semibold text-neutral-800 dark:text-slate-200 leading-snug">
                                                {event.action?.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}
                                                {event.codeRef && <span className="ml-1 font-mono text-primary-600">{event.codeRef}</span>}
                                            </p>
                                            <p className="text-[10px] text-neutral-500 dark:text-slate-500 mt-0.5">
                                                {event.actorName} · {formatTimestamp(event.timestamp)}
                                            </p>
                                            {event.details && (
                                                <p className="text-[10px] text-neutral-600 dark:text-slate-400 mt-0.5 truncate">{event.details}</p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-4 pt-4 border-t border-neutral-300 dark:border-slate-700">
                                <div className="flex items-center gap-2 p-3 bg-neutral-50 dark:bg-slate-800/50 rounded-4">
                                    <Shield className="w-4 h-4 text-success-500 flex-shrink-0" />
                                    <p className="text-[10px] text-neutral-600 dark:text-slate-400 leading-snug">
                                        All AI suggestions, modifications, and approvals are recorded for HIPAA &amp; CMS audit requirements.
                                    </p>
                                </div>
                            </div>
                        </Card>
                    </div>
                </div>
            </div>

            {showAddModal && (
                <AddCustomCodeModal onAdd={handleAddCustomCode} onClose={() => setShowAddModal(false)} />
            )}

            {/* Revision Request Modal */}
            {showRevisionModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-800 rounded-8 shadow-2xl p-6 w-full max-w-md">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                                <RefreshCw className="w-5 h-5 text-orange-600" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-neutral-900 dark:text-white">Request Code Revision</h3>
                                <p className="text-xs text-neutral-500 dark:text-slate-400">The coder will be notified with your feedback.</p>
                            </div>
                        </div>
                        <div className="mb-4">
                            <label className="block text-xs font-semibold text-neutral-700 dark:text-slate-300 mb-1.5">
                                Revision Notes <span className="text-danger-500">*</span>
                            </label>
                            <textarea
                                value={revisionNote}
                                onChange={e => setRevisionNote(e.target.value)}
                                rows={4}
                                placeholder="Explain what needs to be corrected (e.g. 'ICD-10 E11.65 should be E11.9 — patient does not have foot complications')..."
                                className="w-full border border-neutral-400 dark:border-slate-600 rounded-4 px-3 py-2 text-sm bg-white dark:bg-slate-700 dark:text-white focus:outline-none focus:border-primary-500 resize-none"
                            />
                        </div>
                        <div className="flex gap-3">
                            <Button variant="primary" className="flex-1 bg-orange-500 hover:bg-orange-600"
                                onClick={handleRequestRevision}
                                disabled={isRequestingRevision || !revisionNote.trim()}
                                icon={Send}
                            >
                                {isRequestingRevision ? "Sending..." : "Send to Coder"}
                            </Button>
                            <Button variant="secondary" className="flex-1" onClick={() => { setShowRevisionModal(false); setRevisionNote(''); }}>
                                Cancel
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>

    );
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export default function CodingWorkbenchPage() {
    const { patientId } = useParams();
    if (patientId) return <CodingDetail patientId={patientId} />;
    return <CodingList />;
}