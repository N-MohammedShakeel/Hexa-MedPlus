import React from 'react';
import { AlertCircle, X, FileText } from 'lucide-react';
import { Button } from '../../../components/ui';
import axiosInstance from '../../../config/axios';
import { notifyError } from '../../../common/utils/toast';

export default function BlurAnnotationModal({ doc, docAiResult, setDocAiResult, docBlobUrl, onClose, analyzingStates, setAnalyzingStates, onAnalysisStarted, onAnalysisComplete }) {
  const regions = docAiResult?.blurryRegions || [];
  const isPdf = (doc?.fileKey || doc?.name || '').toLowerCase().endsWith('.pdf');

  const [step, setStep] = React.useState(0);
  const [inputs, setInputs] = React.useState(
    analyzingStates[docAiResult?.id]?.inputs || regions.map((_, i) => ({ region_index: i, doctor_text: '', skipped: false }))
  );
  const [isAnalyzing, setIsAnalyzing] = React.useState(!!analyzingStates[docAiResult?.id]?.isAnalyzing);

  const currentRegion = regions[step] || {};
  // PDFs tag each region with the page it was found on; plain images have no page and
  // always show the single uploaded image.
  const currentPage = isPdf ? (currentRegion.page || 1) : null;

  // Per-page rendered image cache for PDFs: { [page]: blobUrl }
  const [pageImages, setPageImages] = React.useState({});
  const pageImagesRef = React.useRef(pageImages);
  React.useEffect(() => { pageImagesRef.current = pageImages; }, [pageImages]);

  React.useEffect(() => {
    if (!isPdf || !currentPage || pageImagesRef.current[currentPage] || !doc?.fileKey) return;
    let objectUrl = null;
    let isActive = true;
    (async () => {
      try {
        const token = localStorage.getItem('jwt_token');
        const response = await fetch(`/api/ai/vision/pdf-page-image?fileKey=${encodeURIComponent(doc.fileKey)}&page=${currentPage}`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        const blob = await response.blob();
        if (!isActive) return;
        objectUrl = URL.createObjectURL(blob);
        setPageImages(prev => ({ ...prev, [currentPage]: objectUrl }));
      } catch (err) {
        console.error('Failed to load PDF page image:', err);
      }
    })();
    return () => { isActive = false; };
  }, [isPdf, currentPage, doc?.fileKey]);

  React.useEffect(() => {
    // Revoke cached page image object URLs on unmount only (not on every page switch).
    return () => {
      Object.values(pageImagesRef.current).forEach(url => { if (url) URL.revokeObjectURL(url); });
    };
  }, []);

  const displayImageUrl = isPdf ? pageImages[currentPage] : docBlobUrl;
  // Per-region dimensions take priority (PDF pages can differ in size); fall back to the
  // document-level dimensions used for plain single images.
  const imageWidth = currentRegion.imgWidth || docAiResult?.imageWidth || 1;
  const imageHeight = currentRegion.imgHeight || docAiResult?.imageHeight || 1;
  // Only overlay regions that belong to the page currently being displayed.
  const regionsOnPage = isPdf ? regions.filter(r => (r.page || 1) === currentPage) : regions;

  const update = (field, value) => {
    const newInputs = inputs.map((inp, i) => i === step ? { ...inp, [field]: value } : inp);
    setInputs(newInputs);
    setAnalyzingStates(prev => ({ ...prev, [docAiResult.id]: { isAnalyzing, inputs: newInputs } }));
  };

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setAnalyzingStates(prev => ({ ...prev, [docAiResult.id]: { isAnalyzing: true, inputs } }));
    onAnalysisStarted?.(doc?.fileKey, docAiResult?.id);
    try {
      const res = await axiosInstance.post(`/api/ai/vision/results/${docAiResult.id}/reanalyze`, {
        fileUrl: doc.url,
        blurDoctorInputs: inputs.map(inp => {
          const r = regions[inp.region_index] || {};
          const regionLabel = isPdf && r.page ? `page:${r.page} x:${r.x} y:${r.y}` : `x:${r.x} y:${r.y}`;
          return {
            region: regionLabel,
            text: inp.skipped ? "Skipped (not clinically significant)" : inp.doctor_text
          };
        })
      });
      setDocAiResult(prev => ({
        ...prev,
        needsBlurAnnotation: false,
        blurDoctorInputs: inputs,
        extractedText: res.data.extractedText,
        clinicalFindings: res.data.clinicalFindings,
        verified: false
      }));
      setAnalyzingStates(prev => { const next = {...prev}; delete next[docAiResult.id]; return next; });
      onAnalysisComplete?.(doc?.fileKey, true);
    } catch (e) {
      console.error('Failed to reanalyze document', e);
      notifyError('Failed to start analysis.');
      setAnalyzingStates(prev => { const next = {...prev}; delete next[docAiResult.id]; return next; });
      setIsAnalyzing(false);
      onAnalysisComplete?.(doc?.fileKey, false);
    }
  };

  const current = inputs[step] || {};

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-neutral-900/95 backdrop-blur-md animate-fade-in p-4 sm:p-8" onClick={e => e.stopPropagation()}>
      {/* Header */}
      <div className="flex items-center justify-between text-white mb-6">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-3 text-slate-100">
            <AlertCircle className="text-warning-500 w-8 h-8" />
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
        <div className="flex-1 relative flex flex-col items-center justify-center bg-black/60 rounded-8 border border-white/10 overflow-hidden p-4 shadow-2xl">
          {isPdf && (
            <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 bg-black/60 text-white text-xs font-semibold px-2.5 py-1 rounded-6">
              <FileText className="w-3.5 h-3.5" /> Page {currentPage}
            </div>
          )}
          {displayImageUrl ? (
            <div className="relative inline-block max-h-full max-w-full">
              <img src={displayImageUrl} alt="Document" className="max-h-[70vh] w-auto block rounded-4" />
              {regionsOnPage.map((reg) => {
                const globalIdx = regions.indexOf(reg);
                return (
                  <div
                    key={globalIdx}
                    style={{
                      position: 'absolute',
                      left: `${(reg.x / imageWidth) * 100}%`,
                      top: `${(reg.y / imageHeight) * 100}%`,
                      width: `${(reg.w / imageWidth) * 100}%`,
                      height: `${(reg.h / imageHeight) * 100}%`
                    }}
                    className={`border-[3px] transition-all duration-300 ${globalIdx === step ? 'border-warning-500 bg-warning-500/30 shadow-[0_0_15px_rgba(217,119,6,0.5)] z-10' : 'border-danger-500/50 bg-danger-500/10'}`}
                  />
                );
              })}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-white/50">Loading {isPdf ? `page ${currentPage}` : 'image'}...</div>
          )}
        </div>

        {/* Right: Floating Input Panel */}
        <div className="w-full lg:w-[400px] flex flex-col gap-4">
          <div className="bg-white dark:bg-slate-900 rounded-8 shadow-2xl p-6 border border-neutral-200 dark:border-slate-700 animate-slide-in">
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
                Region {step + 1} of {regions.length}
                {isPdf && <span className="ml-2 text-sm font-medium text-neutral-500 dark:text-slate-400">· Page {currentPage}</span>}
                </h3>
                <span className="text-xs font-mono text-warning-600 dark:text-warning-500 bg-warning-50 dark:bg-warning-500/15 px-2 py-0.5 rounded-6">
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
              className={`w-full min-h-[140px] p-3 text-sm border rounded-6 focus:ring-2 focus:ring-primary-500 focus:outline-none transition-colors ${
                current.skipped || isAnalyzing ? 'bg-neutral-100 dark:bg-slate-800 text-neutral-400 border-neutral-200 dark:border-slate-700' : 'bg-white dark:bg-slate-950 text-neutral-800 dark:text-slate-200 border-neutral-300 dark:border-slate-600'
              }`}
            />
            <label className="flex items-center gap-2 mt-4 text-sm text-neutral-600 dark:text-slate-400 cursor-pointer hover:text-neutral-900 dark:hover:text-slate-200 transition-colors">
              <input type="checkbox" checked={current.skipped || false} onChange={e => update('skipped', e.target.checked)} disabled={isAnalyzing} className="rounded-4 w-4 h-4 text-primary-600 cursor-pointer" />
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
                <Button variant="success" onClick={handleAnalyze} disabled={isAnalyzing}>
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
