import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { appendProtocolToPlan } from "../../../store/slices/clinicalSlice";
import Card from "../../../components/ui/Card";
import Button from "../../../components/ui/Button";
import { ShieldCheck, Plus, ExternalLink, Activity } from 'lucide-react';

export default function ProtocolMatchPanel() {
  const dispatch = useDispatch();
  const { isProtocolLoading, protocolMatch, aiSummary } = useSelector(
    (state) => state.clinical
  );

  if (isProtocolLoading) {
    return (
      <Card padding="md" className="border-primary-200 dark:border-primary-800 bg-primary-50 dark:bg-primary-900/10">
        <div className="flex items-center gap-3 mb-3">
          <Activity className="w-5 h-5 text-primary-500 animate-pulse" />
          <h3 className="text-sm font-bold text-primary-800 dark:text-primary-300">Searching Evidence-Based Protocols...</h3>
        </div>
        <div className="space-y-2">
          <div className="h-3 bg-primary-200 dark:bg-primary-800 rounded animate-pulse w-3/4"></div>
          <div className="h-3 bg-primary-200 dark:bg-primary-800 rounded animate-pulse w-5/6"></div>
          <div className="h-3 bg-primary-200 dark:bg-primary-800 rounded animate-pulse w-1/2"></div>
        </div>
      </Card>
    );
  }

  if (!protocolMatch || !protocolMatch.matchFound) {
    return null; // Don't show anything if no protocol was matched
  }

  const handleApply = () => {
    if (protocolMatch.actionableSteps) {
      dispatch(appendProtocolToPlan(protocolMatch.actionableSteps));
    }
  };

  return (
    <Card padding="md" className="border-success-200 dark:border-success-800/50 bg-white dark:bg-slate-900 shadow-sm relative overflow-hidden">
      {/* Decorative top border */}
      <div className="absolute top-0 left-0 w-full h-1 bg-success-500"></div>
      
      <div className="flex justify-between items-start mb-3 mt-1">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-success-600 dark:text-success-500" />
          <h3 className="text-sm font-bold text-neutral-900 dark:text-slate-100">
            Evidence-Based Protocol Match
          </h3>
        </div>
        
        {/* Trusted Source Badge */}
        <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-success-50 dark:bg-success-900/30 text-success-700 dark:text-success-400 px-2 py-1 rounded border border-success-200 dark:border-success-700/50">
          Source: {protocolMatch.source}
          <ExternalLink className="w-3 h-3 ml-1" />
        </div>
      </div>

      <div className="text-sm text-neutral-700 dark:text-slate-300 leading-relaxed mb-4 p-3 bg-neutral-50 dark:bg-slate-800/50 rounded-lg border border-neutral-200 dark:border-slate-700">
        <p className="font-medium mb-2 text-neutral-900 dark:text-slate-200">Recommendation:</p>
        {protocolMatch.protocolSnippet}
        
        {protocolMatch.actionableSteps && protocolMatch.actionableSteps.length > 0 && (
          <ul className="mt-3 space-y-1 pl-5 list-disc text-xs">
            {protocolMatch.actionableSteps.map((step, idx) => (
              <li key={idx} className="text-neutral-600 dark:text-slate-400">{step}</li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex justify-end">
        <Button 
          variant="outline" 
          size="sm" 
          icon={Plus} 
          onClick={handleApply}
          disabled={!aiSummary}
          className="text-success-700 border-success-300 hover:bg-success-50 dark:text-success-400 dark:border-success-700 dark:hover:bg-success-900/20"
        >
          Apply to Chart
        </Button>
      </div>
    </Card>
  );
}
