import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, Brain, CheckCircle, Loader2, Edit2 } from 'lucide-react';
import Button from '../../../components/ui/Button';
import StatusBadge from '../../../components/ui/Badge';

export default function DocumentVisionViewer({ record, onClose, onVerify, onEditFindings }) {
    const [isVerifying, setIsVerifying] = useState(false);

    const { fileKey, blurryRegions, imageWidth, imageHeight } = record;
    
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

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/80 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-neutral-900 rounded-8 shadow-2xl w-full max-w-7xl h-[90vh] flex flex-col overflow-hidden animate-fade-in border border-neutral-200 dark:border-neutral-800">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50">
                    <div>
                        <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                            Vision AI Document Analysis
                        </h3>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400 font-mono">{fileKey}</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-500 dark:text-neutral-400 transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Body: Split View */}
                <div className="flex flex-1 overflow-hidden">
                    
                    {/* Left Pane: Image / PDF / Text Preview */}
                    <div className="flex-1 bg-neutral-900 relative overflow-hidden flex items-center justify-center p-4">
                        {(() => {
                            const ext = fileKey ? fileKey.toLowerCase().split('.').pop() : '';
                            const isTextFile = ['txt', 'csv', 'docx', 'doc', 'xlsx', 'xls'].includes(ext);

                            if (fileKey && fileKey.toLowerCase().endsWith('.pdf')) {
                                return (
                                    <iframe
                                        src={displayUrl}
                                        title="PDF Document"
                                        className="w-full h-full rounded-6 shadow-lg bg-white"
                                        type="application/pdf"
                                    />
                                );
                            }

                            if (isTextFile) {
                                // Show native extracted text for plain text documents
                                const content = record.nativeExtractedText || record.extractedText;
                                return (
                                    <div className="w-full h-full overflow-y-auto rounded-6 border border-neutral-700 bg-neutral-950 p-5 shadow-inner">
                                        <div className="flex items-center gap-2 mb-3 pb-3 border-b border-neutral-800">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 bg-neutral-800 px-2 py-1 rounded-4">
                                                .{ext.toUpperCase()} Document
                                            </span>
                                            <span className="text-[10px] text-neutral-600">Text Preview</span>
                                        </div>
                                        {content ? (
                                            <pre className="text-xs text-neutral-200 font-mono whitespace-pre-wrap leading-relaxed">
                                                {content}
                                            </pre>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-full text-center py-10">
                                                <span className="text-neutral-500 text-sm">Text content not extracted yet.</span>
                                            </div>
                                        )}
                                    </div>
                                );
                            }

                            // Image files
                            return (
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
                                                className="absolute border-2 border-warning-500 bg-warning-500/20 group hover:z-10"
                                                style={{ top: `${top}%`, left: `${left}%`, width: `${width}%`, height: `${height}%` }}
                                            >
                                                <div className="absolute -top-6 left-0 bg-warning-500 text-white text-[10px] font-bold px-1.5 py-0.5 whitespace-nowrap rounded-t-4">
                                                    Region {idx + 1}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })()}
                    </div>

                    {/* Right Pane: AI Analysis Data */}
                    <div className="w-[450px] bg-white dark:bg-neutral-900 flex flex-col border-l border-neutral-200 dark:border-neutral-800 overflow-y-auto">

                        {/* Header with Verification Status */}
                        <div className="px-5 py-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50 flex justify-between items-center sticky top-0 z-10">
                            <h4 className="flex items-center gap-2 text-sm font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wide">
                                <Brain className="w-4 h-4 text-primary-600 dark:text-primary-400" /> AI Analysis Result
                            </h4>
                            <div className="flex items-center gap-2">
                                {record.verified ? (
                                    <StatusBadge status="success" label="Verified" />
                                ) : (
                                    <StatusBadge status="info" label="Pending Verification" />
                                )}
                                {onEditFindings && (
                                    <button
                                        onClick={() => onEditFindings(record)}
                                        className="flex items-center gap-1 text-[10px] font-bold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20 hover:bg-primary-100 dark:hover:bg-primary-900/30 border border-primary-200 dark:border-primary-800 px-2.5 py-1 rounded-6 transition-colors"
                                        title="Edit Findings"
                                    >
                                        <Edit2 className="w-3 h-3 mr-0.5" /> Edit Findings
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="flex-1 p-5 space-y-5">
                            {/* Modality & Confidence Strip */}
                            {record.imageMetadata?.modality && (
                                <div className="flex flex-wrap gap-2 p-2.5 bg-info-50 dark:bg-info-500/10 border border-info-100 dark:border-info-500/30 rounded-8 text-xs">
                                    <span className="font-semibold text-info-600 dark:text-info-500">Modality:</span>
                                    <span className="text-info-600 dark:text-info-500 mr-2">{record.imageMetadata.modality}</span>
                                    <span className="font-semibold text-info-600 dark:text-info-500">Region:</span>
                                    <span className="text-info-600 dark:text-info-500 mr-2">{record.imageMetadata.body_part_or_document_type}</span>
                                    {record.imageMetadata.readability_confidence != null && (
                                        <>
                                            <span className="font-semibold text-info-600 dark:text-info-500">Confidence:</span>
                                            <span className="text-info-600 dark:text-info-500">{Math.round(record.imageMetadata.readability_confidence * 100)}%</span>
                                        </>
                                    )}
                                </div>
                            )}

                            {/* Limitations */}
                            {record.imageMetadata?.limitations?.length > 0 && (
                                <div className="text-xs text-neutral-600 dark:text-neutral-400 bg-neutral-50 dark:bg-neutral-800/50 rounded-8 p-2 border border-neutral-200 dark:border-neutral-800">
                                    <span className="font-semibold">Limitations: </span>
                                    {record.imageMetadata.limitations.join(' • ')}
                                </div>
                            )}

                            {record.imageMetadata && record.imageMetadata.total_pages > 0 && record.imageMetadata.processed_pages < record.imageMetadata.total_pages && (
                                <div className="p-4 bg-info-50 dark:bg-info-500/10 border border-info-100 dark:border-info-500/30 rounded-8 animate-pulse">
                                    <h4 className="flex items-center gap-2 text-sm font-bold text-info-600 dark:text-info-500 mb-1">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Analyzing page {record.imageMetadata.processed_pages + 1} of {record.imageMetadata.total_pages}...
                                    </h4>
                                    <p className="text-xs text-info-600 dark:text-info-500">Results are updating progressively as each page is analyzed.</p>
                                </div>
                            )}

                            {/* Blur annotation pending banner */}
                            {blurryRegions && blurryRegions.length > 0 && (!record.blurDoctorInputs || record.blurDoctorInputs.length === 0) && (
                                <div className="p-4 bg-warning-50 dark:bg-warning-500/10 border border-warning-500/30 rounded-8">
                                    <h4 className="flex items-center gap-2 text-sm font-bold text-warning-700 dark:text-warning-500 mb-2">
                                        <AlertTriangle className="w-4 h-4" />
                                        Human-in-the-Loop Required
                                    </h4>
                                    <p className="text-xs text-warning-600 dark:text-warning-500">
                                        The Vision AI detected {blurryRegions.length} region(s) with low confidence.
                                        Please go to the <strong>Document Workspace</strong> to review the highlighted areas and provide corrections. The structured data below is a preliminary result from the initial scan.
                                    </p>
                                </div>
                            )}

                            {/* Blur annotations submitted — LLaMA processing */}
                            {blurryRegions && blurryRegions.length > 0 && record.blurDoctorInputs && record.blurDoctorInputs.length > 0 && !record.reportSummary && (
                                <div className="flex items-center gap-3 p-4 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-8">
                                    <Loader2 className="w-5 h-5 animate-spin text-primary-600 dark:text-primary-400 shrink-0" />
                                    <div>
                                        <p className="text-xs font-bold text-primary-800 dark:text-primary-300">Structuring with AI...</p>
                                        <p className="text-xs text-primary-600 dark:text-primary-400 mt-0.5">LLaMA is generating the structured summary from your annotations. Refresh shortly.</p>
                                    </div>
                                </div>
                            )}

                            {/* Structured Lab Results Table (Removed from modal view) */}

                            {/* Clinical Findings Table (imaging) */}
                            {record.documentType !== 'LAB_REPORT' && record.clinicalFindings?.length > 0 && (
                                <div>
                                    <h5 className="text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase mb-2">Clinical Findings</h5>
                                    <div className="overflow-x-auto rounded-8 border border-neutral-200 dark:border-neutral-800">
                                        <table className="w-full text-[10px] text-left">
                                            <thead className="bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border-b border-neutral-200 dark:border-neutral-800">
                                                <tr>
                                                    <th className="px-2 py-1.5 font-semibold">Finding</th>
                                                    <th className="px-2 py-1.5 font-semibold">Location</th>
                                                    <th className="px-2 py-1.5 font-semibold">Size</th>
                                                    <th className="px-2 py-1.5 font-semibold">Severity</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                                                {record.clinicalFindings.map((f, i) => (
                                                    <tr key={i} className="bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                                                        <td className="px-2 py-1.5 font-semibold text-neutral-800 dark:text-neutral-200">{f.finding || '—'}</td>
                                                        <td className="px-2 py-1.5 text-neutral-600 dark:text-neutral-400">{f.location || '—'}</td>
                                                        <td className="px-2 py-1.5 text-neutral-600 dark:text-neutral-400">{f.size_estimate || '—'}</td>
                                                        <td className="px-2 py-1.5">
                                                            <span className={`px-1.5 py-0.5 rounded-4 font-bold ${
                                                                (f.severity || '').toLowerCase() === 'significant' ? 'bg-danger-100 text-danger-700 dark:bg-danger-500/15 dark:text-danger-500' :
                                                                (f.severity || '').toLowerCase() === 'moderate' ? 'bg-warning-50 text-warning-500 dark:bg-warning-500/15' :
                                                                'bg-success-100 text-success-700 dark:bg-success-500/15 dark:text-success-500'
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
                                    <h5 className="text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase">
                                        {record.clinicalFindings?.length > 0
                                            ? (record.documentType === 'LAB_REPORT' ? 'AI Summary' : 'AI Radiologist Summary')
                                            : 'Extracted Text'}
                                    </h5>
                                    {onVerify && !record.verified && (
                                        <Button
                                            size="sm"
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
                                                    <Loader2 className="animate-spin w-3.5 h-3.5 mr-1" />
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

                                <pre className="text-[11px] font-sans whitespace-pre-wrap text-neutral-800 dark:text-neutral-300 bg-neutral-50 dark:bg-neutral-800/50 p-3 rounded-6 border border-neutral-200 dark:border-neutral-800">
                                    {record.clinicalFindings?.length > 0
                                        ? (record.reportSummary || (
                                            <span className="italic text-neutral-400 dark:text-neutral-500">Summary is being generated by AI… Please refresh in a moment.</span>
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
