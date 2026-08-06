import React from 'react';
import { AlertCircle, AlertTriangle, Activity, Pill, FileSearch } from 'lucide-react';

// NOTE: Tailwind's JIT compiler cannot see dynamically-interpolated class names
// (e.g. `bg-${color}-500`) — it only picks up complete, literal class strings found
// in source. The previous version built classes this way, so most step colors were
// silently dropped from the production CSS bundle. Using a static lookup table below
// fixes that.
const STEP_STYLES = {
  'IMMEDIATE ACTION': {
    icon: <AlertCircle className="w-4 h-4 text-success-600 dark:text-success-500" />,
    dot: 'bg-success-500',
    label: 'text-success-700 dark:text-success-500',
    card: 'bg-white dark:bg-neutral-900 border-success-100 dark:border-success-500/30',
    title: 'text-neutral-900 dark:text-neutral-100',
    reasoning: 'text-neutral-600 dark:text-neutral-400',
  },
  'CONTRADICTION ALERT': {
    icon: <AlertTriangle className="w-4 h-4 text-danger-600 dark:text-danger-500" />,
    dot: 'bg-danger-500',
    label: 'text-danger-700 dark:text-danger-500',
    card: 'bg-danger-50 dark:bg-danger-500/10 border-danger-200 dark:border-danger-500/30',
    title: 'text-danger-700 dark:text-danger-500',
    reasoning: 'text-danger-700 dark:text-danger-500',
  },
  'MEDICATION ADJUSTMENT': {
    icon: <Pill className="w-4 h-4 text-primary-600 dark:text-primary-500" />,
    dot: 'bg-primary-500',
    label: 'text-primary-700 dark:text-primary-400',
    card: 'bg-white dark:bg-neutral-900 border-primary-200 dark:border-primary-800/50',
    title: 'text-neutral-900 dark:text-neutral-100',
    reasoning: 'text-neutral-600 dark:text-neutral-400',
  },
  DEFAULT: {
    icon: <FileSearch className="w-4 h-4 text-primary-600 dark:text-primary-500" />,
    dot: 'bg-primary-500',
    label: 'text-primary-700 dark:text-primary-400',
    card: 'bg-white dark:bg-neutral-900 border-primary-200 dark:border-primary-800/50',
    title: 'text-neutral-900 dark:text-neutral-100',
    reasoning: 'text-neutral-600 dark:text-neutral-400',
  },
};

const getStepStyles = (stepType) => STEP_STYLES[stepType?.toUpperCase()] || STEP_STYLES.DEFAULT;

const PathwayTab = ({ pathwaySteps }) => {
  if (!pathwaySteps || pathwaySteps.length === 0) {
    return (
      <div className="space-y-4 p-1">
        <div className="bg-neutral-800 dark:bg-neutral-900 text-white rounded-8 p-4 shadow-sm border border-neutral-700 dark:border-neutral-800">
          <h3 className="font-bold tracking-wide text-sm flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary-400" />
            TREATMENT PATHWAY RECOMMENDATIONS
          </h3>
          <p className="text-neutral-300 text-xs mt-1">Generating pathway...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-1">
      <div className="bg-neutral-800 dark:bg-neutral-900 text-white rounded-8 p-4 shadow-sm border border-neutral-700 dark:border-neutral-800">
        <h3 className="font-bold tracking-wide text-sm flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary-400" />
          TREATMENT PATHWAY RECOMMENDATIONS
        </h3>
        <p className="text-neutral-300 text-xs mt-1">AI Generated Pathway</p>
      </div>

      <div className="relative border-l-2 border-neutral-200 dark:border-neutral-700 ml-4 space-y-6 pb-4">
        {pathwaySteps.map((step, index) => {
          const styles = getStepStyles(step.stepType);
          const isAlert = step.stepType?.toUpperCase() === 'CONTRADICTION ALERT';
          return (
            <div key={index} className="relative pl-6">
              <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full ${styles.dot} border-2 border-white dark:border-neutral-900 shadow-sm flex items-center justify-center`}>
                {isAlert && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
              </div>
              <div className="mb-1 flex items-center gap-2">
                <span className={`text-xs font-bold ${styles.label} uppercase tracking-wider flex items-center gap-1`}>
                  {isAlert && <AlertTriangle className="w-3.5 h-3.5" />}
                  Step {index + 1}: {step.stepType}
                </span>
              </div>
              <div className={`border rounded-8 p-3 shadow-sm ${styles.card}`}>
                <h4 className={`text-sm font-bold flex items-center gap-2 ${styles.title}`}>
                  {isAlert ? <AlertTriangle className="w-4 h-4 text-danger-600 dark:text-danger-500" /> : styles.icon}
                  {step.title}
                </h4>
                {step.description && <p className="text-xs text-neutral-700 dark:text-neutral-300 mt-1 leading-relaxed font-medium">{step.description}</p>}
                {step.details && step.details.length > 0 && (
                  <ul className="text-xs text-neutral-600 dark:text-neutral-400 mt-1 space-y-1 list-disc list-inside">
                    {step.details.map((detail, idx) => (
                      <li key={idx}>{detail}</li>
                    ))}
                  </ul>
                )}
                {step.reasoning && (
                  <p className={`text-xs mt-1 leading-relaxed ${styles.reasoning}`}>
                    {!isAlert && "Reason: "}{step.reasoning}
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
