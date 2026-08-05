import React from "react";
import Card from "../../../components/ui/Card";
import Button from "../../../components/ui/Button";
import { Loader2, Beaker, AlertTriangle, CheckCircle, Edit2, Trash2, Save, History } from "lucide-react";
import { ResponsiveContainer, LineChart, CartesianGrid, XAxis, YAxis, Tooltip as RechartsTooltip, Line } from "recharts";

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

export default function EncounterLabsTab({
    labTrendView, setLabTrendView,
    labTrendsLoading, labTrends,
    visionResults, visionLoading,
    setSelectedVisionDoc, handleVerifyVisionRecord,
    handleStartEditVision, handleDeleteVisionRecord,
    editingVisionId, visionEditJson, setVisionEditJson,
    handleCancelEditVision, handleSaveVisionEdit,
    unarchivedAt, patient
}) {
    const boundaryDate = unarchivedAt ? new Date(unarchivedAt) : null;

    const renderLabCard = (rec, isHistorical = false) => (
        <div key={rec.id} onClick={() => setSelectedVisionDoc(rec)} className="cursor-pointer transition-transform hover:-translate-y-0.5">
            <Card padding="md" className={`border-neutral-300 space-y-3 hover:border-primary-400 hover:shadow-md transition-all ${isHistorical ? 'border-amber-200 bg-amber-50/20' : ''}`}>
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isHistorical ? 'bg-amber-50' : 'bg-blue-50'}`}>
                            <Beaker className={`w-4 h-4 ${isHistorical ? 'text-amber-500' : 'text-blue-500'}`} />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-neutral-900">{rec.aiHeading || rec.fileKey?.split('/').pop() || rec.fileKey}</p>
                            <p className="text-xs text-neutral-400">{rec.documentType || 'Lab Report'} · {rec.analyzedAt ? new Date(rec.analyzedAt).toLocaleString() : ''}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {isHistorical && (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded-full border border-amber-200">
                                <History className="w-3 h-3" /> Historical
                            </span>
                        )}
                        {rec.blurryRegions?.length > 0 && (
                            <span className="flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-full mr-2">
                                <AlertTriangle className="w-3 h-3" />{rec.blurryRegions.length} unreadable
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
                    <div className="flex items-center gap-2 mt-2 px-3 py-2 bg-blue-50/50 text-blue-700 text-xs font-semibold rounded animate-pulse border border-blue-100">
                        <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                        Analyzing page {rec.imageMetadata.processed_pages + 1} of {rec.imageMetadata.total_pages}...
                    </div>
                )}

                {editingVisionId === rec.id ? (
                    <div className="bg-white rounded-lg p-3 border border-neutral-200 shadow-sm mt-3" onClick={e => e.stopPropagation()}>
                        <h5 className="text-xs font-bold text-neutral-800 uppercase mb-2">Edit Structured Lab Results (JSON)</h5>
                        <textarea 
                            value={visionEditJson}
                            onChange={(e) => setVisionEditJson(e.target.value)}
                            className="w-full h-48 p-2 text-xs font-mono bg-neutral-900 text-slate-200 rounded border border-neutral-700 focus:outline-none focus:border-primary-500"
                        />
                        <div className="flex justify-end gap-2 mt-2">
                            <Button size="sm" variant="secondary" onClick={handleCancelEditVision}>Cancel</Button>
                            <Button size="sm" icon={Save} onClick={(e) => handleSaveVisionEdit(rec, e)}>Save</Button>
                        </div>
                    </div>
                ) : rec.clinicalFindings?.length > 0 && (
                    <div className="bg-white rounded-lg p-3 border border-neutral-200 shadow-sm mt-3">
                        <h5 className="text-xs font-bold text-neutral-800 uppercase mb-2">Structured Lab Results</h5>
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs text-left">
                                <thead className="bg-neutral-50 text-neutral-600 border-b border-neutral-200">
                                    <tr>
                                        <th className="px-2 py-1.5 font-semibold">Test Name</th>
                                        <th className="px-2 py-1.5 font-semibold">Result</th>
                                        <th className="px-2 py-1.5 font-semibold">Unit</th>
                                        <th className="px-2 py-1.5 font-semibold">Reference</th>
                                        <th className="px-2 py-1.5 font-semibold">Flag</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-100">
                                    {rec.clinicalFindings.map((finding, idx) => (
                                        <tr key={idx} className="hover:bg-neutral-50">
                                            <td className="px-2 py-1.5 text-neutral-900 font-medium">{finding.finding || finding.test_name || '—'}</td>
                                            <td className="px-2 py-1.5 text-neutral-500 font-mono font-semibold">{finding.result || '—'}</td>
                                            <td className="px-2 py-1.5 text-neutral-500">{finding.unit || '—'}</td>
                                            <td className="px-2 py-1.5 text-neutral-500 text-[10px]">{finding.reference_range || '—'}</td>
                                            <td className="px-2 py-1.5">
                                                {finding.flag ? (
                                                    <span className={`px-1 rounded text-[10px] font-bold ${(finding.flag||'').match(/H|High/i) ? 'bg-danger-100 text-danger-700' : 'bg-warning-100 text-warning-700'}`}>
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
                            ? "bg-primary-600 text-white border-primary-600"
                            : "bg-white dark:bg-slate-800 text-neutral-600 dark:text-slate-400 border-neutral-300 dark:border-slate-600 hover:border-primary-400"
                    }`}
                >
                    {labTrendView ? "← Back to Reports" : "Trend View"}
                </button>
            </div>

            {labTrendView ? (
                labTrendsLoading ? (
                    <div className="p-8 text-center text-neutral-500 flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> Analyzing lab trends...
                    </div>
                ) : labTrends.length === 0 ? (
                    <div className="p-12 text-center">
                        <Beaker className="w-10 h-10 text-neutral-300 mx-auto mb-3" />
                        <p className="text-sm font-medium text-neutral-600">No trends available yet</p>
                        <p className="text-xs text-neutral-400 mt-1">A trend needs the same lab test to appear across at least 2 uploaded reports.</p>
                    </div>
                ) : (
                    labTrends.map((trend) => (
                        <Card key={trend.testName} padding="md" className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h5 className="text-sm font-bold text-neutral-900">{trend.testName}</h5>
                                <span className="text-xs text-neutral-500">
                                    {trend.unit && `Unit: ${trend.unit}`}{trend.referenceRange && ` · Ref: ${trend.referenceRange}`}
                                </span>
                            </div>
                            <div className="h-[180px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={trend.points.map(p => ({ ...p, dateLabel: p.date ? new Date(p.date).toLocaleDateString() : '' }))}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E5E5" />
                                        <XAxis dataKey="dateLabel" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6B7280' }} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6B7280' }} domain={['auto', 'auto']} />
                                        <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                        <Line type="monotone" dataKey="result" stroke="#0EA5E9" strokeWidth={3} dot={{ r: 4 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                            {trend.aiInsight && (
                                <p className="text-xs text-neutral-600 bg-neutral-50 border border-neutral-200 rounded-lg p-2.5">
                                    {trend.aiInsight}
                                </p>
                            )}
                        </Card>
                    ))
                )
            ) : (() => {
                const allLabResults = visionResults.filter(r =>
                    r.documentType === 'LAB_REPORT' || (!r.documentType && !['IMAGING','XRAY','MRI','CT_SCAN','DICOM'].includes(r.documentType))
                );
                if (visionLoading) return (
                    <div className="p-8 text-center text-neutral-500 flex items-center justify-center gap-2">
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> Loading lab reports...
                    </div>
                );
                if (allLabResults.length === 0) return (
                    <div className="p-12 text-center">
                        <Beaker className="w-10 h-10 text-neutral-300 mx-auto mb-3" />
                        <p className="text-sm font-medium text-neutral-600">No lab reports analyzed yet</p>
                        <p className="text-xs text-neutral-400 mt-1">Upload lab report images from the Documents page — Vision AI will analyze them automatically.</p>
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
                                <div className="bg-amber-50/40 border border-amber-100 rounded-xl p-3 mb-2">
                                    <p className="text-xs text-amber-700 font-medium">
                                        📊 Lab reports below are from a previous care episode and are preserved for clinical reference.
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
