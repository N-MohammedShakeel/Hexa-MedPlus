import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, FileText, Loader2, AlertTriangle, ImageIcon } from 'lucide-react';
import { Button } from '../../../components/ui';
import StatusBadge from '../../../components/ui/Badge';
import axiosInstance from '../../../config/axios';

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
      alert('Failed to save verified response.');
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
      alert('Failed to verify response.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!selectedDoc) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-fade-in overflow-hidden border border-neutral-300 dark:border-slate-700">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-300 dark:border-slate-700">
          <div>
            <h3 className="text-lg font-bold text-neutral-900 dark:text-slate-100">{selectedDoc.name}</h3>
            <p className="text-sm text-neutral-600 dark:text-slate-400">MRN: {selectedDoc.mrn} • {selectedDoc.type} • Status: {selectedDoc.status}</p>
          </div>
          <button 
            onClick={() => setSelectedDoc(null)}
            className="p-2 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-slate-800 rounded-full transition-colors"
          >
            ✕
          </button>
        </div>
        
        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col md:flex-row gap-6">
          {/* Left Column: Uploaded Document Viewer */}
          <div className="flex-1 flex flex-col min-w-0 bg-neutral-50 dark:bg-slate-800/50 rounded-lg border border-neutral-300 dark:border-slate-700">
            <div className="p-3 border-b border-neutral-300 dark:border-slate-700 bg-neutral-100 dark:bg-slate-800">
              <h4 className="text-sm font-semibold text-neutral-800 dark:text-slate-200">Uploaded Document</h4>
            </div>
            <div className="flex-1 p-0 flex items-center justify-center min-h-[300px] relative bg-neutral-200 dark:bg-slate-900 rounded-b-lg overflow-hidden">
              {selectedDoc.name.toLowerCase().endsWith('.pdf') ? (
                <iframe
                  src={docBlobUrl || ''}
                  className="w-full h-full border-0 min-h-[500px]"
                  style={{ height: '600px' }}
                  title="PDF Viewer"
                />
              ) : selectedDoc.name.toLowerCase().match(/\.(jpeg|jpg|gif|png|webp|bmp|dcm)$/) != null ? (
                <div className="w-full h-full flex items-center justify-center p-2 bg-neutral-900 overflow-auto">
                  <img
                    src={docBlobUrl || ''}
                    alt="Document Preview"
                    className="max-w-full max-h-[420px] object-contain rounded shadow-sm"
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
              ) : (
                <div className="flex flex-col items-center justify-center p-6">
                  <FileText className="w-16 h-16 text-neutral-400 mb-4" />
                  <p className="text-sm text-neutral-500 text-center w-full">Preview not available for {selectedDoc.name}</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: AI Analysis */}
          <div className="flex-1 flex flex-col min-w-0 bg-primary-50/30 dark:bg-primary-900/10 rounded-lg border border-primary-200 dark:border-primary-800">
            <div className="p-3 border-b border-primary-200 dark:border-primary-800 bg-primary-50 dark:bg-primary-900/30 flex justify-between items-center">
              <h4 className="text-sm font-semibold text-primary-800 dark:text-primary-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                AI Analysis Result
              </h4>
              {docAiResult?.verified ? (
                  <span className="text-xs font-bold text-success-700 bg-success-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Verified
                  </span>
              ) : docAiResult?.blurryRegions?.length > 0 ? (
                  <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                    {docAiResult.blurryRegions.length} Blur Regions
                  </span>
              ) : docAiResult ? (
                  <span className="text-xs font-bold text-primary-700 bg-primary-100 px-2 py-0.5 rounded-full">
                    Pending Verification
                  </span>
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
                          className="flex-1 text-sm font-bold px-2 py-1 border border-primary-300 rounded-md bg-white dark:bg-slate-900 dark:border-primary-700 text-neutral-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                          placeholder="AI analysis heading..."
                        />
                        <Button size="xs" onClick={async () => {
                          if (docAiResult?.id) {
                            await axiosInstance.put(`/api/ai/vision/results/${docAiResult.id}`, { aiHeading: editedHeading });
                          }
                          setDocAiResult(prev => ({ ...prev, aiHeading: editedHeading }));
                          setIsEditingHeading(false);
                        }}>Save</Button>
                        <Button size="xs" variant="secondary" onClick={() => { setIsEditingHeading(false); setEditedHeading(docAiResult?.aiHeading || ''); }}>✕</Button>
                      </div>
                    ) : (
                      <>
                        <h5 className="text-sm font-bold text-neutral-800 dark:text-slate-200 flex-1">
                          {docAiResult.aiHeading || selectedDoc.type || 'Clinical Document'}
                        </h5>
                        <button onClick={() => setIsEditingHeading(true)} className="text-xs text-neutral-400 hover:text-primary-600 font-medium">Edit</button>
                      </>
                    )}
                  </div>

                  {/* —— PHI Sex Mismatch Warning —————————————————— */}
                  {sexMismatch && (
                    <div className="flex items-start gap-2 p-2.5 bg-amber-50 border border-amber-300 rounded-lg">
                      <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-bold text-amber-800">PHI Mismatch Detected</p>
                        <p className="text-xs text-amber-700 mt-0.5">
                          Patient sex in report (<strong className="capitalize">{reportedSex}</strong>) differs from the patient record. Please verify this is the correct document.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* —— Image Metadata Strip (IMAGING docs only, not labs) —— */}
                  {isImaging && docAiResult.imageMetadata?.modality && (
                    <div className="flex flex-wrap gap-2 p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-xs">
                      <span className="font-semibold text-blue-800 dark:text-blue-300">Modality:</span>
                      <span className="text-blue-700 dark:text-blue-400 mr-2">{docAiResult.imageMetadata.modality}</span>
                      <span className="font-semibold text-blue-800 dark:text-blue-300">Region:</span>
                      <span className="text-blue-700 dark:text-blue-400 mr-2">{docAiResult.imageMetadata.body_part_or_document_type}</span>
                      {docAiResult.imageMetadata.readability_confidence != null && (
                        <><span className="font-semibold text-blue-800 dark:text-blue-300">Confidence:</span>
                        <span className="text-blue-700 dark:text-blue-400">{Math.round(docAiResult.imageMetadata.readability_confidence * 100)}%</span></>
                      )}
                    </div>
                  )}

                  {/* ── Clinical Findings Table (imaging) ────────── */}
                  {!isImaging && docAiResult.clinicalFindings?.length > 0 && (
                    <div>
                      <h5 className="text-xs font-bold text-neutral-600 dark:text-slate-400 uppercase mb-2">Clinical Findings</h5>
                      <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-slate-700">
                        <table className="w-full text-xs">
                          <thead className="bg-neutral-100 dark:bg-slate-800">
                            <tr>
                              {['Finding', 'Location', 'Appearance', 'Signal', 'Size', 'Severity', 'Conf.'].map(h => (
                                <th key={h} className="px-2 py-1.5 text-left text-neutral-700 dark:text-slate-300 font-semibold">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {docAiResult.clinicalFindings.map((f, i) => (
                              <tr key={i} className="border-t border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                                <td className="px-2 py-1.5 font-semibold text-neutral-800 dark:text-slate-200">{f.finding || '—'}</td>
                                <td className="px-2 py-1.5 text-neutral-700 dark:text-slate-300">{f.location || '—'}</td>
                                <td className="px-2 py-1.5 text-neutral-700 dark:text-slate-300">{f.appearance || '—'}</td>
                                <td className="px-2 py-1.5 text-neutral-700 dark:text-slate-300">{f.signal || '—'}</td>
                                <td className="px-2 py-1.5 text-neutral-700 dark:text-slate-300">{f.size_estimate || '—'}</td>
                                <td className="px-2 py-1.5">
                                  <span className={`px-1.5 py-0.5 rounded font-semibold ${
                                    (f.severity || '').toLowerCase() === 'significant' ? 'bg-red-100 text-red-700' :
                                    (f.severity || '').toLowerCase() === 'moderate' ? 'bg-amber-100 text-amber-700' :
                                    'bg-green-100 text-green-700'
                                  }`}>{f.severity || '—'}</span>
                                </td>
                                <td className="px-2 py-1.5 font-semibold text-neutral-700 dark:text-slate-300">
                                  {f.confidence != null ? `${Math.round(f.confidence * 100)}%` : '—'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
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
                          <Button size="xs" variant="secondary" onClick={handleDirectVerify} disabled={isSaving}>
                            <CheckCircle className="w-3.5 h-3.5 text-success-600 mr-1" />
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
                      <div className="p-4 bg-white dark:bg-slate-900 border border-neutral-300 dark:border-slate-700 rounded text-sm text-neutral-600 dark:text-slate-400 text-center">
                        <ImageIcon className="w-8 h-8 text-neutral-400 mx-auto mb-2" />
                        Detailed clinical findings are hidden in Document Workspace to reduce clutter. 
                        <br/><br/>
                        <span className="font-semibold text-primary-600">Please view full imaging details in the Patient Management → Imaging Tab.</span>
                      </div>
                    ) : isEditing ? (
                      <div className="flex flex-col gap-2">
                        <textarea
                          value={editedText}
                          onChange={e => setEditedText(e.target.value)}
                          className="w-full min-h-[200px] p-3 text-sm text-neutral-800 dark:text-slate-200 bg-white dark:bg-slate-900 border border-primary-300 dark:border-primary-700 rounded-md focus:ring-2 focus:ring-primary-500 focus:outline-none"
                        />
                        <div className="flex justify-end gap-2">
                          <Button variant="secondary" size="sm" onClick={() => { setIsEditing(false); setEditedText(docAiResult.extractedText || docAiResult.reportSummary || ''); }}>Cancel</Button>
                          <Button size="sm" onClick={handleSaveEdit} disabled={isSaving}>
                            {isSaving ? 'Saving...' : 'Verify & Save'}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <pre className="text-sm font-sans whitespace-pre-wrap text-neutral-800 dark:text-slate-300 bg-white dark:bg-slate-900 p-3 rounded border border-neutral-300 dark:border-slate-700 min-h-[100px] max-h-[240px] overflow-y-auto">
                        {docAiResult.clinicalFindings?.length > 0
                          ? (docAiResult.reportSummary || 'No recommendation provided.')
                          : (docAiResult.extractedText || docAiResult.reportSummary || 'No text or findings extracted.')}
                      </pre>
                    )}
                  </div>

                  {/* ── Limitations ───────────────────────────────── */}
                  {docAiResult.imageMetadata?.limitations?.length > 0 && (
                    <div className="text-xs text-neutral-500 dark:text-slate-500 bg-neutral-50 dark:bg-slate-800/50 rounded p-2">
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
                    <p className="text-xs text-primary-500 mt-2">Analysis is currently in progress...</p>
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