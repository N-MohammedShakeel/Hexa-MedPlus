import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Upload, AlertCircle, Loader2, CheckCircle2, AlertTriangle, ChevronDown, Clock } from 'lucide-react';
import { Button, Input } from '../../../components/ui';
import Card from '../../../components/ui/Card';
import axiosInstance from '../../../config/axios';
import { notifyError } from '../../../common/utils/toast';
import { resetBatches, startBatch, updateBatchById, appendBatchLog, pollTimers } from '../../../store/slices/uploadSlice';
import { notificationActions } from '../../../store/slices/notificationSlice';

// What the async AI pipeline actually does per flow type — shown as descriptive text
// only, never as fake sub-steps we can't actually observe progress for.
const ANALYSIS_DESCRIPTIONS = {
  IMAGING: 'Running blur detection & Vision AI analysis...',
  LAB_REPORT_IMAGE: 'Running blur detection, Vision AI OCR & structuring lab data...',
  LAB_REPORT_DOC: 'Structuring lab data with AI...',
  CLINICAL_NOTE: 'Summarizing & structuring with AI...',
};

// Terminal document statuses the AI pipeline can settle on. Anything else
// (PROCESSING / REQUIRES_VERIFICATION) means the pipeline is still running.
const TERMINAL_STATUSES = new Set(['COMPLETED', 'BLUR_DETECTED', 'FAILED']);
// Give up polling after this many attempts so a stuck/unreachable AI service
// can't leave an interval running forever.
const MAX_POLL_ATTEMPTS = 150; // ~150 * 4s = 10 minutes

function getFlowType(category, fileName) {
  const isImage = /\.(png|jpg|jpeg|gif|webp|tiff?|dcm|dicom)$/i.test(fileName || '');
  if (category === 'Imaging') return 'IMAGING';
  if (category === 'Lab Reports') return isImage ? 'LAB_REPORT_IMAGE' : 'LAB_REPORT_DOC';
  return 'CLINICAL_NOTE';
}

