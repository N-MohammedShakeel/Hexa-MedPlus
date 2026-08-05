import React from "react";
import Card from "../../../components/ui/Card";
import Button from "../../../components/ui/Button";
import { Image as ImageIcon, CheckCircle, Edit2, Trash2, Save, Brain, History } from "lucide-react";

// ─── Shared Time Boundary Divider ─────────────────────────────────────────────
function TimeBoundaryDivider({ date, label }) {
    return (
        <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-amber-200" />
            <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200 rounded-full">
                <History className="w-3 h-3 text-amber-600" />
                <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wide">{label}</span>
                {date && <span className="text-[10px] text-amber-500 ml-1">· before {new Date(date).toLocaleDateString()}</span>}
            </div>
            <div className="flex-1 h-px bg-amber-200" />
        </div>
    );
}

export default function EncounterImagingTab({
    visionResults, visionLoading,
    setSelectedVisionDoc, handleVerifyVisionRecord,
    handleStartEditVision, handleDeleteVisionRecord,
    editingVisionId, visionEditJson, setVisionEditJson,
    handleCancelEditVision, handleSaveVisionEdit,
    unarchivedAt, patient
}) {
    const boundaryDate = unarchivedAt ? new Date(unarchivedAt) : null;

    const renderImagingCard = (rec, isHistorical = false) => (
        <div key={rec.id} onClick={() => setSelectedVisionDoc(rec)} className="cursor-pointer transition-transform hover:-translate-y-0.5">
            <Card padding="md" className={`border-neutral-300 space-y-3 hover:border-violet-400 hover:shadow-md transition-all ${isHistorical ? 'border-amber-200 bg-amber-50/20' : ''}`}>
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isHistorical ? 'bg-amber-50' : 'bg-violet-50'}`}>
                            <ImageIcon className={`w-4 h-4 ${isHistorical ? 'text-amber-500' : 'text-violet-500'}`} />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-neutral-900">{rec.aiHeading || rec.fileKey?.split('/').pop() || rec.fileKey}</p>
                            <p className="text-xs text-neutral-400">{rec.documentType || 'Imaging'} · {rec.analyzedAt ? new Date(rec.analyzedAt).toLocaleString() : ''}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {isHistorical && (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded-full border border-amber-200">
                                <History className="w-3 h-3" /> Historical
                            </span>
                        )}
                        {rec.verified ? (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-200">
                                <CheckCircle className="w-3 h-3" /> Verified
                            </span>
                        ) : (
                            <button onClick={(e) => handleVerifyVisionRecord(rec.id, e)} className="text-[10px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded-full border border-emerald-200 transition-colors" title="Verify">
                                ✓ Verify
                            </button>
                        )}
                        <button onClick={(e) => handleStartEditVision(rec, e)} className="p-1.5 text-neutral-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors" title="Edit JSON">
                            <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={(e) => handleDeleteVisionRecord(rec.id, e)} className="p-1.5 text-neutral-400 hover:text-danger-600 hover:bg-danger-50 rounded transition-colors" title="Delete">
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {rec.imageMetadata && rec.imageMetadata.total_pages > 0 && rec.imageMetadata.processed_pages < rec.imageMetadata.total_pages && (
                    <div className="flex items-center gap-2 mt-2 px-3 py-2 bg-violet-50/50 text-violet-700 text-xs font-semibold rounded animate-pulse border border-violet-100">
                        <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                        Analyzing page {rec.imageMetadata.processed_pages + 1} of {rec.imageMetadata.total_pages}...
                    </div>
                )}

                {editingVisionId === rec.id ? (
                    <div className="bg-white rounded-lg p-3 border border-neutral-200 shadow-sm mt-3" onClick={e => e.stopPropagation()}>
                        <h5 className="text-xs font-bold text-neutral-800 uppercase mb-2">Edit Imaging Findings (JSON)</h5>
                        <textarea 
                            value={visionEditJson}
                            onChange={(e) => setVisionEditJson(e.target.value)}
                            className="w-full h-48 p-2 text-xs font-mono bg-neutral-900 text-slate-200 rounded border border-neutral-700 focus:outline-none focus:border-violet-500"
                        />
                        <div className="flex justify-end gap-2 mt-2">
                            <Button size="sm" variant="secondary" onClick={handleCancelEditVision}>Cancel</Button>
                            <Button size="sm" icon={Save} onClick={(e) => handleSaveVisionEdit(rec, e)}>Save</Button>
                        </div>
                    </div>
                ) : rec.reportSummary && rec.reportSummary !== 'Text document — see extracted text.' && (
                    <div className={`rounded-lg p-3 border ${isHistorical ? 'bg-amber-50/50 border-amber-200' : 'bg-violet-50 border-violet-200'}`}>
                        <p className={`text-xs font-bold uppercase mb-2 flex items-center gap-1 ${isHistorical ? 'text-amber-700' : 'text-violet-700'}`}>
                            <Brain className="w-3.5 h-3.5" /> AI Radiologist Summary
                        </p>
                        <p className={`text-sm leading-relaxed ${isHistorical ? 'text-amber-900' : 'text-violet-900'}`}>{rec.reportSummary}</p>
                    </div>
                )}
                {rec.extractedText && (
                    <div className="bg-neutral-50 rounded-lg p-3 border border-neutral-200">
                        <p className="text-xs font-bold text-neutral-500 uppercase mb-2">Extracted Text</p>
                        <pre className="text-xs text-neutral-800 font-sans whitespace-pre-wrap leading-relaxed max-h-36 overflow-y-auto">{rec.extractedText}</pre>
                    </div>
                )}
                {rec.blurryRegions?.length > 0 && (
                    <div className="border border-amber-200 rounded-lg p-3 bg-amber-50/50">
                        <p className="text-xs font-bold text-amber-700 mb-1">⚠ {rec.blurryRegions.length} region(s) needed manual review</p>
                    </div>
                )}
            </Card>
        </div>
    );

    return (
        <div className="max-w-3xl mx-auto space-y-4">
            {(() => {
                const allImagingResults = visionResults.filter(r =>
                    ['IMAGING','XRAY','MRI','CT_SCAN','DICOM'].includes(r.documentType)
                );
                if (visionLoading) return (
                    <div className="h-full flex items-center justify-center text-center p-12">
                        <div>
                            <svg className="animate-spin h-8 w-8 text-violet-500 mx-auto mb-3" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                            <p className="text-sm text-neutral-500">Loading imaging studies...</p>
                        </div>
                    </div>
                );
                if (allImagingResults.length === 0) return (
                    <div className="h-full flex items-center justify-center text-center p-12">
                        <div>
                            <ImageIcon className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
                            <p className="text-sm font-medium text-neutral-600">No imaging studies analyzed yet</p>
                            <p className="text-xs text-neutral-400 mt-1">Upload X-ray, MRI, or CT scan images from the Documents page — Vision AI will generate a clinical summary automatically.</p>
                        </div>
                    </div>
                );

                const currentImaging = boundaryDate
                    ? allImagingResults.filter(r => !r.analyzedAt || new Date(r.analyzedAt) >= boundaryDate)
                    : allImagingResults;
                const historyImaging = boundaryDate
                    ? allImagingResults.filter(r => r.analyzedAt && new Date(r.analyzedAt) < boundaryDate)
                    : [];

                return (
                    <>
                        {currentImaging.map(rec => renderImagingCard(rec, false))}
                        {historyImaging.length > 0 && (
                            <>
                                <TimeBoundaryDivider date={unarchivedAt} label="Historical Imaging Studies" />
                                <div className="bg-amber-50/40 border border-amber-100 rounded-xl p-3 mb-2">
                                    <p className="text-xs text-amber-700 font-medium">
                                        🩻 Imaging studies below are from a previous care episode and are preserved for clinical reference.
                                    </p>
                                </div>
                                {historyImaging.map(rec => renderImagingCard(rec, true))}
                            </>
                        )}
                    </>
                );
            })()}
        </div>
    );
}
