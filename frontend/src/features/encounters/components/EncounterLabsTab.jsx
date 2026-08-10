import React from "react";
import Card from "../../../components/ui/Card";
import Button from "../../../components/ui/Button";
import LabFindingsEditor from "./LabFindingsEditor";
import { Loader2, Beaker, AlertTriangle, CheckCircle, Edit2, Trash2, Save, History } from "lucide-react";
import { ResponsiveContainer, LineChart, CartesianGrid, XAxis, YAxis, Tooltip as RechartsTooltip, Line } from "recharts";

const CHART_ACCENT = "#0052CC"; // primary-500

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

export default function EncounterLabsTab({
    labTrendView, setLabTrendView,
    labTrendsLoading, labTrends,
    visionResults, visionLoading,
    setSelectedVisionDoc, handleVerifyVisionRecord,
    handleStartEditVision, handleDeleteVisionRecord,
    editingVisionId, visionEditData, setVisionEditData,
    handleCancelEditVision, handleSaveVisionEdit,
    unarchivedAt, patient
}) {
    const boundaryDate = unarchivedAt ? new Date(unarchivedAt) : null;

    const renderLabCard = (rec, isHistorical = false) => (
        <div key={rec.id} onClick={() => setSelectedVisionDoc(rec)} className="cursor-pointer transition-transform hover:-translate-y-0.5">
            <Card padding="md" className={`border-neutral-300 dark:border-neutral-700 space-y-3 hover:border-primary-400 hover:shadow-md transition-all ${isHistorical ? 'border-warning-200 dark:border-warning-900/40 bg-warning-50/20 dark:bg-warning-500/5' : ''}`}>
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                        <Beaker className={`w-4 h-4 ${isHistorical ? 'text-warning-500' : 'text-info-500'}`} />
                        <div>
                            <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{rec.aiHeading || rec.fileKey?.split('/').pop() || rec.fileKey}</p>
                            <p className="text-xs text-neutral-400 dark:text-neutral-500">{rec.documentType || 'Lab Report'} · {rec.analyzedAt ? new Date(rec.analyzedAt).toLocaleString() : ''}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {isHistorical && (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-warning-500 bg-warning-50 dark:bg-warning-500/10 px-2 py-1 rounded-full border border-warning-200 dark:border-warning-500/30">
                                <History className="w-3 h-3" /> Historical
                            </span>
                        )}
                        {rec.blurryRegions?.length > 0 && (
                            <span className="flex items-center gap-1 text-xs font-semibold text-warning-500 bg-warning-50 dark:bg-warning-500/10 border border-warning-200 dark:border-warning-500/30 px-2 py-1 rounded-full mr-2">
                                <AlertTriangle className="w-3 h-3" />{rec.blurryRegions.length} unreadable
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

                {rec.clinicalFindings?.length > 0 && (
                    <div className="bg-white dark:bg-neutral-900 rounded-8 p-3 border border-neutral-200 dark:border-neutral-800 shadow-sm mt-3">
                        <h5 className="text-xs font-bold text-neutral-800 dark:text-neutral-200 uppercase mb-2">Structured Lab Results</h5>
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs text-left">
                                <thead className="bg-neutral-50 dark:bg-neutral-800/50 text-neutral-600 dark:text-neutral-400 border-b border-neutral-200 dark:border-neutral-800">
                                    <tr>
                                        <th className="px-2 py-1.5 font-semibold">Test Name</th>
                                        <th className="px-2 py-1.5 font-semibold">Result</th>
                                        <th className="px-2 py-1.5 font-semibold">Unit</th>
                                        <th className="px-2 py-1.5 font-semibold">Reference</th>
                                        <th className="px-2 py-1.5 font-semibold">Flag</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                                    {rec.clinicalFindings.map((finding, idx) => (
                                        <tr key={idx} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                                            <td className="px-2 py-1.5 text-neutral-900 dark:text-neutral-200 font-medium">{finding.finding || finding.test_name || '—'}</td>
                                            <td className="px-2 py-1.5 text-neutral-500 dark:text-neutral-400 font-mono font-semibold">{finding.result || '—'}</td>
                                            <td className="px-2 py-1.5 text-neutral-500 dark:text-neutral-400">{finding.unit || '—'}</td>
                                            <td className="px-2 py-1.5 text-neutral-500 dark:text-neutral-400 text-[10px]">{finding.reference_range || '—'}</td>
                                            <td className="px-2 py-1.5">
                                                {finding.flag ? (
                                                    <span className={`px-1 rounded-6 text-[10px] font-bold ${(finding.flag||'').match(/H|High/i) ? 'bg-danger-100 dark:bg-danger-900/30 text-danger-700 dark:text-danger-400' : 'bg-warning-100 dark:bg-warning-500/20 text-warning-500'}`}>
                                                        {finding.flag}
                                                    </span>
                                                ) : '—'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </Card>
        </div>
    );

    return (
        <div className="max-w-3xl mx-auto space-y-4">
            <div className="flex justify-end">
                <button
                    onClick={() => setLabTrendView(v => !v)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                        labTrendView
                            ? "bg-primary-500 text-white border-primary-500"
                            : "bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border-neutral-300 dark:border-neutral-700 hover:border-primary-400"
                    }`}
                >
                    {labTrendView ? "← Back to Reports" : "Trend View"}
                </button>
            </div>

            {labTrendView ? (
                labTrendsLoading ? (
                    <div className="p-8 text-center text-neutral-500 dark:text-neutral-400 flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> Analyzing lab trends...
                    </div>
                ) : labTrends.length === 0 ? (
                    <div className="p-12 text-center">
                        <Beaker className="w-10 h-10 text-neutral-300 dark:text-neutral-700 mx-auto mb-3" />
                        <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">No trends available yet</p>
                        <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">A trend needs the same lab test to appear across at least 2 uploaded reports.</p>
                    </div>
                ) : (
                    labTrends.map((trend) => (
                        <Card key={trend.testName} padding="md" className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h5 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">{trend.testName}</h5>
                                <span className="text-xs text-neutral-500 dark:text-neutral-400">
                                    {trend.unit && `Unit: ${trend.unit}`}{trend.referenceRange && ` · Ref: ${trend.referenceRange}`}
                                </span>
                            </div>
                            <div className="h-[180px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={trend.points.map(p => ({ ...p, dateLabel: p.date ? new Date(p.date).toLocaleDateString() : '' }))}>
                                        <CartesianGrid strokeDasharray="none" vertical={false} stroke="#ECEEF0" />
                                        <XAxis dataKey="dateLabel" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#505F76' }} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#505F76' }} domain={['auto', 'auto']} />
                                        <RechartsTooltip contentStyle={{ borderRadius: '8px', border: '1px solid #ECEEF0', fontSize: '12px' }} />
                                        <Line type="monotone" dataKey="result" stroke={CHART_ACCENT} strokeWidth={2} dot={{ r: 4 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                            {trend.aiInsight && (
                                <p className="text-xs text-neutral-600 dark:text-neutral-400 bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800 rounded-8 p-2.5">
                                    {trend.aiInsight}
                                </p>
                            )}
                        </Card>
                    ))
                )
            ) : (() => {
                const allLabResults = visionResults.filter(r =>
                    r.documentType === 'LAB_REPORT' ||
                    !['IMAGING','XRAY','MRI','CT_SCAN','DICOM'].includes(r.documentType)
                );
                if (visionLoading) return (
                    <div className="p-8 text-center text-neutral-500 dark:text-neutral-400 flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> Loading lab reports...
                    </div>
                );
                if (allLabResults.length === 0) return (
                    <div className="p-12 text-center">
                        <Beaker className="w-10 h-10 text-neutral-300 dark:text-neutral-700 mx-auto mb-3" />
                        <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">No lab reports analyzed yet</p>
                        <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">Upload lab report images from the Documents page — Vision AI will analyze them automatically.</p>
                    </div>
                );

                const currentLabs = boundaryDate
                    ? allLabResults.filter(r => !r.analyzedAt || new Date(r.analyzedAt) >= boundaryDate)
                    : allLabResults;
                const historyLabs = boundaryDate
                    ? allLabResults.filter(r => r.analyzedAt && new Date(r.analyzedAt) < boundaryDate)
                    : [];

                return (
                    <>
                        {currentLabs.map(rec => renderLabCard(rec, false))}
                        {historyLabs.length > 0 && (
                            <>
                                <TimeBoundaryDivider date={unarchivedAt} label="Historical Lab Reports" />
                                <div className="bg-warning-50/40 dark:bg-warning-500/5 border border-warning-100 dark:border-warning-500/20 rounded-8 p-3 mb-2">
                                    <p className="text-xs text-warning-500 font-medium">
                                        Lab reports below are from a previous care episode and are preserved for clinical reference.
                                    </p>
                                </div>
                                {historyLabs.map(rec => renderLabCard(rec, true))}
                            </>
                        )}
                    </>
                );
            })()}
        </div>
    );
}