function BatchUploadProgress({ batches }) {
  const [expanded, setExpanded] = useState(null);
  if (!batches.length) return null;

  return (
    <Card>
      <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-slate-300 mb-3">
        Upload Progress
      </h3>
      <div className="space-y-3">
        {batches.map((batch) => {
          const isExpanded = expanded === batch.id;
          const phase = batch.phase; // 'upload' | 'queued' | 'analyze' | 'done' | 'blur' | 'failed' | 'timeout'
          const uploadDone = phase !== 'upload';
          const analyzeDone = phase === 'done' || phase === 'blur' || phase === 'failed' || phase === 'timeout';
          const isFailed = phase === 'failed';
          const isBlur = phase === 'blur';
          const isDone = phase === 'done';
          // The AI service processes one Kafka message at a time — a file only becomes
          // 'analyze' once the worker actually picks it up. Until then it's genuinely
          // waiting behind other uploads, not being analyzed.
          const isQueued = phase === 'queued';

          const statusLabel = isFailed ? 'Failed'
            : isBlur ? 'Action Required'
            : isDone ? 'Done'
            : phase === 'timeout' ? 'Still processing'
            : phase === 'analyze' ? 'Analyzing...'
            : isQueued ? 'Queued'
            : 'Uploading...';

          const cardTone = isFailed
            ? 'border-danger-300 dark:border-danger-700 bg-danger-50 dark:bg-danger-900/10'
            : isBlur
            ? 'border-warning-300 dark:border-warning-700 bg-warning-50 dark:bg-warning-900/10'
            : isDone
            ? 'border-success-300 dark:border-success-700 bg-success-50 dark:bg-success-900/10'
            : 'border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-900';

          return (
            <div key={batch.id} className={`rounded-8 border ${cardTone} overflow-hidden`}>
              {/* Header row */}
              <button
                className="w-full flex items-center gap-3 px-4 py-3 text-left"
                onClick={() => setExpanded(isExpanded ? null : batch.id)}
              >
                {isFailed ? (
                  <AlertCircle className="w-4 h-4 text-danger-500 shrink-0" />
                ) : isBlur ? (
                  <AlertTriangle className="w-4 h-4 text-warning-500 shrink-0" />
                ) : isDone ? (
                  <CheckCircle2 className="w-4 h-4 text-success-500 shrink-0" />
                ) : isQueued ? (
                  <Clock className="w-4 h-4 text-neutral-400 shrink-0" />
                ) : (
                  <Loader2 className="w-4 h-4 text-primary-500 animate-spin shrink-0" />
                )}
                <span className="text-sm font-medium text-neutral-900 dark:text-slate-200 flex-1 truncate">{batch.fileName}</span>
                <span className={`text-xs font-semibold shrink-0 ${isFailed ? 'text-danger-600 dark:text-danger-400' : isBlur ? 'text-warning-600 dark:text-warning-400' : isDone ? 'text-success-600 dark:text-success-400' : 'text-neutral-500 dark:text-slate-400'}`}>
                  {statusLabel}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-neutral-400 shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
              </button>

              {/* 2-stage progress: Upload -> AI Analysis. Only phases we can actually observe. */}
              {!isFailed && (
                <div className="px-4 pb-3 flex items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center ${uploadDone ? 'bg-success-500 text-white' : 'bg-primary-500 text-white'}`}>
                      {uploadDone ? <CheckCircle2 className="w-3 h-3" /> : <Loader2 className="w-3 h-3 animate-spin" />}
                    </div>
                    <span className="text-[11px] font-medium text-neutral-600 dark:text-slate-400">Upload</span>
                  </div>
                  <div className={`flex-1 h-0.5 ${uploadDone ? 'bg-success-400' : 'bg-neutral-200 dark:bg-slate-700'}`} />
                  <div className="flex items-center gap-1.5">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                      isBlur ? 'bg-warning-500 text-white' : analyzeDone ? 'bg-success-500 text-white' : (uploadDone && !isQueued) ? 'bg-primary-500 text-white' : 'bg-neutral-200 dark:bg-slate-700 text-neutral-400'
                    }`}>
                      {isBlur ? <AlertTriangle className="w-3 h-3" /> : analyzeDone ? <CheckCircle2 className="w-3 h-3" /> : isQueued ? <Clock className="w-3 h-3" /> : uploadDone ? <Loader2 className="w-3 h-3 animate-spin" /> : <span className="w-1 h-1 rounded-full bg-current" />}
                    </div>
                    <span className="text-[11px] font-medium text-neutral-600 dark:text-slate-400">{isQueued ? 'Queued' : 'AI Analysis'}</span>
                  </div>
                </div>
              )}

              {/* Human-readable current status line */}
              {!isFailed && (phase === 'analyze' || isBlur || phase === 'timeout' || isQueued) && (
                <p className={`px-4 pb-3 text-xs -mt-1 ${isBlur ? 'text-warning-600 dark:text-warning-500 font-medium' : 'text-neutral-500 dark:text-slate-400'}`}>
                  {isBlur
                    ? 'Blurry regions detected — click this document in the list below to describe them before AI structuring continues.'
                    : phase === 'timeout'
                    ? 'AI analysis is taking longer than expected — check the document list for updates.'
                    : isQueued
                    ? 'Waiting for the AI worker to finish other documents — analysis starts automatically once it reaches this file.'
                    : (ANALYSIS_DESCRIPTIONS[batch.flowType] || 'AI is analyzing this document...')}
                </p>
              )}

              {/* SSE detail log (expanded) */}
              {isExpanded && batch.log.length > 0 && (
                <div className="mx-4 mb-3 bg-slate-900 rounded-4 p-3 font-mono text-[11px] max-h-28 overflow-y-auto space-y-1">
                  {batch.log.map((line, i) => (
                    <div key={i} className={`leading-relaxed ${line.includes('⚠') ? 'text-warning-400' : line.includes('✗') || line.toLowerCase().includes('error') ? 'text-danger-400' : line.toLowerCase().includes('complete') ? 'text-success-400' : 'text-slate-300'}`}>
                      {line}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

export default function DocumentUploadZone({ allPatients, refreshDocuments }) {
  const dispatch = useDispatch();
  const batches = useSelector(state => state.upload.batches);
  const fileInputRef = React.useRef(null);
  const [stagedFiles, setStagedFiles] = useState([]);
  const [patientSearchTerm, setPatientSearchTerm] = useState('');
  const [mrnInput, setMrnInput] = useState('');
  const [customDocName, setCustomDocName] = useState('');
  const [uploadCategory, setUploadCategory] = useState('Clinical Notes');
  const [uploading, setUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  // NOTE: batch state and poll timers deliberately do NOT live in component
  // state/refs — they're in Redux + the module-level `pollTimers` registry
  // (uploadSlice.js) so navigating away from this page and back doesn't lose
  // progress or kill the in-flight status polling.

  // Guideline/protocol documents are uploaded exclusively through the Clinical
  // Protocols page (which collects specialty/expiry metadata this form doesn't) —
  // this workspace only ever handles patient-linked documents.
  const typeMap = {
    'Clinical Notes': 'CLINICAL_NOTE',
    'Lab Reports': 'LAB_REPORT',
    'Imaging': 'IMAGING',
    'Other Documents': 'OTHER',
  };

  const categoryOptions = ['Clinical Notes', 'Lab Reports', 'Imaging', 'Other Documents'];

  const handleDragOver = (e) => { e.preventDefault(); setIsDragOver(true); };
  const handleDragLeave = (e) => { e.preventDefault(); setIsDragOver(false); };
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files?.length) setStagedFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)]);
  };
  const handleFileSelect = (e) => {
    const selected = Array.from(e.target.files || []);
    if (selected.length) {
      setStagedFiles(prev => [...prev, ...selected]);
    }
    // Reset so the same file can be selected again
    e.target.value = '';
  };
  const removeStaged = (idx) => setStagedFiles(prev => prev.filter((_, i) => i !== idx));

  const stopPolling = (id) => {
    const timer = pollTimers[id];
    if (timer) {
      clearInterval(timer);
      delete pollTimers[id];
    }
  };

  // Once the Java-side upload finishes, the file is only queued — blur detection,
  // Vision AI and LLaMA structuring still have to run asynchronously in the AI
  // service. Poll the real document status instead of pretending we're done.
  // The interval itself lives in the module-level `pollTimers` registry (not a
  // component ref), so it keeps running even if this component unmounts.
  const startPollingStatus = (id, fileKey, fileName) => {
    let attempts = 0;
    const timer = setInterval(async () => {
      attempts += 1;
      try {
        const { data } = await axiosInstance.get(`/api/documents/by-file-key/${encodeURIComponent(fileKey)}`);
        const status = data?.status;
        if (TERMINAL_STATUSES.has(status)) {
          stopPolling(id);
          dispatch(updateBatchById({
            id,
            patch: { phase: status === 'COMPLETED' ? 'done' : status === 'BLUR_DETECTED' ? 'blur' : 'failed' },
          }));
          dispatch(notificationActions.addNotification(
            status === 'COMPLETED'
              ? { title: "Document Analysis Complete", message: `${fileName} finished AI analysis and is ready to verify.`, type: "success" }
              : status === 'BLUR_DETECTED'
              ? { title: "Document Needs Your Input", message: `${fileName} has blurry regions — click it in the list to describe them.`, type: "info" }
              : { title: "Document Analysis Failed", message: `${fileName} failed AI processing.`, type: "error" }
          ));
          refreshDocuments();
          return;
        }
        // Not terminal yet: the AI service's single Kafka consumer only flips status to
        // AI_PROCESSING once it actually picks this file up — until then it's still
        // sitting behind other uploads (PROCESSING/REQUIRES_VERIFICATION), not being analyzed.
        dispatch(updateBatchById({ id, patch: { phase: status === 'AI_PROCESSING' ? 'analyze' : 'queued' } }));
      } catch (err) {
        // Transient fetch errors during polling shouldn't kill the whole batch —
        // just try again on the next tick.
        console.error('Status poll failed:', err);
      }
      if (attempts >= MAX_POLL_ATTEMPTS) {
        stopPolling(id);
        dispatch(updateBatchById({ id, patch: { phase: 'timeout' } }));
        refreshDocuments();
      }
    }, 4000);
    pollTimers[id] = timer;
  };

  const doUpload = async () => {
    if (!stagedFiles.length) return;
    if (!mrnInput) { notifyError('Please select a Target Patient MRN before uploading.'); return; }
    if (uploadCategory === 'Other Documents' && !customDocName.trim()) {
      notifyError('Please enter a Document Name for Other Documents before uploading.');
      return;
    }
    setUploading(true);
    Object.keys(pollTimers).forEach(id => { clearInterval(pollTimers[id]); delete pollTimers[id]; });
    dispatch(resetBatches());

    const resolvedType = typeMap[uploadCategory] || 'OTHER';

    // Process each file independently with its own SSE stream and its own status poll —
    // multiple files upload and get analyzed fully in parallel, never sharing state.
    const uploadPromises = stagedFiles.map(async (file, fi) => {
      const flowType = getFlowType(uploadCategory, file.name);
      const jobId = `job-${Date.now()}-${fi}`;
      const id = jobId;

      dispatch(startBatch({ id, fileName: file.name, fileKey: null, flowType, phase: 'upload', log: [`▶ [${file.name}] Upload starting...`] }));

      const es = new EventSource(`/api/documents/progress/${jobId}`);
      es.onmessage = (e) => {
        dispatch(appendBatchLog({ id, line: `  ${e.data}` }));
        if (e.data.toLowerCase().includes('error') || e.data.toLowerCase().includes('failed')) {
          dispatch(updateBatchById({ id, patch: { phase: 'failed' } }));
          es.close();
        }
      };
      es.onerror = () => { es.close(); };

      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('documentType', resolvedType);
        formData.append('mrn', mrnInput);
        if (customDocName.trim()) formData.append('customDocName', customDocName.trim());
        const res = await axiosInstance.post(`/api/documents?jobId=${jobId}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        es.close();
        const fileKey = res?.data?.fileKey;
        if (fileKey) {
          dispatch(updateBatchById({ id, patch: { fileKey, phase: 'queued' } }));
          startPollingStatus(id, fileKey, file.name);
        } else {
          // Upload succeeded but we have no way to track further progress — don't
          // claim it's done when we genuinely don't know.
          dispatch(updateBatchById({ id, patch: { phase: 'timeout' } }));
        }
      } catch (err) {
        es.close();
        dispatch(appendBatchLog({ id, line: `✗ Upload error: ${err.response?.data?.error || err.message}` }));
        dispatch(updateBatchById({ id, patch: { phase: 'failed' } }));
      }
    });

    await Promise.allSettled(uploadPromises);
    setStagedFiles([]);
    setCustomDocName('');
    setUploading(false);
    refreshDocuments();
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-primary-600 dark:text-primary-400">Document Processing</h2>
          <p className="text-sm text-neutral-600 dark:text-slate-400 mt-1">Upload and process clinical documents with AI assistance</p>
        </div>
      </div>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
            <Upload className="w-4 h-4 text-primary-600 dark:text-primary-400" />
            Upload Documents
            {stagedFiles.length > 0 && (
              <span className="ml-1 px-2 py-0.5 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 rounded-full text-xs font-bold">
                {stagedFiles.length} file{stagedFiles.length > 1 ? 's' : ''} staged
              </span>
            )}
          </h3>
          {stagedFiles.length > 0 && (
            <Button size="sm" onClick={doUpload} disabled={uploading}>
              {uploading ? 'Processing...' : `Upload ${stagedFiles.length > 1 ? `${stagedFiles.length} Files` : 'File'}`}
            </Button>
          )}
        </div>

        <div className="space-y-4">
          {/* Drop zone */}
          <input
            ref={fileInputRef}
            type="file"
            id="docWorkspaceFileInput"
            className="hidden"
            accept=".pdf,.docx,.dicom,.dcm,.doc,.txt,.png,.jpg,.jpeg"
            multiple
            onChange={handleFileSelect}
          />
          <div
            className={`border-2 border-dashed rounded-8 p-6 text-center transition-colors cursor-pointer ${
              isDragOver
                ? 'border-primary-500 bg-primary-50 dark:bg-slate-800 dark:border-primary-400'
                : 'border-neutral-300 dark:border-slate-700 hover:border-primary-400 hover:bg-neutral-50 dark:hover:bg-slate-800'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="flex flex-col items-center gap-2">
              <Upload className="w-7 h-7 text-primary-500 dark:text-primary-400" />
              <p className="text-sm font-medium text-neutral-800 dark:text-slate-200">
                Drag &amp; drop files here, or <span className="text-primary-600 dark:text-primary-400 font-semibold underline">browse</span>
              </p>
              <p className="text-xs text-neutral-500 dark:text-slate-400">PDF, DOCX, PNG, JPG supported · Max 50MB · Multiple files allowed</p>
            </div>
          </div>

          {/* Staged files list */}
          {stagedFiles.length > 0 && (
            <div className="space-y-2">
              {stagedFiles.map((f, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-2.5 bg-primary-50 dark:bg-slate-800 border border-primary-200 dark:border-slate-700 rounded-8">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-neutral-900 dark:text-slate-100 truncate">{f.name}</p>
                    <p className="text-xs text-neutral-500 dark:text-slate-400">{(f.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                  <button onClick={() => removeStaged(i)} disabled={uploading} className="text-xs text-danger-500 hover:text-danger-600 font-medium shrink-0">Remove</button>
                </div>
              ))}
            </div>
          )}

          {/* Patient & Category selectors */}
          <div className="flex gap-4 pt-3 border-t border-neutral-200 dark:border-slate-700">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-neutral-700 dark:text-slate-300 mb-1.5">
                Target Patient <span className="text-danger-500">*</span>
              </label>
              <div className="relative">
                <Input
                  placeholder="Search patient by name or MRN..."
                  leftIcon={AlertCircle}
                  value={patientSearchTerm}
                  onChange={(e) => { setPatientSearchTerm(e.target.value); setMrnInput(''); }}
                  onClear={() => { setPatientSearchTerm(''); setMrnInput(''); }}
                  required
                />
                {patientSearchTerm && !mrnInput && (
                  <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-800 border border-neutral-300 dark:border-slate-700 rounded-6 shadow-lg max-h-48 overflow-y-auto">
                    {allPatients
                      .filter(p => p.name.toLowerCase().includes(patientSearchTerm.toLowerCase()) || p.mrn.toLowerCase().includes(patientSearchTerm.toLowerCase()))
                      .map(p => (
                        <button
                          key={p.id}
                          className="w-full text-left px-4 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-slate-700 text-neutral-900 dark:text-slate-200"
                          onClick={() => { setMrnInput(p.mrn); setPatientSearchTerm(`${p.name} (${p.mrn})`); }}
                        >
                          <span className="font-semibold">{p.name}</span> <span className="text-neutral-500 dark:text-slate-400">({p.mrn})</span>
                        </button>
                      ))}
                    {allPatients.filter(p => p.name.toLowerCase().includes(patientSearchTerm.toLowerCase()) || p.mrn.toLowerCase().includes(patientSearchTerm.toLowerCase())).length === 0 && (
                      <div className="px-4 py-2 text-sm text-neutral-500 dark:text-slate-400">No matching patients found.</div>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-semibold text-neutral-700 dark:text-slate-300 mb-1.5">Document Category</label>
              <select
                className="w-full py-2 px-3 bg-neutral-50 dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 rounded-6 text-sm text-neutral-900 dark:text-slate-200"
                value={uploadCategory}
                onChange={(e) => setUploadCategory(e.target.value)}
              >
                {categoryOptions.map(opt => <option key={opt}>{opt}</option>)}
              </select>
            </div>
            {uploadCategory === 'Other Documents' && (
              <div className="flex-1">
                <label className="block text-xs font-semibold text-neutral-700 dark:text-slate-300 mb-1.5">Document Name <span className="text-danger-500">*</span></label>
                <input
                  type="text"
                  placeholder="Enter a descriptive name..."
                  value={customDocName}
                  onChange={e => setCustomDocName(e.target.value)}
                  className="w-full py-2 px-3 bg-neutral-50 dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 rounded-6 text-sm text-neutral-900 dark:text-slate-200 focus:outline-none focus:border-primary-500"
                />
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Dynamic Batch Progress */}
      <BatchUploadProgress batches={batches} />
    </>
  );
}
