import React from 'react';
import Card from '../../../../components/ui/Card';
import { AlertCircle, AlertTriangle, ArrowDown, Activity, ActivitySquare, Pill, FileSearch } from 'lucide-react';

const PathwayTab = ({ pathwaySteps }) => {
  if (!pathwaySteps || pathwaySteps.length === 0) {
    return (
      <div className="space-y-4 p-1">
        <div className="bg-slate-800 text-white rounded-lg p-4 shadow-sm border border-slate-700">
          <h3 className="font-bold tracking-wide text-sm flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-400" />
            TREATMENT PATHWAY RECOMMENDATIONS
          </h3>
          <p className="text-slate-300 text-xs mt-1">Generating pathway...</p>
        </div>
      </div>
    );
  }

  const getStepStyles = (stepType) => {
    switch (stepType?.toUpperCase()) {
      case 'IMMEDIATE ACTION':
        return { color: 'green', icon: <AlertCircle className="w-4 h-4 text-green-600" /> };
      case 'CONTRADICTION ALERT':
        return { color: 'red', icon: <AlertTriangle className="w-4 h-4 text-red-600" /> };
      case 'MEDICATION ADJUSTMENT':
        return { color: 'blue', icon: <Pill className="w-4 h-4 text-blue-600" /> };
      default:
        return { color: 'blue', icon: <FileSearch className="w-4 h-4 text-blue-600" /> };
    }
  };

  return (
    <div className="space-y-4 p-1">
      <div className="bg-slate-800 text-white rounded-lg p-4 shadow-sm border border-slate-700">
        <h3 className="font-bold tracking-wide text-sm flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-400" />
          TREATMENT PATHWAY RECOMMENDATIONS
        </h3>
        <p className="text-slate-300 text-xs mt-1">AI Generated Pathway</p>
      </div>

      <div className="relative border-l-2 border-slate-200 ml-4 space-y-6 pb-4">
        {pathwaySteps.map((step, index) => {
          const styles = getStepStyles(step.stepType);
          return (
            <div key={index} className="relative pl-6">
              <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-${styles.color}-500 border-2 border-white shadow-sm flex items-center justify-center`}>
                {step.stepType?.toUpperCase() === 'CONTRADICTION ALERT' && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
              </div>
              <div className="mb-1 flex items-center gap-2">
                <span className={`text-xs font-bold text-${styles.color}-700 uppercase tracking-wider flex items-center gap-1`}>
                  {step.stepType?.toUpperCase() === 'CONTRADICTION ALERT' && <AlertTriangle className="w-3.5 h-3.5" />}
                  Step {index + 1}: {step.stepType}
                </span>
              </div>
              <div className={`bg-${styles.color === 'red' ? 'red-50' : 'white'} border border-${styles.color}-200 rounded-lg p-3 shadow-sm shadow-${styles.color}-100/50`}>
                <h4 className={`text-sm font-bold text-${styles.color === 'red' ? 'red-800' : 'slate-800'} flex items-center gap-2`}>
                  {step.stepType?.toUpperCase() === 'CONTRADICTION ALERT' ? <span className="text-lg">⛔</span> : styles.icon}
                  {step.title}
                </h4>
                {step.description && <p className="text-xs text-slate-700 mt-1 leading-relaxed font-medium">{step.description}</p>}
                {step.details && step.details.length > 0 && (
                  <ul className="text-xs text-slate-600 mt-1 space-y-1 list-disc list-inside">
                    {step.details.map((detail, idx) => (
                      <li key={idx}>{detail}</li>
                    ))}
                  </ul>
                )}
                {step.reasoning && (
                  <p className={`text-xs ${styles.color === 'red' ? 'text-red-700' : 'text-slate-600'} mt-1 leading-relaxed`}>
                    {step.stepType?.toUpperCase() !== 'CONTRADICTION ALERT' && "Reason: "}{step.reasoning}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PathwayTab;
