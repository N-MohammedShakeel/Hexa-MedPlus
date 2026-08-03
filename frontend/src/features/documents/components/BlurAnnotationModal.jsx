import React from 'react';
import { AlertCircle, X } from 'lucide-react';
import { Button } from '../../../components/ui';
import axiosInstance from '../../../config/axios';

export default function BlurAnnotationModal({ doc, docAiResult, setDocAiResult, docBlobUrl, onClose, analyzingStates, setAnalyzingStates, onAnalysisStarted, onAnalysisComplete }) {
  const regions = docAiResult?.blurryRegions || [];
  const imageWidth = docAiResult?.imageWidth || 1;
  const imageHeight = docAiResult?.imageHeight || 1;

  const [step, setStep] = React.useState(0);
  const [inputs, setInputs] = React.useState(
    analyzingStates[docAiResult?.id]?.inputs || regions.map((_, i) => ({ region_index: i, doctor_text: '', skipped: false }))
  );
  const [isAnalyzing, setIsAnalyzing] = React.useState(!!analyzingStates[docAiResult?.id]?.isAnalyzing);

  const update = (field, value) => {
    const newInputs = inputs.map((inp, i) => i === step ? { ...inp, [field]: value } : inp);
    setInputs(newInputs);
    setAnalyzingStates(prev => ({ ...prev, [docAiResult.id]: { isAnalyzing, inputs: newInputs } }));
  };

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setAnalyzingStates(prev => ({ ...prev, [docAiResult.id]: { isAnalyzing: true, inputs } }));
    // Notify parent that reanalysis started — switches modal to DocumentViewModal with loading
    if (onAnalysisStarted) onAnalysisStarted(doc.fileKey, docAiResult.id);
    // Close modal immediately so user isn't stuck waiting
    onClose();
    try {
      const res = await axiosInstance.post(`/api/ai/vision/results/${docAiResult.id}/reanalyze`, { 
        fileUrl: doc.url,
        blurDoctorInputs: inputs.map(inp => ({
          region: `x:${regions[inp.region_index]?.x} y:${regions[inp.region_index]?.y}`,
          text: inp.skipped ? "Skipped (not clinically significant)" : inp.doctor_text
        }))
      });
      setDocAiResult(prev => ({ 
        ...prev, 
        needs_blur_annotation: false,
        blurDoctorInputs: inputs,
        extractedText: res.data.extractedText,
        reportSummary: res.data.reportSummary,
        clinicalFindings: res.data.clinicalFindings,
        aiHeading: res.data.aiHeading,
        imageWidth: res.data.imageWidth,
        imageHeight: res.data.imageHeight,
        verified: false
      }));
      setAnalyzingStates(prev => { const next = {...prev}; delete next[docAiResult.id]; return next; });
    } catch (e) {
      console.error('Failed to reanalyze document', e);
      alert('Analysis failed. Please try re-opening the document and trying again.');
      setAnalyzingStates(prev => { const next = {...prev}; delete next[docAiResult.id]; return next; });
    } finally {
      // Always notify parent that analysis finished (success or fail)
      if (onAnalysisComplete) onAnalysisComplete(doc.fileKey);
    }
  };

  const current = inputs[step] || {};

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-neutral-900/95 backdrop-blur-md animate-fade-in p-4 sm:p-8" onClick={e => e.stopPropagation()}>
      {/* Header */}
      <div className="flex items-center justify-between text-white mb-6">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-3 text-slate-100">
            <AlertCircle className="text-amber-500 w-8 h-8" />
            Action Required: Blur Detected
          </h2>
          <p className="text-neutral-300 mt-1">Please describe the contents of the highlighted blurry regions before AI analysis.</p>
        </div>
        <button onClick={onClose} className="p-3 text-white/50 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors">
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-8 min-h-0">
        {/* Left: Document Centered */}
        <div className="flex-1 relative flex items-center justify-center bg-black/60 rounded-xl border border-white/10 overflow-hidden p-4 shadow-2xl">
          {docBlobUrl ? (
            <div className="relative inline-block max-h-full max-w-full">
              <img src={docBlobUrl} alt="Document" className="max-h-[70vh] w-auto block rounded" />
              {regions.map((reg, i) => (
                <div 
                  key={i}
                  style={{
                    position: 'absolute',
                    left: `${(reg.x / imageWidth) * 100}%`,
                    top: `${(reg.y / imageHeight) * 100}%`,
                    width: `${(reg.w / imageWidth) * 100}%`,
                    height: `${(reg.h / imageHeight) * 100}%`
                  }}
                  className={`border-[3px] transition-all duration-300 ${i === step ? 'border-amber-500 bg-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.5)] z-10' : 'border-red-500/50 bg-red-500/10'}`}
                />
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-white/50">Loading image...</div>
          )}
        </div>

        {/* Right: Floating Input Panel */}
        <div className="w-full lg:w-[400px] flex flex-col gap-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl p-6 border border-neutral-200 dark:border-slate-700 animate-slide-in-right">
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
                Region {step + 1} of {regions.length}
                </h3>
                <span className="text-xs font-mono text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/50 px-2 py-0.5 rounded">
                  x:{regions[step]?.x} y:{regions[step]?.y}
                </span>
            </div>
            
            <p className="text-sm text-neutral-500 dark:text-slate-400 mb-4">
              What does the highlighted box say?
            </p>
            
            <textarea
              value={current.doctor_text || ''}
              onChange={e => update('doctor_text', e.target.value)}
              disabled={current.skipped || isAnalyzing}
              placeholder={current.skipped ? 'Region skipped' : 'Enter text from the blurry region...'}
              className={`w-full min-h-[140px] p-3 text-sm border rounded-lg focus:ring-2 focus:ring-primary-500 focus:outline-none transition-colors ${
                current.skipped || isAnalyzing ? 'bg-neutral-100 dark:bg-slate-800 text-neutral-400 border-neutral-200 dark:border-slate-700' : 'bg-white dark:bg-slate-950 text-neutral-800 dark:text-slate-200 border-neutral-300 dark:border-slate-600'
              }`}
            />
            <label className="flex items-center gap-2 mt-4 text-sm text-neutral-600 dark:text-slate-400 cursor-pointer hover:text-neutral-900 dark:hover:text-slate-200 transition-colors">
              <input type="checkbox" checked={current.skipped || false} onChange={e => update('skipped', e.target.checked)} disabled={isAnalyzing} className="rounded w-4 h-4 text-primary-600 cursor-pointer" />
              Skip this region (illegible/unimportant)
            </label>

            <div className="mt-8 flex justify-between items-center pt-4 border-t border-neutral-100 dark:border-slate-800">
              <button
                onClick={() => setStep(s => Math.max(0, s - 1))}
                disabled={step === 0 || isAnalyzing}
                className="text-sm text-neutral-500 hover:text-neutral-800 dark:text-slate-400 dark:hover:text-slate-200 disabled:opacity-30 font-medium transition-colors"
              >← Previous</button>
              
              {step < regions.length - 1 ? (
                <Button onClick={() => setStep(s => s + 1)} disabled={isAnalyzing}>
                  Next Region →
                </Button>
              ) : (
                <Button onClick={handleAnalyze} disabled={isAnalyzing} className="bg-success-600 hover:bg-success-700 text-white border-0">
                  {isAnalyzing ? "Analyzing..." : "Start Analyzing"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
