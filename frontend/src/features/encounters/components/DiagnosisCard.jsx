import React from "react";
import { Stethoscope, Info } from "lucide-react";

export default function DiagnosisCard({ dx, onExplain }) {
    return (
        <div className="p-3 border border-neutral-400 rounded-4 bg-white hover:border-primary-300 transition-colors">
            <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-4 bg-info-50 flex items-center justify-center">
                        <Stethoscope className="w-4 h-4 text-info-500" />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-neutral-900">{dx.description}</p>
                        <p className="text-xs text-neutral-600 font-mono">ICD-10: {dx.code}</p>
                    </div>
                </div>
                <button
                    onClick={() => onExplain(dx)}
                    className="p-1.5 rounded-2 hover:bg-neutral-100 transition-colors"
                >
                    <Info className="w-4 h-4 text-neutral-600" />
                </button>
            </div>
            <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-neutral-300 rounded-full overflow-hidden">
                    <div className="h-full bg-success-500 rounded-full" style={{ width: `${dx.confidenceScore}%` }} />
                </div>
                <span className="text-xs font-bold text-neutral-700">{dx.confidenceScore}%</span>
            </div>
        </div>
    );
}
