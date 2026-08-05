import React from 'react';

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
            <div className="flex border-b bg-gray-50 px-4 pt-2">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => onTabChange(tab.id)}
                        className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* AI Content Area */}
            <div className="flex-1 overflow-y-auto p-4">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                        <svg className="animate-spin h-10 w-10 mb-4 text-purple-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <p className="font-medium">Analyzing Clinical Data...</p>
                        <p className="text-xs mt-1">Querying RAG and Gemini 1.5 Flash</p>
                    </div>
                ) : !summary ? (
                    <div className="flex flex-col items-center justify-center h-full text-center text-gray-400">
                        <span className="text-4xl mb-4">🧠</span>
                        <p className="font-medium text-gray-600">No AI Analysis Generated Yet</p>
                        <p className="text-sm mt-1">Click "Generate AI Insights" to begin.</p>
                    </div>
                ) : (
                    <>
                        {/* RENDER SUMMARY TAB */}
                        {activeTab === 'summary' && (
                            <div className="space-y-4">
                                {/* Confidence Bar */}
                                <div className="flex items-center gap-3">
                                    <span className="text-xs font-medium text-gray-500">AI Confidence:</span>
                                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                        <div className="h-full bg-green-500 rounded-full" style={{ width: `${summary.confidence * 100}%` }}></div>
                                    </div>
                                    <span className="text-sm font-bold text-green-600">{(summary.confidence * 100).toFixed(0)}%</span>
                                </div>

                                {/* Critical Alerts */}
                                {summary.criticalAlerts.map((alert, i) => (
                                    <div key={i} className="bg-red-50 border border-red-200 text-red-700 p-3 rounded text-sm">
                                        {alert}
                                    </div>
                                ))}

                                {/* SOAP Sections */}
                                {['subjective', 'objective', 'assessment', 'plan'].map(section => (
                                    <details key={section} className="group border rounded-lg">
                                        <summary className="flex items-center justify-between p-3 cursor-pointer bg-gray-50 hover:bg-gray-100">
                                            <span className="font-semibold text-gray-700 capitalize">{section}</span>
                                            <svg className="w-4 h-4 text-gray-400 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                        </summary>
                                        <div className="p-3 text-sm text-gray-600 border-t">
                                            {summary[section]}
                                        </div>
                                    </details>
                                ))}

                                <button onClick={onApproveSummary} className="w-full mt-4 bg-green-600 hover:bg-green-700 text-white py-2 rounded font-medium">
                                    ✅ Accept Summary
                                </button>
                            </div>
                        )}

                        {/* RENDER CODING TAB */}
                        {activeTab === 'coding' && (
                            <div className="space-y-3">
                                <h4 className="font-semibold text-gray-700 border-b pb-2">Suggested ICD-10 Codes</h4>
                                {codes.map(c => (
                                    <div key={c.code} className={`flex items-center justify-between p-3 border rounded-lg transition-colors ${c.status === 'APPROVED' ? 'bg-green-50 border-green-300' : c.status === 'REJECTED' ? 'bg-gray-50 opacity-50' : 'hover:border-purple-300'
                                        }`}>
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="checkbox"
                                                checked={c.status === 'APPROVED'}
                                                onChange={(e) => onCodeStatusChange({ code: c.code, status: e.target.checked ? 'APPROVED' : 'PENDING' })}
                                                className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                                            />
                                            <div>
                                                <span className="font-mono font-bold text-sm text-gray-800">{c.code}</span>
                                                <p className="text-xs text-gray-500">{c.description}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                                <div className={`h-full rounded-full ${c.confidence > 0.8 ? 'bg-green-500' : 'bg-yellow-500'}`} style={{ width: `${c.confidence * 100}%` }}></div>
                                            </div>
                                            <span className="text-xs text-gray-500">{(c.confidence * 100).toFixed(0)}%</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Placeholders for other tabs to keep UI complete */}
                        {activeTab === 'diagnosis' && <div className="text-center text-gray-400 pt-10">Diagnosis UI Module</div>}
                        {activeTab === 'pathway' && <div className="text-center text-gray-400 pt-10">Treatment Pathway Module</div>}
                    </>
                )}
            </div>
        </div>
    );
}