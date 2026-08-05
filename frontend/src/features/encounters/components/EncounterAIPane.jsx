import React, { useState } from "react";
import Card from "../../../components/ui/Card";
import Button from "../../../components/ui/Button";
import StatusBadge from "../../../components/ui/Badge";
import DiagnosisCard from "./DiagnosisCard";
import PathwayTab from "../../clinical/components/AIInsightsColumn/PathwayTab";
import ExplainabilityModal from "../../explainability/components/ExplainabilityModal/ExplainabilityModal";
import { Sparkles, FileText, Stethoscope, Database, Layers, Brain, AlertTriangle } from "lucide-react";
import { clinicalService } from "../../../services/api/clinicalService";
import { useNavigate } from "react-router-dom";

export default function EncounterAIPane({
    aiData, setAiData,
    aiLoading, aiError,
    activeAiTab, setActiveAiTab,
    handleGenerateAI, latestEncounter, patientNotes, patientId, user,
    isLocked, renderTextWithCitations, openExplainability,
    isModalOpen, setIsModalOpen, selectedData
}) {
    const navigate = useNavigate();
    const [isEditingAi, setIsEditingAi] = useState(false);
    const [editableAiData, setEditableAiData] = useState(null);

    return (
        <div className="w-[420px] bg-white flex flex-col overflow-y-auto">
            <div className="p-4 border-b border-neutral-400 bg-info-50/30 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary-600" />
                <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wider">AI Assistance</h3>
            </div>

            <div className="flex border-b border-neutral-300 bg-neutral-50 px-2 pt-2">
                {[
                    { id: "summary", label: "Summary", icon: <FileText className="w-3.5 h-3.5" /> },
                    { id: "diagnosis", label: "Diagnosis", icon: <Stethoscope className="w-3.5 h-3.5" /> },
                    { id: "coding", label: "Coding", icon: <Database className="w-3.5 h-3.5" /> },
                    { id: "pathway", label: "Pathway", icon: <Layers className="w-3.5 h-3.5" /> },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveAiTab(tab.id)}
                        className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
                            activeAiTab === tab.id
                                ? "border-primary-500 text-primary-700 bg-white"
                                : "border-transparent text-neutral-500 hover:text-neutral-800"
                        }`}
                    >
                        {tab.icon}
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="p-4 border-b border-neutral-200 bg-neutral-50/50">
                <button
                    onClick={handleGenerateAI}
                    disabled={aiLoading || ((latestEncounter?.notes || []).length === 0 && (patientNotes || []).length === 0)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-violet-600 text-white font-semibold rounded-lg hover:bg-violet-700 disabled:opacity-70 disabled:cursor-not-allowed transition-all shadow-sm"
                >
                    {aiLoading ? (
                        <>
                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            Analyzing with Gen AI...
                        </>
                    ) : (
                        <>
                            <Sparkles className="w-4 h-4" /> {aiData ? "Regenerate Insights" : "Generate AI Insights"}
                        </>
                    )}
                </button>
            </div>

            <div className="flex-1 p-4 space-y-6">
                
                {aiError && (
                    <div className="bg-red-50 text-red-600 p-4 rounded-8 text-sm flex items-center justify-center border border-red-200">
                        {aiError}
                    </div>
                )}

                {aiData && !aiData.success && (
                    <div className="bg-red-50 text-red-600 p-4 rounded-8 text-sm flex flex-col items-center justify-center border border-red-200 mt-4">
                        <AlertTriangle className="w-6 h-6 mb-2" />
                        <span className="font-semibold">AI Workflow Execution Failed</span>
                        <span className="mt-1">{aiData.errorMessage}</span>
                    </div>
                )}

                {!aiData && !aiLoading && !aiError && (
                    <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 mt-20">
                        <Brain className="w-16 h-16 mb-4 opacity-50 text-violet-500" />
                        <p className="font-medium">AI Workspace</p>
                        <p className="text-sm mt-1">
                            Click 'Generate AI Insights' to analyze clinical data.
                        </p>
                    </div>
                )}

                {aiLoading && (
                    <div className="h-full flex items-center justify-center mt-20">
                        <div className="text-center text-violet-600">
                            <Brain className="w-12 h-12 mx-auto mb-3 animate-pulse" />
                            <p className="font-medium">Routing to Gemini Flash...</p>
                            <p className="text-xs text-slate-400 mt-1">
                                Processing RAG context & generating response
                            </p>
                        </div>
                    </div>
                )}

                {/* AI Tabs Rendering */}
                {aiData && aiData.success && (
                    <>
                        {activeAiTab === "summary" && (
                            <div className="space-y-4">
                                <div className="flex justify-between items-center mb-4">
                                    <div className="flex items-center gap-2">
                                        {aiData.summary?.editedByHuman ? (
                                            <StatusBadge status="warning" label="Physician Entered" />
                                        ) : (
                                            <StatusBadge status="success" label="AI Generated" />
                                        )}
                                    </div>
                                    {!isLocked && (
                                        isEditingAi ? (
                                            <div className="flex gap-2">
                                                <Button size="sm" variant="outline" onClick={() => setIsEditingAi(false)}>Cancel</Button>
                                                <Button size="sm" variant="primary" onClick={async () => {
                                                    try {
                                                        const updateData = {
                                                            summary: { ...editableAiData.summary, editedByHuman: true },
                                                            diagnosis: editableAiData.diagnosis ? { ...editableAiData.diagnosis, editedByHuman: true } : undefined,
                                                            codes: editableAiData.codes ? { ...editableAiData.codes, editedByHuman: true } : undefined,
                                                            pathway: editableAiData.pathway ? { ...editableAiData.pathway, editedByHuman: true } : undefined,
                                                            actorName: user?.fullName || user?.name || "Unknown Physician",
                                                            actorType: user?.role || "PHYSICIAN"
                                                        };
                                                        const updated = await clinicalService.updateAiInsight(latestEncounter.id, updateData);
                                                        setAiData(updated);
                                                        setIsEditingAi(false);
                                                    } catch (err) {
                                                        console.error("Failed to update AI insight", err);
                                                    }
                                                }}>Save Insights</Button>
                                            </div>
                                        ) : (
                                            <Button size="sm" variant="outline" onClick={() => {
                                                setIsEditingAi(true);
                                                setEditableAiData(JSON.parse(JSON.stringify(aiData)));
                                            }}>
                                                Edit Insights
                                            </Button>
                                        )
                                    )}
                                </div>
                                <div>
                                    <h4 className="text-xs font-semibold text-neutral-800 uppercase tracking-wider mb-2">Subjective</h4>
                                    <Card padding="md" className="bg-neutral-50 mb-4">
                                        {isEditingAi ? (
                                            <textarea 
                                                className="w-full text-sm text-neutral-800 p-2 border rounded focus:outline-none focus:ring-1 focus:ring-primary-500" 
                                                rows={3} 
                                                value={editableAiData?.summary?.subjective || ""} 
                                                onChange={(e) => setEditableAiData({...editableAiData, summary: {...editableAiData.summary, subjective: e.target.value}})} 
                                            />
                                        ) : (
                                            <p className="text-xs text-neutral-800 leading-relaxed">
                                                {renderTextWithCitations(aiData?.summary?.subjective)}
                                            </p>
                                        )}
                                    </Card>
                                    <h4 className="text-xs font-semibold text-neutral-800 uppercase tracking-wider mb-2">Objective</h4>
                                    <Card padding="md" className="bg-neutral-50 mb-4">
                                        {isEditingAi ? (
                                            <textarea 
                                                className="w-full text-sm text-neutral-800 p-2 border rounded focus:outline-none focus:ring-1 focus:ring-primary-500" 
                                                rows={3} 
                                                value={editableAiData?.summary?.objective || ""} 
                                                onChange={(e) => setEditableAiData({...editableAiData, summary: {...editableAiData.summary, objective: e.target.value}})} 
                                            />
                                        ) : (
                                            <p className="text-xs text-neutral-800 leading-relaxed">
                                                {renderTextWithCitations(aiData?.summary?.objective)}
                                            </p>
                                        )}
                                    </Card>
                                    <h4 className="text-xs font-semibold text-neutral-800 uppercase tracking-wider mb-2">Assessment & Plan</h4>
                                    <Card padding="md" className="bg-neutral-50">
                                        {isEditingAi ? (
                                            <>
                                                <textarea 
                                                    className="w-full text-sm text-neutral-800 p-2 border rounded mb-2 focus:outline-none focus:ring-1 focus:ring-primary-500" 
                                                    rows={2} 
                                                    value={editableAiData?.summary?.assessment || ""} 
                                                    onChange={(e) => setEditableAiData({...editableAiData, summary: {...editableAiData.summary, assessment: e.target.value}})} 
                                                />
                                                <textarea 
                                                    className="w-full text-sm text-neutral-800 p-2 border rounded focus:outline-none focus:ring-1 focus:ring-primary-500" 
                                                    rows={2} 
                                                    value={editableAiData?.summary?.plan || ""} 
                                                    onChange={(e) => setEditableAiData({...editableAiData, summary: {...editableAiData.summary, plan: e.target.value}})} 
                                                />
                                            </>
                                        ) : (
                                            <>
                                                <p className="text-xs text-neutral-800 leading-relaxed">
                                                    {renderTextWithCitations(aiData?.summary?.assessment)}
                                                </p>
                                                <p className="text-xs text-neutral-800 leading-relaxed mt-2">
                                                    {renderTextWithCitations(aiData?.summary?.plan)}
                                                </p>
                                            </>
                                        )}
                                    </Card>
                                </div>
                                
                                {aiData?.summary.criticalAlerts?.length > 0 && (
                                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                        <h4 className="text-xs font-semibold text-red-800 uppercase tracking-wider mb-2">Critical Alerts</h4>
                                        {aiData?.summary.criticalAlerts.map((alert, i) => (
                                            <p key={i} className="flex items-center gap-2 text-sm text-red-700">
                                                • {alert}
                                            </p>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {activeAiTab === "diagnosis" && (
                            <div className="space-y-4">
                                {/* Primary Diagnosis */}
                                {aiData?.diagnosis?.primaryDiagnosis && (
                                    <div>
                                        <h4 className="text-xs font-semibold text-neutral-800 uppercase tracking-wider mb-2 flex items-center gap-2">
                                            <Stethoscope className="w-4 h-4 text-primary-500" /> Primary Diagnosis
                                        </h4>
                                        <DiagnosisCard 
                                            dx={{
                                                description: aiData.diagnosis.primaryDiagnosis,
                                                code: "PRIMARY",
                                                confidenceScore: 92,
                                                ...aiData.diagnosis
                                            }} 
                                            onExplain={openExplainability} 
                                        />
                                    </div>
                                )}

                                {/* Differential Diagnoses */}
                                {aiData?.diagnosis?.differentialDiagnoses?.length > 0 && (
                                    <div>
                                        <h4 className="text-xs font-semibold text-neutral-800 uppercase tracking-wider mb-2 mt-4">
                                            Differential Diagnoses
                                        </h4>
                                        <div className="space-y-3">
                                            {aiData.diagnosis.differentialDiagnoses.map((diff, idx) => (
                                                <DiagnosisCard 
                                                    key={idx}
                                                    dx={{
                                                        description: diff,
                                                        code: `DIFF-${idx + 1}`,
                                                        confidenceScore: 75 - (idx * 10),
                                                        ...aiData.diagnosis
                                                    }} 
                                                    onExplain={openExplainability} 
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeAiTab === "coding" && (
                            <div className="space-y-4">
                                <div className="bg-white border border-neutral-300 rounded-lg p-4 shadow-sm">
                                    <h4 className="text-sm font-bold text-neutral-800 flex items-center gap-2 mb-4">
                                        <Database className="w-4 h-4 text-violet-600" /> Suggested Medical Codes
                                    </h4>
                                    
                                    <div className="space-y-3">
                                        {aiData?.codes?.suggestedCodes?.map((code, i) => (
                                            <div key={i} className="flex justify-between items-start p-3 bg-neutral-50 rounded border border-neutral-200">
                                                <div>
                                                    <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded uppercase">{code.type}</span>
                                                    <p className="text-sm font-bold text-neutral-900 mt-1">{code.code}</p>
                                                    <p className="text-xs text-neutral-600">{code.description}</p>
                                                </div>
                                                <button className="text-xs font-semibold text-primary-600 hover:text-primary-700">Approve</button>
                                            </div>
                                        ))}
                                        <div className="mt-4 pt-4 border-t border-neutral-200 flex justify-end gap-2">
                                            <Button size="sm" variant="primary" onClick={() => navigate(`/coding/${patientId}`)}>
                                                Push to Workbench
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeAiTab === "pathway" && (
                            <PathwayTab pathwaySteps={aiData?.pathway?.steps} />
                        )}
                    </>
                )}
            </div>

            {/* Render the Explainability Modal */}
            <ExplainabilityModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                data={selectedData}
            />
        </div>
    );
}
