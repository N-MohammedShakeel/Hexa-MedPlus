import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, FileText, Loader2, AlertTriangle, ImageIcon, X } from 'lucide-react';
import { Button } from '../../../components/ui';
import StatusBadge from '../../../components/ui/Badge';
import axiosInstance from '../../../config/axios';
import { notifyError } from '../../../common/utils/toast';

export default function DocumentViewModal({ 
  selectedDoc, 
  setSelectedDoc, 
  docAiResult, 
  setDocAiResult, 
  docBlobUrl, 
  loadingAiResult, 
  setDocuments 
}) {
  const [editedText, setEditedText] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editedHeading, setEditedHeading] = useState('');
  const [isEditingHeading, setIsEditingHeading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Sync edited text when docAiResult loads
  useEffect(() => {
    if (docAiResult) {
      setEditedText(docAiResult.extractedText || docAiResult.reportSummary || '');
      setEditedHeading(docAiResult.aiHeading || '');
    }
  }, [docAiResult]);

  const handleSaveEdit = async () => {
    setIsSaving(true);
    try {
      if (docAiResult?.id) {
        await axiosInstance.put(`/api/ai/vision/results/${docAiResult.id}`, {
          extractedText: editedText,
          reportSummary: editedText,
          verified: true
        });
      }
      setDocAiResult(prev => ({ 
        ...prev, 
        extractedText: editedText, 
        reportSummary: editedText, 
        verified: true 
      }));
      setDocuments(prev => prev.map(d => d.id === selectedDoc?.id ? { ...d, aiVerified: true, status: 'COMPLETED' } : d));
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to save edit:', err);
      notifyError('Failed to save verified response.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDirectVerify = async () => {
    setIsSaving(true);
    try {
      if (docAiResult?.id) {
        await axiosInstance.put(`/api/ai/vision/results/${docAiResult.id}`, {
          verified: true
        });
      }
      setDocAiResult(prev => ({ ...prev, verified: true }));
      setDocuments(prev => prev.map(d => d.id === selectedDoc?.id ? { ...d, aiVerified: true, status: 'COMPLETED' } : d));
    } catch (err) {
      console.error('Failed to verify response:', err);
      notifyError('Failed to verify response.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!selectedDoc) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-8 shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-fade-in overflow-hidden border border-neutral-300 dark:border-slate-700">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-300 dark:border-slate-700">
          <div>
            <h3 className="text-lg font-bold text-neutral-900 dark:text-slate-100">{selectedDoc.name}</h3>
            <p className="text-sm text-neutral-600 dark:text-slate-400">MRN: {selectedDoc.mrn} • {selectedDoc.type} • Status: {selectedDoc.status}</p>
          </div>
          <button
            onClick={() => setSelectedDoc(null)}
            className="p-2 text-neutral-500 dark:text-slate-400 hover:bg-neutral-100 dark:hover:bg-slate-800 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col md:flex-row gap-6">
          {/* Left Column: Uploaded Document Viewer */}
          <div className="flex-1 flex flex-col min-w-0 bg-neutral-50 dark:bg-slate-800/50 rounded-8 border border-neutral-300 dark:border-slate-700">
            <div className="p-3 border-b border-neutral-300 dark:border-slate-700 bg-neutral-100 dark:bg-slate-800">
              <h4 className="text-sm font-semibold text-neutral-800 dark:text-slate-200">Uploaded Document</h4>
            </div>
            <div className="flex-1 p-0 flex items-center justify-center min-h-[300px] relative bg-neutral-200 dark:bg-slate-900 rounded-b-8 overflow-hidden">
              {(() => {
                const fileName = selectedDoc.name.toLowerCase();
                const isPdf = fileName.endsWith('.pdf');
                const isImg = fileName.match(/\.(jpeg|jpg|gif|png|webp|bmp|dcm)$/) != null;
                const isTxt = fileName.match(/\.(txt|csv|docx|doc|json|rtf|xml|md)$/) != null;

                if (isPdf) {
                  return (
                    <iframe
                      src={docBlobUrl || ''}
                      className="w-full h-full border-0 min-h-[500px]"
                      style={{ height: '600px' }}
                      title="PDF Viewer"
                    />
                  );
                }

                if (isImg) {
                  return (
                    <div className="w-full h-full flex items-center justify-center p-2 bg-neutral-900 overflow-auto">
                      <img
                        src={docBlobUrl || ''}
                        alt="Document Preview"
                        className="max-w-full max-h-[420px] object-contain rounded-6 shadow-sm"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          const fallback = e.target.parentElement.querySelector('.img-fallback');
                          if (fallback) fallback.style.display = 'flex';
                        }}
                      />
                      <div className="img-fallback hidden flex-col items-center justify-center p-6">
                        <FileText className="w-16 h-16 text-neutral-400 mb-2" />
                        <p className="text-xs text-neutral-500 font-mono">{selectedDoc.name}</p>
                      </div>
                    </div>
                  );
                }

                if (isTxt) {
                  const textContent = docAiResult?.nativeExtractedText || docAiResult?.extractedText;
                  return (
                    <div className="w-full h-full p-4 bg-neutral-950 text-neutral-200 overflow-y-auto font-mono text-xs max-h-[500px] min-h-[300px]">
                      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-neutral-800">
                        <FileText className="w-4 h-4 text-primary-400" />
                        <span className="text-xs font-bold text-neutral-300">Document Text Content</span>
                      </div>
                      {textContent ? (
                        <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-neutral-200">{textContent}</pre>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-40 text-neutral-500">
                          <p className="text-xs italic">Reading document text content...</p>
                        </div>
                      )}
                    </div>
                  );
                }

                return (
                  <div className="flex flex-col items-center justify-center p-6">
                    <FileText className="w-16 h-16 text-neutral-400 mb-4" />
                    <p className="text-sm text-neutral-500 text-center w-full">Preview not available for {selectedDoc.name}</p>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Right Column: AI Analysis */}
          <div className="flex-1 flex flex-col min-w-0 bg-primary-50/30 dark:bg-primary-900/10 rounded-8 border border-primary-200 dark:border-primary-800">
            <div className="p-3 border-b border-primary-200 dark:border-primary-800 bg-primary-50 dark:bg-primary-900/30 flex justify-between items-center">
              <h4 className="text-sm font-semibold text-primary-800 dark:text-primary-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                AI Analysis Result
              </h4>
              {docAiResult?.verified ? (
                  <StatusBadge status="success" label="Verified" />
              ) : docAiResult?.blurryRegions?.length > 0 ? (
                  <StatusBadge status="warning" label={`${docAiResult.blurryRegions.length} Blur Regions`} />
              ) : docAiResult ? (
                  <StatusBadge status="info" label="Pending Verification" />
              ) : null}
            </div>

            <div className="flex-1 p-4 overflow-y-auto max-h-[500px] space-y-4">
              {loadingAiResult ? (
                <div className="flex items-center justify-center h-40">
                  <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
                </div>
              ) : docAiResult ? (
                (() => {
                  const isImaging = ['IMAGING','XRAY','MRI','CT_SCAN','DICOM'].includes(selectedDoc?.type);
                  const ocrText = docAiResult.extractedText || '';
                  const sexMatch = ocrText.match(/sex\s*[\/:]?\s*(male|female)/i);
                  const reportedSex = sexMatch ? sexMatch[1].toLowerCase() : null;
                  const patientGenderNorm = (selectedDoc?.patientGender || '').toLowerCase().replace('m','male').replace('f','female');
                  const sexMismatch = reportedSex && patientGenderNorm && reportedSex !== patientGenderNorm;
                  return (
                <>
                  {/* ── Editable AI Heading ──────────────────────── */}
                  <div className="flex items-center gap-2">
                    {isEditingHeading ? (
                      <div className="flex-1 flex gap-2">
                        <input
                          value={editedHeading}
                          onChange={e => setEditedHeading(e.target.value)}
                          className="flex-1 text-sm font-bold px-2 py-1 border border-primary-300 rounded-6 bg-white dark:bg-slate-900 dark:border-primary-700 text-neutral-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                          placeholder="AI analysis heading..."
                        />
                        <Button size="sm" onClick={async () => {
                          if (docAiResult?.id) {
                            await axiosInstance.put(`/api/ai/vision/results/${docAiResult.id}`, { aiHeading: editedHeading });
                          }
                          setDocAiResult(prev => ({ ...prev, aiHeading: editedHeading }));
                          setIsEditingHeading(false);
                        }}>Save</Button>
                        <Button size="sm" variant="secondary" onClick={() => { setIsEditingHeading(false); setEditedHeading(docAiResult?.aiHeading || ''); }}>
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <h5 className="text-sm font-bold text-neutral-800 dark:text-slate-200 flex-1">
                          {docAiResult.aiHeading || selectedDoc.type || 'Clinical Document'}
                        </h5>
                        <button onClick={() => setIsEditingHeading(true)} className="text-xs text-neutral-400 dark:text-slate-500 hover:text-primary-600 dark:hover:text-primary-400 font-medium">Edit</button>
                      </>
                    )}
                  </div>

                  {/* —— PHI Sex Mismatch Warning —————————————————— */}
                  {sexMismatch && (
                    <div className="flex items-start gap-2 p-2.5 bg-warning-50 dark:bg-warning-500/10 border border-warning-500/40 rounded-8">
                      <AlertTriangle className="w-4 h-4 text-warning-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-bold text-warning-700 dark:text-warning-500">PHI Mismatch Detected</p>
                        <p className="text-xs text-warning-600 dark:text-warning-500 mt-0.5">
                          Patient sex in report (<strong className="capitalize">{reportedSex}</strong>) differs from the patient record. Please verify this is the correct document.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* —— Image Metadata Strip (IMAGING docs only, not labs) —— */}
                  {isImaging && docAiResult.imageMetadata?.modality && (
                    <div className="flex flex-wrap gap-2 p-2 bg-info-50 dark:bg-info-500/10 border border-info-100 dark:border-info-500/30 rounded-8 text-xs">
                      <span className="font-semibold text-info-600 dark:text-info-500">Modality:</span>
                      <span className="text-info-600 dark:text-info-500 mr-2">{docAiResult.imageMetadata.modality}</span>
                      <span className="font-semibold text-info-600 dark:text-info-500">Region:</span>
                      <span className="text-info-600 dark:text-info-500 mr-2">{docAiResult.imageMetadata.body_part_or_document_type}</span>
                      {docAiResult.imageMetadata.readability_confidence != null && (
                        <><span className="font-semibold text-info-600 dark:text-info-500">Confidence:</span>
                        <span className="text-info-600 dark:text-info-500">{Math.round(docAiResult.imageMetadata.readability_confidence * 100)}%</span></>
                      )}
                    </div>
                  )}



                  {/* ── AI Recommendation / OCR Text ─────────────── */}
                  <div className="flex flex-col">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="text-xs font-bold text-neutral-600 dark:text-slate-400 uppercase">
                        {isImaging ? 'Imaging Details' : (docAiResult.clinicalFindings?.length > 0 ? 'Recommendation' : (docAiResult.extractedText ? 'Extracted Text (Vision AI)' : 'AI Summary'))}
                      </h5>
                      <div className="flex items-center gap-2">
                        {!isEditing && !docAiResult.verified && (
                          <Button size="sm" variant="secondary" onClick={handleDirectVerify} disabled={isSaving}>
                            <CheckCircle className="w-3.5 h-3.5 text-success-600 dark:text-success-500 mr-1" />
                            1-Click Verify
                          </Button>
                        )}
                        {!isEditing && !isImaging && (
                          <button onClick={() => setIsEditing(true)} className="text-xs text-primary-600 hover:text-primary-700 font-semibold">
                            Edit
                          </button>
                        )}
                      </div>
                    </div>
                    {isImaging ? (
                      <div className="p-4 bg-white dark:bg-slate-900 border border-neutral-300 dark:border-slate-700 rounded-8 text-sm text-neutral-600 dark:text-slate-400 text-center">
                        <ImageIcon className="w-8 h-8 text-neutral-400 mx-auto mb-2" />
                        Detailed clinical findings are hidden in Document Workspace to reduce clutter. 
                        <br/><br/>
                        <span className="font-semibold text-primary-600 dark:text-primary-400">Please view full imaging details in the Patient Management → Imaging Tab.</span>
                      </div>
                    ) : isEditing ? (
                      <div className="flex flex-col gap-2">
                        <textarea
                          value={editedText}
                          onChange={e => setEditedText(e.target.value)}
                          className="w-full min-h-[200px] p-3 text-sm text-neutral-800 dark:text-slate-200 bg-white dark:bg-slate-900 border border-primary-300 dark:border-primary-700 rounded-6 focus:ring-2 focus:ring-primary-500 focus:outline-none"
                        />
                        <div className="flex justify-end gap-2">
                          <Button variant="secondary" size="sm" onClick={() => { setIsEditing(false); setEditedText(docAiResult.extractedText || docAiResult.reportSummary || ''); }}>Cancel</Button>
                          <Button size="sm" onClick={handleSaveEdit} disabled={isSaving}>
                            {isSaving ? 'Saving...' : 'Verify & Save'}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <pre className="text-sm font-sans whitespace-pre-wrap text-neutral-800 dark:text-slate-300 bg-white dark:bg-slate-900 p-3 rounded-6 border border-neutral-300 dark:border-slate-700 min-h-[100px] max-h-[240px] overflow-y-auto">
                        {docAiResult.clinicalFindings?.length > 0
                          ? (docAiResult.reportSummary || 'No recommendation provided.')
                          : (docAiResult.extractedText || docAiResult.reportSummary || 'No text or findings extracted.')}
                      </pre>
                    )}
                  </div>

                  {/* ── Limitations ───────────────────────────────── */}
                  {docAiResult.imageMetadata?.limitations?.length > 0 && (
                    <div className="text-xs text-neutral-500 dark:text-slate-500 bg-neutral-50 dark:bg-slate-800/50 rounded-4 p-2">
                      <span className="font-semibold">Limitations: </span>
                      {docAiResult.imageMetadata.limitations.join(' • ')}
                    </div>
                  )}
                </>
                );})()
              ) : (
                <div className="flex flex-col items-center justify-center h-40 text-center">
                  <p className="text-sm text-neutral-500 dark:text-slate-400">No AI analysis available for this document yet.</p>
                  {selectedDoc.status === 'PROCESSING' && (
                    <p className="text-xs text-primary-500 dark:text-primary-400 mt-2">Analysis is currently in progress...</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-neutral-300 dark:border-slate-700 flex items-center justify-between gap-3 bg-neutral-50 dark:bg-slate-800/50">
          <div className="text-xs text-neutral-500 dark:text-slate-500">
            {docAiResult?.modelUsed && <span>Model: <span className="font-mono">{docAiResult.modelUsed}</span></span>}
            {docAiResult?.analyzedAt && <span className="ml-4">Analyzed: {new Date(docAiResult.analyzedAt).toLocaleString()}</span>}
          </div>
          <Button variant="secondary" onClick={() => setSelectedDoc(null)}>Close</Button>
        </div>
      </div>
    </div>
  );
}