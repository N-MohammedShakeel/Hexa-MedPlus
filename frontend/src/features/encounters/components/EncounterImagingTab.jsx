import React from "react";
import Card from "../../../components/ui/Card";
import Button from "../../../components/ui/Button";
import ImagingFindingsEditor from "./ImagingFindingsEditor";
import { Image as ImageIcon, CheckCircle, Edit2, Trash2, Save, Brain, History, Loader2, AlertTriangle } from "lucide-react";

// ─── Shared Time Boundary Divider ─────────────────────────────────────────────
function TimeBoundaryDivider({ date, label }) {
    return (
        <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-warning-200 dark:bg-warning-900/40" />
            <div className="flex items-center gap-1.5 px-3 py-1 bg-warning-50 dark:bg-warning-500/10 border border-warning-200 dark:border-warning-500/30 rounded-full">
                <History className="w-3 h-3 text-warning-500" />
                <span className="text-[11px] font-bold text-warning-500 uppercase tracking-wide">{label}</span>
                {date && <span className="text-[10px] text-warning-500/80 ml-1">· before {new Date(date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>}
            </div>
            <div className="flex-1 h-px bg-warning-200 dark:bg-warning-900/40" />
        </div>
    );
}

export default function EncounterImagingTab({
    visionResults, visionLoading,
    setSelectedVisionDoc, handleVerifyVisionRecord,
    handleStartEditVision, handleDeleteVisionRecord,
    editingVisionId, visionEditData, setVisionEditData,
    handleCancelEditVision, handleSaveVisionEdit,
    unarchivedAt, patient
}) {
    const boundaryDate = unarchivedAt ? new Date(unarchivedAt) : null;

    const renderImagingCard = (rec, isHistorical = false) => (
        <div key={rec.id} onClick={() => setSelectedVisionDoc(rec)} className="cursor-pointer transition-transform hover:-translate-y-0.5">
            <Card padding="md" className={`border-neutral-300 dark:border-neutral-700 space-y-3 hover:border-primary-400 hover:shadow-md transition-all ${isHistorical ? 'border-warning-200 dark:border-warning-900/40 bg-warning-50/20 dark:bg-warning-500/5' : ''}`}>
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                        <ImageIcon className={`w-4 h-4 ${isHistorical ? 'text-warning-500' : 'text-primary-500'}`} />
                        <div>
                            <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{rec.aiHeading || rec.fileKey?.split('/').pop() || rec.fileKey}</p>
                            <p className="text-xs text-neutral-400 dark:text-neutral-500">{rec.documentType || 'Imaging'} · {rec.analyzedAt ? new Date(rec.analyzedAt).toLocaleString() : ''}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {isHistorical && (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-warning-500 bg-warning-50 dark:bg-warning-500/10 px-2 py-1 rounded-full border border-warning-200 dark:border-warning-500/30">
                                <History className="w-3 h-3" /> Historical
                            </span>
                        )}
                        {rec.verified ? (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-success-600 dark:text-success-500 bg-success-50 dark:bg-success-500/10 px-2 py-1 rounded-full border border-success-200 dark:border-success-500/30">
                                <CheckCircle className="w-3 h-3" /> Verified
                            </span>
                        ) : (
                            <button onClick={(e) => handleVerifyVisionRecord(rec.id, e)} className="flex items-center gap-1 text-[10px] font-bold text-success-600 dark:text-success-500 bg-success-50 dark:bg-success-500/10 hover:bg-success-100 dark:hover:bg-success-500/20 px-2 py-1 rounded-full border border-success-200 dark:border-success-500/30 transition-colors" title="Verify">
                                <CheckCircle className="w-3 h-3" /> Verify
                            </button>
                        )}
                        <button onClick={(e) => handleStartEditVision(rec, e)} className="p-1.5 text-neutral-600 dark:text-slate-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-6 transition-colors" title="Edit JSON">
                            <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={(e) => handleDeleteVisionRecord(rec.id, e)} className="p-1.5 text-neutral-600 dark:text-slate-400 hover:text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-900/20 rounded-6 transition-colors" title="Delete">
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {rec.imageMetadata && rec.imageMetadata.total_pages > 0 && rec.imageMetadata.processed_pages < rec.imageMetadata.total_pages && (
                    <div className="flex items-center gap-2 mt-2 px-3 py-2 bg-info-50 dark:bg-info-900/10 text-info-600 dark:text-info-400 text-xs font-semibold rounded-6 animate-pulse border border-info-100 dark:border-info-900/30">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Analyzing page {rec.imageMetadata.processed_pages + 1} of {rec.imageMetadata.total_pages}...
                    </div>
                )}

                {rec.reportSummary && rec.reportSummary !== 'Text document — see extracted text.' && (
                    <div className={`rounded-8 p-3 border ${isHistorical ? 'bg-warning-50/50 dark:bg-warning-500/5 border-warning-200 dark:border-warning-500/30' : 'bg-primary-50 dark:bg-primary-900/10 border-primary-200 dark:border-primary-800'}`}>
                        <p className={`text-xs font-bold uppercase mb-2 flex items-center gap-1 ${isHistorical ? 'text-warning-500' : 'text-primary-600 dark:text-primary-400'}`}>
                            <Brain className="w-3.5 h-3.5" /> AI Radiologist Summary
                        </p>
                        <p className={`text-sm leading-relaxed ${isHistorical ? 'text-warning-500' : 'text-neutral-700 dark:text-neutral-300'}`}>{rec.reportSummary}</p>
                    </div>
                )}
                {rec.extractedText && (
                    <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-8 p-3 border border-neutral-200 dark:border-neutral-800">
                        <p className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase mb-2">Extracted Text</p>
                        <pre className="text-xs text-neutral-800 dark:text-neutral-300 font-sans whitespace-pre-wrap leading-relaxed max-h-36 overflow-y-auto">{rec.extractedText}</pre>
                    </div>
                )}
                {rec.blurryRegions?.length > 0 && (
                    <div className="border border-warning-200 dark:border-warning-500/30 rounded-8 p-3 bg-warning-50/50 dark:bg-warning-500/5">
                        <p className="text-xs font-bold text-warning-500 mb-1 flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5" /> {rec.blurryRegions.length} region(s) needed manual review
                        </p>
                    </div>
                )}
            </Card>
        </div>
    );

    return (
        <div className="max-w-3xl mx-auto space-y-4">
            {(() => {
                const allImagingResults = visionResults.filter(r =>
                    ['IMAGING','XRAY','MRI','CT_SCAN','DICOM'].includes(r.documentType) ||
                    Boolean(r.imageMetadata?.modality) ||
                    (r.fileKey && /\.(png|jpg|jpeg|bmp|webp|dcm|dicom)$/i.test(r.fileKey))
                );
                if (visionLoading) return (
                    <div className="h-full flex items-center justify-center text-center p-12">
                        <div>
                            <Loader2 className="w-8 h-8 text-primary-500 mx-auto mb-3 animate-spin" />
                            <p className="text-sm text-neutral-500 dark:text-neutral-400">Loading imaging studies...</p>
                        </div>
                    </div>
                );
                if (allImagingResults.length === 0) return (
                    <div className="h-full flex items-center justify-center text-center p-12">
                        <div>
                            <ImageIcon className="w-10 h-10 text-neutral-300 dark:text-neutral-700 mx-auto mb-4" strokeWidth={1.5} />
                            <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">No imaging studies analyzed yet</p>
                            <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">Upload X-ray, MRI, or CT scan images from the Documents page — Vision AI will generate a clinical summary automatically.</p>
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
                                <div className="bg-warning-50/40 dark:bg-warning-500/5 border border-warning-100 dark:border-warning-500/20 rounded-8 p-3 mb-2">
                                    <p className="text-xs text-warning-500 font-medium">
                                        Imaging studies below are from a previous care episode and are preserved for clinical reference.
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
