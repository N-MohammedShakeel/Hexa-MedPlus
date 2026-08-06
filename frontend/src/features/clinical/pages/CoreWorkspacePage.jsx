import React, { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useParams } from "react-router-dom";
import {
    setActiveAiTab,
    fetchAiSummary,
    fetchAiCodes,
    fetchProtocolMatch
} from "../../../store/slices/clinicalSlice";
import { selectPatientById } from "../../../store/slices/patientSlice";
import Card from "../../../components/ui/Card";
import Button from "../../../components/ui/Button";
import EmptyState from "../../../components/ui/EmptyState";
import ProtocolMatchPanel from "../components/ProtocolMatchPanel";
import { Sparkles, Brain, AlertTriangle, FlaskConical, ScanLine } from "lucide-react";

export default function CoreWorkspacePage() {
    const { patientId } = useParams();
    const dispatch = useDispatch();
    const { isAiLoading, aiSummary, suggestedCodes, activeAiTab } = useSelector(
        (state) => state.clinical
    );
    const [activeDataTab, setActiveDataTab] = useState("Notes");

    // Fetch patient from Redux
    const patient = useSelector(state => selectPatientById(state, patientId));

    // Fallback if no patient ID is found or patient is missing
    const activePatient = patient || {
        name: "John Doe",
        mrn: "MRN-908472",
        dob: "04/12/1955",
        age: 68,
        allergies: ["Penicillin", "Sulfa Drugs"],
        meds: [
            { name: "Metformin", dose: "500mg BID" },
            { name: "Lisinopril", dose: "10mg QD" },
        ],
    };

    const handleGenerateAI = () => {
        const aiRequest = {
            encounterId: "mock-enc-id",
            noteContent: activePatient.notes || "CHIEF COMPLAINT: Fatigue and polyuria x 3 weeks...",
            patientContext: `Age: ${activePatient.age}, Conditions: ${activePatient.allergies?.join(", ")}`
        };
        
        // Dispatch both thunks concurrently
        dispatch(fetchAiSummary(aiRequest));
        
        // Use a slightly different payload for codes if needed, or the same
        dispatch(fetchAiCodes({
            encounterId: "mock-enc-id",
            clinicalNote: activePatient.notes || "CHIEF COMPLAINT: Fatigue and polyuria x 3 weeks...",
            patientContext: `Age: ${activePatient.age}, Conditions: ${activePatient.allergies?.join(", ")}`
        }));
        
        // Fetch protocol match based on the note content
        dispatch(fetchProtocolMatch(activePatient.notes || "Fatigue and polyuria"));
    };

    return (
        <div className="flex flex-col h-[calc(100vh-64px)] animate-fade-in">
            {/* Top Header */}
            <div className="bg-white dark:bg-slate-900 border-b border-neutral-500 dark:border-slate-800 px-6 py-3 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4">
                    <h2 className="text-xl font-bold text-neutral-900 dark:text-white">{activePatient.name}</h2>
                    <span className="text-sm text-neutral-600 dark:text-slate-400 font-mono">MRN: {activePatient.mrn}</span>
                    <span className="text-sm text-neutral-600 dark:text-slate-400">Age: {activePatient.age || 45}</span>
                </div>
                <Button
                    onClick={handleGenerateAI}
                    disabled={isAiLoading}
                    icon={isAiLoading ? undefined : Sparkles}
                >
                    {isAiLoading ? "Analyzing with AI..." : "Generate AI Insights"}
                </Button>
            </div>

            {/* 3-Column Grid */}
            <div className="flex-1 grid grid-cols-12 gap-4 p-4 overflow-hidden bg-neutral-50 dark:bg-slate-900">

                {/* Column 1: Patient Context (Left - 3 Cols) */}
                <div className="col-span-3 space-y-4 overflow-y-auto">
                    <Card padding="md">
                        <h3 className="text-xs font-semibold text-neutral-800 dark:text-slate-300 uppercase tracking-wider mb-2">Allergies</h3>
                        <div className="flex flex-wrap gap-2">
                            {(activePatient.allergies || ["Penicillin", "Sulfa Drugs"]).map((a) => (
                                <span key={a} className="inline-flex items-center gap-1 px-2 py-1 bg-danger-50 dark:bg-danger-500/10 text-danger-600 dark:text-danger-500 text-xs font-medium rounded-6 border border-danger-200 dark:border-danger-700/50">
                                    <AlertTriangle className="w-3 h-3" />
                                    {a}
                                </span>
                            ))}
                        </div>
                    </Card>

                    <Card padding="md">
                        <h3 className="text-xs font-semibold text-neutral-800 dark:text-slate-300 uppercase tracking-wider mb-3">Active Medications</h3>
                        <div className="space-y-3">
                            {(activePatient.meds || [
                                { name: "Metformin", dose: "500mg BID" },
                                { name: "Lisinopril", dose: "10mg QD" },
                            ]).map((med) => (
                                <div key={med.name} className="flex items-start">
                                    <div className="w-2 h-2 mt-1.5 rounded-full bg-primary-500 mr-3"></div>
                                    <div>
                                        <p className="text-sm font-semibold text-neutral-900 dark:text-slate-200">{med.name}</p>
                                        <p className="text-xs text-neutral-600 dark:text-slate-400">{med.dose}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>

                {/* Column 2: Clinical Evidence (Middle - 4 Cols) */}
                <div className="col-span-4 bg-white dark:bg-slate-900 rounded-8 shadow-card border border-neutral-400 dark:border-slate-700 flex flex-col overflow-hidden">
                    <div className="flex border-b border-neutral-400 dark:border-slate-700 bg-neutral-100 dark:bg-slate-800/50 px-4 pt-2">
                        {["Notes", "Labs", "Imaging"].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveDataTab(tab)}
                                className={`px-4 py-2 text-sm font-medium border-b-2 ${activeDataTab === tab ? "border-primary-500 text-primary-600 dark:text-primary-400" : "border-transparent text-neutral-600 dark:text-slate-400 hover:text-neutral-900 dark:hover:text-slate-200"
                                    }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>
                    <div className="flex-1 p-4 overflow-y-auto">
                        {activeDataTab === "Notes" && (
                            <>
                                <div className="mb-4 flex justify-between items-center">
                                    <h4 className="font-semibold text-neutral-900 dark:text-slate-100 text-sm">General Progress Note</h4>
                                    <span className="text-xs bg-info-50 dark:bg-info-500/10 text-info-500 dark:text-info-500 px-2 py-0.5 rounded-6 font-medium">H&P</span>
                                </div>
                                <div className="text-sm text-neutral-800 dark:text-slate-300 leading-relaxed bg-neutral-50 dark:bg-slate-800 p-4 rounded-8 border border-neutral-400 dark:border-slate-700 whitespace-pre-wrap">
                                    {activePatient.notes || `CHIEF COMPLAINT: Fatigue and polyuria x 3 weeks.\n\nHISTORY OF PRESENT ILLNESS: Patient presents with a history of T2DM and HTN presenting with increased fatigue...`}
                                </div>
                            </>
                        )}
                        {activeDataTab === "Labs" && (
                            <EmptyState
                                icon={FlaskConical}
                                title="No Lab Data Linked Yet"
                                description="Lab results are not yet wired into this workspace view."
                            />
                        )}
                        {activeDataTab === "Imaging" && (
                            <EmptyState
                                icon={ScanLine}
                                title="No Imaging Linked Yet"
                                description="Imaging studies are not yet wired into this workspace view."
                            />
                        )}
                    </div>
                </div>

                {/* Column 3: AI Workspace (Right - 5 Cols) */}
                <div className="col-span-5 bg-white dark:bg-slate-900 rounded-8 shadow-card border border-neutral-400 dark:border-slate-700 flex flex-col overflow-hidden">
                    
                    {/* Add Protocol Match Panel above AI Tabs when available */}
                    <div className="p-4 pb-0">
                      <ProtocolMatchPanel />
                    </div>

                    <div className="flex border-b border-neutral-400 dark:border-slate-700 bg-neutral-100 dark:bg-slate-800/50 px-4 pt-2 mt-2">
                        {["summary", "diagnosis", "coding", "pathway"].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => dispatch(setActiveAiTab(tab))}
                                className={`px-4 py-2 text-sm font-medium capitalize border-b-2 ${activeAiTab === tab ? "border-primary-500 text-primary-600 dark:text-primary-400" : "border-transparent text-neutral-600 dark:text-slate-400 hover:text-neutral-900 dark:hover:text-slate-200"
                                    }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>

                    <div className="flex-1 p-4 overflow-y-auto">
                        {!aiSummary && !isAiLoading && (
                            <div className="h-full flex flex-col items-center justify-center text-center">
                                <Brain className="w-12 h-12 text-neutral-400 dark:text-slate-600 mb-4" />
                                <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-200 mb-2">AI Assistant Ready</h3>
                                <p className="text-sm text-neutral-600 dark:text-slate-400 max-w-xs">Click "Generate AI Insights" to analyze clinical notes and suggest codes.</p>
                            </div>
                        )}

                        {isAiLoading && (
                            <div className="h-full flex flex-col items-center justify-center text-center">
                                <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                                <p className="text-sm font-medium text-neutral-900 dark:text-slate-200">Analyzing clinical data...</p>
                            </div>
                        )}

                        {aiSummary && activeAiTab === "summary" && (
                            <div className="space-y-4 animate-fade-in">
                                <div className="flex items-center gap-3">
                                    <span className="text-xs font-semibold text-neutral-800 dark:text-slate-300">AI Confidence:</span>
                                    <div className="flex-1 h-1.5 bg-neutral-300 dark:bg-slate-700 rounded-full overflow-hidden">
                                        <div className="h-full bg-success-500 rounded-full" style={{ width: `${aiSummary.confidence}%` }}></div>
                                    </div>
                                    <span className="text-sm font-bold text-success-600 dark:text-success-500">{aiSummary.confidence.toFixed(0)}%</span>
                                </div>

                                {["subjective", "objective", "assessment", "plan"].map((section) => (
                                    <div key={section} className="border border-neutral-400 dark:border-slate-700 rounded-8 overflow-hidden">
                                        <div className="p-3 bg-neutral-100 dark:bg-slate-800/50">
                                            <span className="text-xs font-bold text-neutral-900 dark:text-slate-200 uppercase tracking-wider">{section}</span>
                                        </div>
                                        <div className="p-3 text-sm text-neutral-800 dark:text-slate-300">{aiSummary[section]}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                        
                        {aiSummary && activeAiTab === "diagnosis" && (
                            <div className="space-y-4 animate-fade-in">
                                <h4 className="text-sm font-bold text-neutral-900 dark:text-slate-100">AI Suggested Diagnoses</h4>
                                <div className="border border-primary-300 dark:border-primary-700/50 bg-primary-50 dark:bg-primary-900/20 p-4 rounded-8">
                                    <div className="flex justify-between items-start mb-2">
                                        <h5 className="font-bold text-primary-700 dark:text-primary-400">1. Type 2 Diabetes Mellitus with Hyperglycemia</h5>
                                        <span className="text-xs font-bold text-primary-600 dark:text-primary-400 bg-white dark:bg-slate-800 px-2 py-1 rounded-6 border border-primary-200 dark:border-primary-700/50">96% Match</span>
                                    </div>
                                    <p className="text-xs text-neutral-700 dark:text-slate-300 mb-2">Based on Chief Complaint, elevated HbA1c (8.2%), and current Metformin prescription.</p>
                                    <div className="text-[10px] text-neutral-600 dark:text-slate-400 font-mono">ICD-10: E11.65</div>
                                </div>
                                <div className="border border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-800/50 p-4 rounded-8">
                                    <div className="flex justify-between items-start mb-2">
                                        <h5 className="font-bold text-neutral-900 dark:text-slate-200">2. Essential Hypertension</h5>
                                        <span className="text-xs font-bold text-neutral-600 dark:text-slate-400 bg-neutral-100 dark:bg-slate-700 px-2 py-1 rounded-6">88% Match</span>
                                    </div>
                                    <p className="text-xs text-neutral-700 dark:text-slate-300 mb-2">Based on vitals history and active Lisinopril medication.</p>
                                    <div className="text-[10px] text-neutral-600 dark:text-slate-400 font-mono">ICD-10: I10</div>
                                </div>
                            </div>
                        )}

                        {aiSummary && activeAiTab === "pathway" && (
                            <div className="space-y-4 animate-fade-in">
                                <h4 className="text-sm font-bold text-neutral-900 dark:text-slate-100">Recommended Clinical Pathway</h4>
                                <div className="relative border-l-2 border-primary-200 dark:border-primary-800 ml-3 pl-4 space-y-6">
                                    <div className="relative">
                                        <div className="absolute w-3 h-3 bg-primary-500 rounded-full -left-[23px] top-1"></div>
                                        <h5 className="text-sm font-bold text-neutral-900 dark:text-slate-200">Step 1: Medication Adjustment</h5>
                                        <p className="text-xs text-neutral-700 dark:text-slate-300 mt-1">Increase Metformin or add GLP-1 receptor agonist due to uncontrolled HbA1c.</p>
                                        <span className="inline-block mt-2 text-[10px] bg-neutral-200 dark:bg-slate-700 text-neutral-800 dark:text-slate-300 px-2 py-1 rounded-6">Guideline: ADA 2024</span>
                                    </div>
                                    <div className="relative">
                                        <div className="absolute w-3 h-3 bg-neutral-300 dark:bg-slate-600 rounded-full -left-[23px] top-1"></div>
                                        <h5 className="text-sm font-bold text-neutral-900 dark:text-slate-200">Step 2: Lab Orders</h5>
                                        <p className="text-xs text-neutral-700 dark:text-slate-300 mt-1">Order Comprehensive Metabolic Panel and Microalbumin/Creatinine ratio.</p>
                                    </div>
                                    <div className="relative">
                                        <div className="absolute w-3 h-3 bg-neutral-300 dark:bg-slate-600 rounded-full -left-[23px] top-1"></div>
                                        <h5 className="text-sm font-bold text-neutral-900 dark:text-slate-200">Step 3: Follow-up</h5>
                                        <p className="text-xs text-neutral-700 dark:text-slate-300 mt-1">Schedule endocrinology follow-up in 3 months.</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {suggestedCodes.length > 0 && activeAiTab === "coding" && (
                            <div className="space-y-3 animate-fade-in">
                                <h4 className="text-sm font-bold text-neutral-900 dark:text-slate-100">Suggested ICD-10 Codes</h4>
                                {suggestedCodes.map((c) => (
                                    <div key={c.code} className="flex items-center justify-between p-3 border border-neutral-400 dark:border-slate-700 rounded-8 bg-white dark:bg-slate-800/50">
                                        <div className="flex items-center gap-3">
                                            <div>
                                                <span className="font-mono font-bold text-sm text-neutral-900 dark:text-slate-200">{c.code}</span>
                                                <p className="text-xs text-neutral-600 dark:text-slate-400">{c.description}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-16 h-1.5 bg-neutral-300 dark:bg-slate-700 rounded-full overflow-hidden">
                                                <div className="h-full bg-primary-500 rounded-full" style={{ width: `${c.confidence}%` }}></div>
                                            </div>
                                            <span className="text-xs font-medium text-neutral-800 dark:text-slate-300">{c.confidence.toFixed(0)}%</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}