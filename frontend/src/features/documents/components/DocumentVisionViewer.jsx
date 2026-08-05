import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, Brain, Save, CheckCircle, Loader2 } from 'lucide-react';
import Button from '../../../components/ui/Button';

export default function DocumentVisionViewer({ record, onClose, onSaveHitl, onVerify }) {
    const [hitlValues, setHitlValues] = useState({});
    const [isVerifying, setIsVerifying] = useState(false);

    if (!record) return null;

    const { fileKey, extractedText, reportSummary, blurryRegions, imageWidth, imageHeight } = record;
    
    // Construct the file URL (assuming document-service handles /uploads or S3, but we'll use a placeholder for now since we only have fileKey)
    // Normally this would be a pre-signed URL. For demo purposes we just display a placeholder image or rely on the browser to load it if it's relative.
    const [blobUrl, setBlobUrl] = useState(null);

    useEffect(() => {
        if (!fileKey) return;
        let objectUrl = null;
        const fetchBlob = async () => {
            try {
                const token = localStorage.getItem('jwt_token');
                const response = await fetch(`/api/documents/download?fileKey=${encodeURIComponent(fileKey)}`, {
                    headers: token ? { 'Authorization': `Bearer ${token}` } : {}
                });
                const blob = await response.blob();
                // Set appropriate content type if it's missing or generic
                let type = blob.type;
                if (fileKey.toLowerCase().endsWith('.pdf')) type = 'application/pdf';
                const typedBlob = new Blob([blob], { type });
                objectUrl = URL.createObjectURL(typedBlob);
                setBlobUrl(objectUrl);
            } catch (err) {
                console.error("Failed to load document blob:", err);
            }
        };
        fetchBlob();
        return () => {
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [fileKey]);

    const displayUrl = blobUrl || '';

    const handleHitlChange = (index, value) => {
        setHitlValues(prev => ({ ...prev, [index]: value }));
    };

    const handleSave = () => {
        if (onSaveHitl) {
            onSaveHitl(record.id, hitlValues);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/80 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-7xl h-[90vh] flex flex-col overflow-hidden animate-fade-in">
                
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 bg-neutral-50">
                    <div>
                        <h3 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
                            Vision AI Document Analysis
                        </h3>
                        <p className="text-sm text-neutral-500 font-mono">{fileKey}</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-neutral-200 text-neutral-500 transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Body: Split View */}
                <div className="flex flex-1 overflow-hidden">
                    
                    {/* Left Pane: Image & HITL Overlay */}
                    <div className="flex-1 bg-neutral-900 relative overflow-hidden flex items-center justify-center p-4">
                        {fileKey && fileKey.toLowerCase().endsWith('.pdf') ? (
                            <iframe 
                                src={displayUrl} 
                                title="PDF Document" 
                                className="w-full h-full rounded shadow-lg bg-white"
                                type="application/pdf"
                            />
                        ) : (
                            <div className="relative max-w-full max-h-full inline-block" style={{ aspectRatio: imageWidth && imageHeight ? `${imageWidth}/${imageHeight}` : 'auto' }}>
                                <img 
                                    src={displayUrl} 
                                    alt="Medical Document" 
                                    className="max-w-full max-h-full object-contain shadow-lg"
                                    onError={(e) => { e.target.src = 'https://placehold.co/800x1000/1a1a1a/404040?text=Image+Unavailable'; }}
                                />
                                
                                {/* Bounding Box Overlays */}
                                {blurryRegions && blurryRegions.length > 0 && blurryRegions.map((region, idx) => {
                                    if (!imageWidth || !imageHeight) return null;
                                    
                                    const top = (region.y / imageHeight) * 100;
                                    const left = (region.x / imageWidth) * 100;
                                    const width = (region.w / imageWidth) * 100;
                                    const height = (region.h / imageHeight) * 100;

                                    return (
                                        <div 
                                            key={idx}
                                            className="absolute border-2 border-amber-500 bg-amber-500/20 group hover:z-10"
                                            style={{ top: `${top}%`, left: `${left}%`, width: `${width}%`, height: `${height}%` }}
                                        >
                                            <div className="absolute -top-6 left-0 bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 whitespace-nowrap rounded-t">
                                                Region {idx + 1}
                                            </div>
                                            {/* Removed inline HITL input - use DocumentWorkspacePage instead */}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Right Pane: AI Analysis Data */}
                    <div className="w-[450px] bg-white flex flex-col border-l border-neutral-200 overflow-y-auto">
                        
                        {/* Header with Verification Status */}
                        <div className="px-5 py-4 border-b border-neutral-200 bg-neutral-50 flex justify-between items-center sticky top-0 z-10">
                            <h4 className="flex items-center gap-2 text-sm font-bold text-neutral-800 uppercase tracking-wide">
                                <Brain className="w-4 h-4 text-violet-600" /> AI Analysis Result
                            </h4>
                            {record.verified ? (
                                <span className="text-[10px] font-bold text-success-700 bg-success-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <CheckCircle className="w-3.5 h-3.5" /> Verified
                                </span>
                            ) : (
                                <span className="text-[10px] font-bold text-primary-700 bg-primary-100 px-2 py-0.5 rounded-full">
                                    Pending Verification
                                </span>
                            )}
                        </div>

                        <div className="flex-1 p-5 space-y-5">
                            {/* Modality & Confidence Strip */}
                            {record.imageMetadata?.modality && (
                                <div className="flex flex-wrap gap-2 p-2.5 bg-blue-50 border border-blue-200 rounded-lg text-xs">
                                    <span className="font-semibold text-blue-800">Modality:</span>
                                    <span className="text-blue-700 mr-2">{record.imageMetadata.modality}</span>
                                    <span className="font-semibold text-blue-800">Region:</span>
                                    <span className="text-blue-700 mr-2">{record.imageMetadata.body_part_or_document_type}</span>
                                    {record.imageMetadata.readability_confidence != null && (
                                        <>
                                            <span className="font-semibold text-blue-800">Confidence:</span>
                                            <span className="text-blue-700">{Math.round(record.imageMetadata.readability_confidence * 100)}%</span>
                                        </>
                                    )}
                                </div>
                            )}

                            {/* Limitations */}
                            {record.imageMetadata?.limitations?.length > 0 && (
                                <div className="text-xs text-neutral-600 bg-neutral-50 rounded p-2 border border-neutral-200">
                                    <span className="font-semibold">Limitations: </span>
                                    {record.imageMetadata.limitations.join(' • ')}
                                </div>
                            )}

                            {record.imageMetadata && record.imageMetadata.total_pages > 0 && record.imageMetadata.processed_pages < record.imageMetadata.total_pages && (
                                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg animate-pulse">
                                    <h4 className="flex items-center gap-2 text-sm font-bold text-blue-800 mb-1">
                                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                                        Analyzing page {record.imageMetadata.processed_pages + 1} of {record.imageMetadata.total_pages}...
                                    </h4>
                                    <p className="text-xs text-blue-600">Results are updating progressively as each page is analyzed.</p>
                                </div>
                            )}

                            {/* Blur annotation pending banner */}
                            {blurryRegions && blurryRegions.length > 0 && (!record.blurDoctorInputs || record.blurDoctorInputs.length === 0) && (
                                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                                    <h4 className="flex items-center gap-2 text-sm font-bold text-amber-800 mb-2">
                                        <AlertTriangle className="w-4 h-4" />
                                        Human-in-the-Loop Required
                                    </h4>
                                    <p className="text-xs text-amber-700">
                                        The Vision AI detected {blurryRegions.length} region(s) with low confidence.
                                        Please go to the <strong>Document Workspace</strong> to review the highlighted areas and provide corrections. The structured data below is a preliminary result from the initial scan.
                                    </p>
                                </div>
                            )}

                            {/* Blur annotations submitted — LLaMA processing */}
                            {blurryRegions && blurryRegions.length > 0 && record.blurDoctorInputs && record.blurDoctorInputs.length > 0 && !record.reportSummary && (
                                <div className="flex items-center gap-3 p-4 bg-primary-50 border border-primary-200 rounded-lg">
                                    <Loader2 className="w-5 h-5 animate-spin text-primary-600 shrink-0" />
                                    <div>
                                        <p className="text-xs font-bold text-primary-800">Structuring with AI...</p>
                                        <p className="text-xs text-primary-600 mt-0.5">LLaMA is generating the structured summary from your annotations. Refresh shortly.</p>
                                    </div>
                                </div>
                            )}

                            {/* Structured Lab Results Table (Removed from modal view) */}

                            {/* Clinical Findings Table (imaging) */}
                            {record.documentType !== 'LAB_REPORT' && record.clinicalFindings?.length > 0 && (
                                <div>
                                    <h5 className="text-xs font-bold text-neutral-600 uppercase mb-2">Clinical Findings</h5>
                                    <div className="overflow-x-auto rounded-lg border border-neutral-200">
                                        <table className="w-full text-[10px] text-left">
                                            <thead className="bg-neutral-100 text-neutral-600 border-b border-neutral-200">
                                                <tr>
                                                    <th className="px-2 py-1.5 font-semibold">Finding</th>
                                                    <th className="px-2 py-1.5 font-semibold">Location</th>
                                                    <th className="px-2 py-1.5 font-semibold">Size</th>
                                                    <th className="px-2 py-1.5 font-semibold">Severity</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-neutral-100">
                                                {record.clinicalFindings.map((f, i) => (
                                                    <tr key={i} className="bg-white hover:bg-neutral-50">
                                                        <td className="px-2 py-1.5 font-semibold text-neutral-800">{f.finding || '—'}</td>
                                                        <td className="px-2 py-1.5 text-neutral-600">{f.location || '—'}</td>
                                                        <td className="px-2 py-1.5 text-neutral-600">{f.size_estimate || '—'}</td>
                                                        <td className="px-2 py-1.5">
                                                            <span className={`px-1.5 py-0.5 rounded font-bold ${
                                                                (f.severity || '').toLowerCase() === 'significant' ? 'bg-red-100 text-red-700' :
                                                                (f.severity || '').toLowerCase() === 'moderate' ? 'bg-amber-100 text-amber-700' :
                                                                'bg-green-100 text-green-700'
                                                            }`}>{f.severity || '—'}</span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* Summary / Extracted Text */}
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center justify-between">
                                    <h5 className="text-xs font-bold text-neutral-600 uppercase">
                                        {record.clinicalFindings?.length > 0 
                                            ? (record.documentType === 'LAB_REPORT' ? 'AI Summary' : 'AI Radiologist Summary') 
                                            : 'Extracted Text'}
                                    </h5>
                                    {onVerify && !record.verified && (
                                        <Button
                                            size="xs"
                                            disabled={isVerifying}
                                            onClick={async () => {
                                                setIsVerifying(true);
                                                try {
                                                    await onVerify(record.id);
                                                } finally {
                                                    setIsVerifying(false);
                                                }
                                            }}
                                        >
                                            {isVerifying ? (
                                                <>
                                                    <svg className="animate-spin w-3.5 h-3.5 mr-1" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                                    </svg>
                                                    Verifying...
                                                </>
                                            ) : (
                                                <>
                                                    <CheckCircle className="w-3.5 h-3.5 mr-1" /> 1-Click Verify
                                                </>
                                            )}
                                        </Button>
                                    )}
                                </div>
                                <pre className="text-[11px] font-sans whitespace-pre-wrap text-neutral-800 bg-neutral-50 p-3 rounded border border-neutral-200">
                                    {record.clinicalFindings?.length > 0
                                        ? (record.reportSummary || (
                                            <span className="italic text-neutral-400">Summary is being generated by AI… Please refresh in a moment.</span>
                                          ))
                                        : (record.extractedText || record.reportSummary || 'The AI analysis is still processing, or failed to extract findings due to low image quality or an internal error.')}
                                </pre>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
