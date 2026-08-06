import React from 'react';
import { Brain, Loader2, CheckCircle } from 'lucide-react';
import EmptyState from '../../../../components/ui/EmptyState';

export default function AIInsightsColumn({ summary, codes, activeTab, isLoading, onTabChange, onCodeStatusChange, onApproveSummary }) {

    const tabs = [
        { id: 'summary', label: 'Summary' },
        { id: 'diagnosis', label: 'Diagnosis' },
        { id: 'coding', label: 'Coding' },
        { id: 'pathway', label: 'Pathway' }
    ];

    return (
        <div className="flex flex-col h-full">
            {/* AI Tabs */}
            <div className="flex border-b border-neutral-400 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 px-4 pt-2">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => onTabChange(tab.id)}
                        className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id ? 'border-primary-500 text-primary-600 dark:text-primary-400' : 'border-transparent text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* AI Content Area */}
            <div className="flex-1 overflow-y-auto p-4">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-full text-neutral-400 dark:text-neutral-500">
                        <Loader2 className="w-10 h-10 mb-4 text-primary-500 animate-spin" />
                        <p className="font-medium">Analyzing Clinical Data...</p>
                        <p className="text-xs mt-1">Querying RAG and Gemini 1.5 Flash</p>
                    </div>
                ) : !summary ? (
                    <EmptyState
                        icon={Brain}
                        title="No AI Analysis Generated Yet"
                        description='Click "Generate AI Insights" to begin.'
                    />
                ) : (
                    <>
                        {/* RENDER SUMMARY TAB */}
                        {activeTab === 'summary' && (
                            <div className="space-y-4">
                                {/* Confidence Bar */}
                                <div className="flex items-center gap-3">
                                    <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">AI Confidence:</span>
                                    <div className="flex-1 h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                                        <div className="h-full bg-success-500 rounded-full" style={{ width: `${summary.confidence * 100}%` }}></div>
                                    </div>
                                    <span className="text-sm font-bold text-success-600 dark:text-success-500">{(summary.confidence * 100).toFixed(0)}%</span>
                                </div>

                                {/* Critical Alerts */}
                                {summary.criticalAlerts.map((alert, i) => (
                                    <div key={i} className="bg-danger-50 dark:bg-danger-500/10 border border-danger-200 dark:border-danger-500/30 text-danger-700 dark:text-danger-500 p-3 rounded-8 text-sm">
                                        {alert}
                                    </div>
                                ))}

                                {/* SOAP Sections */}
                                {['subjective', 'objective', 'assessment', 'plan'].map(section => (
                                    <details key={section} className="group border border-neutral-400 dark:border-neutral-800 rounded-8">
                                        <summary className="flex items-center justify-between p-3 cursor-pointer bg-neutral-50 dark:bg-neutral-800/50 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-8">
                                            <span className="font-semibold text-neutral-700 dark:text-neutral-300 capitalize">{section}</span>
                                            <svg className="w-4 h-4 text-neutral-400 dark:text-neutral-500 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                        </summary>
                                        <div className="p-3 text-sm text-neutral-600 dark:text-neutral-400 border-t border-neutral-400 dark:border-neutral-800">
                                            {summary[section]}
                                        </div>
                                    </details>
                                ))}

                                <button onClick={onApproveSummary} className="w-full mt-4 flex items-center justify-center gap-2 bg-success-500 hover:bg-success-600 text-white py-2 rounded-8 font-medium transition-colors">
                                    <CheckCircle className="w-4 h-4" /> Accept Summary
                                </button>
                            </div>
                        )}

                        {/* RENDER CODING TAB */}
                        {activeTab === 'coding' && (
                            <div className="space-y-3">
                                <h4 className="font-semibold text-neutral-700 dark:text-neutral-300 border-b border-neutral-400 dark:border-neutral-800 pb-2">Suggested ICD-10 Codes</h4>
                                {codes.map(c => (
                                    <div key={c.code} className={`flex items-center justify-between p-3 border rounded-8 transition-colors ${c.status === 'APPROVED' ? 'bg-success-50 dark:bg-success-500/10 border-success-100 dark:border-success-500/30' : c.status === 'REJECTED' ? 'bg-neutral-50 dark:bg-neutral-800/50 border-neutral-300 dark:border-neutral-800 opacity-50' : 'border-neutral-400 dark:border-neutral-800 hover:border-primary-300 dark:hover:border-primary-700'
                                        }`}>
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="checkbox"
                                                checked={c.status === 'APPROVED'}
                                                onChange={(e) => onCodeStatusChange({ code: c.code, status: e.target.checked ? 'APPROVED' : 'PENDING' })}
                                                className="w-4 h-4 text-primary-600 rounded-6 focus:ring-primary-500"
                                            />
                                            <div>
                                                <span className="font-mono font-bold text-sm text-neutral-800 dark:text-neutral-200">{c.code}</span>
                                                <p className="text-xs text-neutral-500 dark:text-neutral-400">{c.description}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-16 h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                                                <div className={`h-full rounded-full ${c.confidence > 0.8 ? 'bg-success-500' : 'bg-warning-500'}`} style={{ width: `${c.confidence * 100}%` }}></div>
                                            </div>
                                            <span className="text-xs text-neutral-500 dark:text-neutral-400">{(c.confidence * 100).toFixed(0)}%</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Diagnosis and Pathway tabs have no dedicated UI/data binding in this
                            (currently unused) component — see PatientContextColumn/AIInsightsColumn
                            report note. Rendering an explicit EmptyState instead of a bare string so
                            it at least matches the design system if this component is ever wired up. */}
                        {activeTab === 'diagnosis' && (
                            <EmptyState title="Diagnosis Module Not Implemented Here" description="This tab has no data binding in this component." />
                        )}
                        {activeTab === 'pathway' && (
                            <EmptyState title="Treatment Pathway Module Not Implemented Here" description="This tab has no data binding in this component." />
                        )}
                    </>
                )}
            </div>
        </div>
    );
}