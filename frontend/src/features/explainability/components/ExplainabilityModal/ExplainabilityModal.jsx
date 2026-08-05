import React from "react";
import { X, CheckCircle, FileText, Beaker, Info, BookOpen, Brain, ChevronRight } from "lucide-react";

/**
 * ExplainabilityModal — shows AI reasoning, evidence, RAG citations, and guideline sources.
 * Accepts:
 *   data.title          - string
 *   data.reasoning      - string (free-form clinical reasoning from LLM)
 *   data.confidenceFactors - [{ label, weight }]
 *   data.evidence       - [{ source, text }]
 *   data.guidelines     - [{ title, section }]       ← static/mock
 *   data.citations      - string[]                   ← real from LLM (DiagnosticsAgent)
 */
export default function ExplainabilityModal({ isOpen, onClose, data }) {
    if (!isOpen || !data) return null;

    const hasCitations = data.citations?.length > 0;
    const hasGuidelines = data.guidelines?.length > 0;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-neutral-200 bg-gradient-to-r from-indigo-50 to-violet-50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-indigo-100">
                            <Brain className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-neutral-900">AI Reasoning Explainability</h3>
                            <p className="text-sm font-medium text-indigo-700">{data.title}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-neutral-500 hover:text-neutral-800 transition-colors p-1.5 bg-white rounded-lg shadow-sm border border-neutral-200">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto space-y-6 bg-neutral-50">

                    {/* Reasoning — LLM-provided clinical rationale */}
                    {data.reasoning && (
                        <div>
                            <h4 className="text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                <Info className="w-3.5 h-3.5 text-indigo-500" /> Clinical Reasoning
                            </h4>
                            <div className="bg-white border border-neutral-200 rounded-xl p-4 shadow-sm">
                                <p className="text-sm text-neutral-800 leading-relaxed">{data.reasoning}</p>
                            </div>
                        </div>
                    )}

                    {/* Confidence Factors */}
                    {data.confidenceFactors?.length > 0 && (
                        <div>
                            <h4 className="text-xs font-bold text-neutral-700 uppercase tracking-wider mb-3">Confidence Factors</h4>
                            <div className="space-y-3">
                                {data.confidenceFactors.map((factor, i) => (
                                    <div key={i} className="flex items-center justify-between">
                                        <span className="text-sm font-medium text-neutral-700 w-48">{factor.label}</span>
                                        <div className="flex items-center gap-3 flex-1">
                                            <div className="flex-1 h-2 bg-neutral-200 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all ${factor.weight > 80 ? 'bg-emerald-500' : factor.weight > 60 ? 'bg-amber-400' : 'bg-red-400'}`}
                                                    style={{ width: `${factor.weight}%` }}
                                                />
                                            </div>
                                            <span className="text-sm font-bold text-neutral-900 w-10 text-right">{factor.weight}%</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Extracted Evidence */}
                    {data.evidence?.length > 0 && (
                        <div>
                            <h4 className="text-xs font-bold text-neutral-700 uppercase tracking-wider mb-3">Extracted Evidence</h4>
                            <div className="space-y-2">
                                {data.evidence.map((ev, i) => (
                                    <div key={i} className="flex gap-3 bg-white p-3 rounded-xl border border-neutral-200 shadow-sm">
                                        <div className="mt-0.5 flex-shrink-0">
                                            {ev.source === "Clinical Note"
                                                ? <FileText className="w-4 h-4 text-primary-500" />
                                                : <Beaker className="w-4 h-4 text-primary-500" />}
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">{ev.source}</span>
                                            <p className="text-sm text-neutral-800 mt-0.5 leading-relaxed">{ev.text}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* RAG Citations — real data from LLM */}
                    {hasCitations && (
                        <div>
                            <h4 className="text-xs font-bold text-neutral-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                <BookOpen className="w-3.5 h-3.5 text-violet-500" /> Guideline Sources (RAG Citations)
                                <span className="ml-1 px-1.5 py-0.5 bg-violet-100 text-violet-700 text-[10px] font-bold rounded-full">
                                    {data.citations.length}
                                </span>
                            </h4>
                            <div className="space-y-2">
                                {data.citations.map((cite, i) => (
                                    <div key={i} className="flex items-start gap-2.5 bg-violet-50 border border-violet-200 p-3 rounded-xl">
                                        <CheckCircle className="w-4 h-4 text-violet-600 mt-0.5 flex-shrink-0" />
                                        <p className="text-sm text-violet-900 font-medium leading-snug">{cite}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Static Guidelines (mock/fallback) */}
                    {hasGuidelines && !hasCitations && (
                        <div>
                            <h4 className="text-xs font-bold text-neutral-700 uppercase tracking-wider mb-3">Clinical Guidelines Applied</h4>
                            <div className="space-y-2">
                                {data.guidelines.map((guide, i) => (
                                    <div key={i} className="flex items-start gap-3 bg-blue-50 p-4 rounded-xl border border-blue-100">
                                        <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                                        <div>
                                            <p className="text-sm font-bold text-blue-900">{guide.title}</p>
                                            <p className="text-xs text-blue-700 mt-0.5">{guide.section}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Empty state */}
                    {!data.reasoning && !data.confidenceFactors?.length && !data.evidence?.length && !hasCitations && !hasGuidelines && (
                        <div className="text-center py-8 text-neutral-400">
                            <Brain className="w-10 h-10 mx-auto mb-2 opacity-30" />
                            <p className="text-sm">No AI reasoning data available for this item.</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-neutral-200 bg-white flex items-center justify-between">
                    <p className="text-xs text-neutral-400 flex items-center gap-1">
                        <Info className="w-3 h-3" /> AI-generated — verify with clinical judgment
                    </p>
                    <button onClick={onClose} className="px-5 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-sm font-semibold rounded-lg transition-colors border border-neutral-300">
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
