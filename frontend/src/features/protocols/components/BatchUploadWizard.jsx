import React, { useState } from "react";
import Modal from "../../../components/ui/Modal/Modal";
import { clinicalService } from "../../../services/api/clinicalService";
import { SPECIALTY_TAGS } from "../constants";
import { Upload, FileText, X, Trash2, ChevronRight, ChevronLeft, Loader2, CheckCircle, AlertCircle } from "lucide-react";

let localIdCounter = 0;
function nextLocalId() {
  localIdCounter += 1;
  return `batch-item-${localIdCounter}`;
}

export default function BatchUploadWizard({ isOpen, onClose, existingProtocols = [], onComplete }) {
  const [step, setStep] = useState(1);
  const [items, setItems] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [results, setResults] = useState({}); // localId -> { status: 'pending'|'uploading'|'success'|'error', message }

  const activeProtocols = existingProtocols.filter((p) => !p.isRetired);

  const reset = () => {
    setStep(1);
    setItems([]);
    setResults({});
    setIsUploading(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const addFiles = (fileList) => {
    const newItems = Array.from(fileList).map((file) => ({
      localId: nextLocalId(),
      file,
      title: file.name.replace(/\.[^/.]+$/, ""),
      specialty: "General Medicine",
      expiryDate: "",
      supersedesId: "",
    }));
    setItems((prev) => [...prev, ...newItems]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  };

  const updateItem = (localId, patch) => {
    setItems((prev) => prev.map((it) => (it.localId === localId ? { ...it, ...patch } : it)));
  };

  const removeItem = (localId) => {
    setItems((prev) => prev.filter((it) => it.localId !== localId));
  };

  const supersedeCount = items.filter((it) => it.supersedesId).length;

  const runUpload = async () => {
    setIsUploading(true);
    const nextResults = {};
    items.forEach((it) => { nextResults[it.localId] = { status: "pending" }; });
    setResults(nextResults);

    for (const it of items) {
      setResults((prev) => ({ ...prev, [it.localId]: { status: "uploading" } }));
      try {
        if (it.supersedesId) {
          await clinicalService.supersedeDocument(it.supersedesId, it.file, it.expiryDate || undefined);
        } else {
          await clinicalService.uploadDocument(it.file, "GUIDELINE", "HOSPITAL_WIDE", it.specialty, it.expiryDate || undefined);
        }
        setResults((prev) => ({ ...prev, [it.localId]: { status: "success" } }));
      } catch (err) {
        console.error(`Failed to upload ${it.file.name}:`, err);
        setResults((prev) => ({ ...prev, [it.localId]: { status: "error", message: err?.response?.data?.error || err.message } }));
      }
    }

    setIsUploading(false);
    setStep(4);
  };

  const handleFinish = async () => {
    if (onComplete) await onComplete();
    handleClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Batch Upload Guidelines" size="lg">
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-6 text-xs font-semibold">
        {["Select Files", "Configure", "Review", "Done"].map((label, i) => (
          <React.Fragment key={label}>
            <span className={`px-2.5 py-1 rounded-full ${
              step === i + 1
                ? "bg-primary-500 text-white"
                : step > i + 1
                  ? "bg-success-50 text-success-600 dark:bg-success-900/20 dark:text-success-500"
                  : "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400"
            }`}>
              {i + 1}. {label}
            </span>
            {i < 3 && <ChevronRight className="w-3 h-3 text-neutral-300 dark:text-neutral-600" />}
          </React.Fragment>
        ))}
      </div>

      {/* Step 1: drop zone */}
      {step === 1 && (
        <div>
          <div
            className="border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-8 p-10 text-center cursor-pointer hover:border-primary-400 hover:bg-primary-50/30 dark:hover:bg-primary-900/10 transition-colors"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => document.getElementById("batch-file-input").click()}
          >
            <input
              id="batch-file-input"
              type="file"
              multiple
              accept=".pdf,.docx,.doc,.txt"
              className="hidden"
              onChange={(e) => { if (e.target.files?.length) addFiles(e.target.files); e.target.value = ""; }}
            />
            <Upload className="w-10 h-10 text-primary-500 mx-auto mb-3" />
            <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">Drop multiple guidelines here, or click to browse</p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">PDF, DOCX, DOC, or TXT — select as many as you need</p>
          </div>

          {items.length > 0 && (
            <div className="mt-4 space-y-1.5">
              {items.map((it) => (
                <div key={it.localId} className="flex items-center justify-between px-3 py-2 bg-neutral-50 dark:bg-neutral-800/50 rounded-6 text-xs">
                  <span className="flex items-center gap-2 text-neutral-700 dark:text-neutral-300"><FileText className="w-3.5 h-3.5" /> {it.file.name}</span>
                  <button onClick={() => removeItem(it.localId)} className="text-neutral-400 hover:text-danger-500"><X className="w-3.5 h-3.5" /></button>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end mt-6">
            <button
              onClick={() => setStep(2)}
              disabled={items.length === 0}
              className="flex items-center gap-1.5 px-4 py-2 bg-primary-500 text-white text-sm font-semibold rounded-6 hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next: Configure ({items.length}) <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: per-file metadata */}
      {step === 2 && (
        <div>
          <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
            {items.map((it) => (
              <div key={it.localId} className="border border-neutral-200 dark:border-neutral-700 rounded-8 p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="flex items-center gap-2 text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                    <FileText className="w-4 h-4 text-primary-500" /> {it.file.name}
                  </span>
                  <button onClick={() => removeItem(it.localId)} className="text-neutral-400 hover:text-danger-500">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">Title</label>
                    <input
                      value={it.title}
                      onChange={(e) => updateItem(it.localId, { title: e.target.value })}
                      className="w-full px-2.5 py-1.5 text-sm bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-6 focus:outline-none focus:border-primary-500 text-neutral-900 dark:text-neutral-200"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">Specialty</label>
                    <select
                      value={it.specialty}
                      onChange={(e) => updateItem(it.localId, { specialty: e.target.value })}
                      disabled={!!it.supersedesId}
                      className="w-full px-2.5 py-1.5 text-sm bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-6 focus:outline-none focus:border-primary-500 disabled:bg-neutral-100 dark:disabled:bg-neutral-900 text-neutral-900 dark:text-neutral-200"
                    >
                      {SPECIALTY_TAGS.filter((s) => s !== "All").map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">Expiry Date <span className="text-neutral-400">(optional)</span></label>
                    <input
                      type="date"
                      value={it.expiryDate}
                      onChange={(e) => updateItem(it.localId, { expiryDate: e.target.value })}
                      className="w-full px-2.5 py-1.5 text-sm bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-6 focus:outline-none focus:border-primary-500 text-neutral-900 dark:text-neutral-200"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">Supersedes <span className="text-neutral-400">(optional — retires the selected protocol)</span></label>
                    <select
                      value={it.supersedesId}
                      onChange={(e) => updateItem(it.localId, { supersedesId: e.target.value })}
                      className="w-full px-2.5 py-1.5 text-sm bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-6 focus:outline-none focus:border-primary-500 text-neutral-900 dark:text-neutral-200"
                    >
                      <option value="">— New protocol —</option>
                      {activeProtocols.map((p) => (
                        <option key={p.id} value={p.id}>{p.title} (v{p.version || 1})</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-between mt-6">
            <button onClick={() => setStep(1)} className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-6 transition-colors">
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
            <button
              onClick={() => setStep(3)}
              className="flex items-center gap-1.5 px-4 py-2 bg-primary-500 text-white text-sm font-semibold rounded-6 hover:bg-primary-600 transition-colors"
            >
              Next: Review <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: review & confirm */}
      {step === 3 && (
        <div>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
            <span className="font-semibold text-neutral-900 dark:text-neutral-100">{items.length - supersedeCount} new upload(s)</span>
            {supersedeCount > 0 && <> and <span className="font-semibold text-neutral-900 dark:text-neutral-100">{supersedeCount} supersede operation(s)</span></>} will run, one at a time.
          </p>
          <div className="space-y-1.5 max-h-[45vh] overflow-y-auto">
            {items.map((it) => {
              const supersedeTarget = activeProtocols.find((p) => p.id === it.supersedesId);
              return (
                <div key={it.localId} className="flex items-center justify-between px-3 py-2 bg-neutral-50 dark:bg-neutral-800/50 rounded-6 text-xs">
                  <span className="flex items-center gap-2 text-neutral-700 dark:text-neutral-300">
                    <FileText className="w-3.5 h-3.5" /> {it.title}
                    {it.expiryDate && <span className="text-neutral-400">· expires {it.expiryDate}</span>}
                  </span>
                  <span className={supersedeTarget ? "text-primary-600 dark:text-primary-400 font-semibold" : "text-neutral-500 dark:text-neutral-400"}>
                    {supersedeTarget ? `Supersedes "${supersedeTarget.title}"` : it.specialty}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex justify-between mt-6">
            <button onClick={() => setStep(2)} disabled={isUploading} className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-6 transition-colors disabled:opacity-50">
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
            <button
              onClick={runUpload}
              disabled={isUploading}
              className="flex items-center gap-1.5 px-4 py-2 bg-primary-500 text-white text-sm font-semibold rounded-6 hover:bg-primary-600 disabled:opacity-50 transition-colors"
            >
              {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {isUploading ? "Uploading..." : `Confirm & Upload (${items.length})`}
            </button>
          </div>
        </div>
      )}

      {/* Step 4: results */}
      {step === 4 && (
        <div>
          <div className="space-y-1.5 max-h-[50vh] overflow-y-auto">
            {items.map((it) => {
              const r = results[it.localId] || { status: "pending" };
              return (
                <div key={it.localId} className="flex items-center justify-between px-3 py-2 bg-neutral-50 dark:bg-neutral-800/50 rounded-6 text-xs">
                  <span className="flex items-center gap-2 text-neutral-700 dark:text-neutral-300"><FileText className="w-3.5 h-3.5" /> {it.title}</span>
                  {r.status === "success" && <span className="flex items-center gap-1 text-success-600 dark:text-success-500 font-semibold"><CheckCircle className="w-3.5 h-3.5" /> Uploaded</span>}
                  {r.status === "error" && <span className="flex items-center gap-1 text-danger-600 dark:text-danger-500 font-semibold" title={r.message}><AlertCircle className="w-3.5 h-3.5" /> Failed</span>}
                  {(r.status === "pending" || r.status === "uploading") && <span className="flex items-center gap-1 text-neutral-400"><Loader2 className="w-3.5 h-3.5 animate-spin" /> {r.status}</span>}
                </div>
              );
            })}
          </div>
          <div className="flex justify-end mt-6">
            <button onClick={handleFinish} className="px-4 py-2 bg-primary-500 text-white text-sm font-semibold rounded-6 hover:bg-primary-600 transition-colors">
              Done
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
