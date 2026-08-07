import React, { useState, useRef } from "react";
import { Loader2, Upload, Brain, CheckCircle2, AlertCircle, FileText, X, ChevronDown, Clock, AlertTriangle } from "lucide-react";
import axiosInstance from "../../../config/axios";
import { SPECIALTY_TAGS } from "../constants";
import { useConfirm } from "../../../contexts/ConfirmContext";
import Button from "../../../components/ui/Button";

export default function GuidelineUploadPanel({ onUploadSuccess, existingProtocols = [] }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [stagedFile, setStagedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadPhase, setUploadPhase] = useState("idle"); // 'idle' | 'uploading' | 'ingesting' | 'done' | 'failed'
  const [uploadProgress, setUploadProgress] = useState([]);
  const [uploadDone, setUploadDone] = useState(false);
  const [title, setTitle] = useState("");
  const [specialty, setSpecialty] = useState("General Medicine");
  const [mrnInput, setMrnInput] = useState("HOSPITAL_WIDE");
  const [expiryDate, setExpiryDate] = useState("");
  const [showLogDetails, setShowLogDetails] = useState(false);
  const fileInputRef = useRef(null);
  const eventSourceRef = useRef(null);
  const confirm = useConfirm();

  const resetUpload = () => {
    setStagedFile(null);
    setUploading(false);
    setUploadDone(false);
    setUploadPhase("idle");
    setUploadProgress([]);
    setTitle("");
    setSpecialty("General Medicine");
    setMrnInput("HOSPITAL_WIDE");
    setExpiryDate("");
  };

  const handleStageFile = (file) => {
    if (!file) return;
    setStagedFile(file);
    setTitle(file.name.replace(/\.[^/.]+$/, ""));
  };

  const doUpload = async () => {
    if (!stagedFile) return;
    const file = stagedFile;

    const duplicate = existingProtocols.find((p) => !p.isRetired && p.fileName === file.name);
    if (duplicate) {
      const proceed = await confirm(
        `A protocol named "${duplicate.title}" already exists and appears active. Upload as a new, unrelated document anyway? If this is a revision of the existing protocol, cancel and use "Supersede" on it instead.`
      );
      if (!proceed) return;
    }

    setUploading(true);
    setUploadPhase("uploading");
    setUploadDone(false);
    setUploadProgress(["Initiating secure transport..."]);

    const jobId = `job-${Date.now()}`;

    // Open SSE stream for live progress
    const sseUrl = `/api/documents/progress/${jobId}`;
    const fullUrl = `${axiosInstance.defaults.baseURL || ""}${sseUrl}`;
    const es = new EventSource(fullUrl);
    eventSourceRef.current = es;
    es.onmessage = (e) => {
      setUploadProgress((prev) => [...prev, e.data]);
      if (e.data.toLowerCase().includes("ingest") || e.data.toLowerCase().includes("vector")) {
        setUploadPhase("ingesting");
      }
      if (
        e.data.toLowerCase().includes("complete") ||
        e.data.toLowerCase().includes("error")
      ) {
        es.close();
      }
    };
    es.onerror = () => es.close();

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("documentType", "GUIDELINE");
      formData.append("mrn", "HOSPITAL_WIDE");
      formData.append("specialty", specialty);
      if (expiryDate) formData.append("expiryDate", expiryDate);

      setUploadPhase("ingesting");
      await axiosInstance.post(`/api/documents?jobId=${jobId}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setUploadPhase("done");
      setUploadDone(true);
      setUploadProgress((prev) => [
        ...prev,
        "Guideline successfully vectorized & ingested into AI Knowledge Base.",
      ]);
      setTimeout(() => {
        onUploadSuccess();
      }, 1500);
    } catch (err) {
      setUploadPhase("failed");
      setUploadProgress((prev) => [
        ...prev,
        `Upload failed: ${err.response?.data?.error || err.message}`,
      ]);
    } finally {
      setUploading(false);
      if (eventSourceRef.current) eventSourceRef.current.close();
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleStageFile(file);
  };

  const uploadDoneStage = uploadPhase === "done";
  const uploadFailedStage = uploadPhase === "failed";
  const isIngestingStage = uploadPhase === "ingesting";

  return (
    <div className="space-y-4">
      {/* 1. Staging Drop Zone (when no file staged & not uploading) */}
      {!stagedFile && !uploading && !uploadDone && (
        <div
          className={`border-2 border-dashed rounded-8 p-6 text-center transition-all cursor-pointer ${
            isDragOver
              ? "border-primary-400 bg-primary-50 dark:bg-primary-900/20"
              : "border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/40 hover:border-primary-300 hover:bg-primary-50/40"
          }`}
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf,.docx,.doc,.txt"
            onChange={(e) => { if (e.target.files[0]) handleStageFile(e.target.files[0]); e.target.value = ""; }}
          />
          <div className="flex flex-col items-center gap-3">
            <Upload className="w-6 h-6 text-primary-500" />
            <div>
              <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                Drop PDF or DOCX here to stage protocol
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                Clinical protocols, treatment guidelines, hospital policies
              </p>
            </div>
            <span className="text-xs text-primary-600 dark:text-primary-400 font-semibold border border-primary-200 dark:border-primary-800 px-3 py-1 rounded-full">
              Browse Files
            </span>
          </div>
        </div>
      )}

      {/* 2. Staged Confirmation & Metadata Review Card (Wait for Confirmation) */}
      {stagedFile && !uploading && !uploadDone && (
        <div className="border border-neutral-300 dark:border-slate-700 rounded-8 bg-white dark:bg-slate-900 p-4 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-200 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-primary-500 shrink-0" />
              <div>
                <p className="text-sm font-bold text-neutral-900 dark:text-white">{stagedFile.name}</p>
                <p className="text-xs text-neutral-500 dark:text-slate-400">{(stagedFile.size / 1024).toFixed(1)} KB · Ready to configure</p>
              </div>
            </div>
            <button onClick={resetUpload} className="p-1 rounded-6 text-neutral-400 hover:text-neutral-700 dark:hover:text-slate-200">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                Guideline Title
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., ADA Diabetes Protocol 2024"
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-neutral-300 dark:border-slate-700 rounded-6 focus:outline-none focus:border-primary-500 text-neutral-900 dark:text-neutral-200"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                Medical Specialty
              </label>
              <select
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-neutral-300 dark:border-slate-700 rounded-6 focus:outline-none focus:border-primary-500 text-neutral-900 dark:text-neutral-200"
              >
                {SPECIALTY_TAGS.filter((s) => s !== "All").map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                Expiry Date <span className="text-neutral-400">(optional)</span>
              </label>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-neutral-300 dark:border-slate-700 rounded-6 focus:outline-none focus:border-primary-500 text-neutral-900 dark:text-neutral-200"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={resetUpload}>Cancel</Button>
            <Button variant="primary" icon={Upload} onClick={doUpload}>
              Confirm & Ingest Protocol
            </Button>
          </div>
        </div>
      )}

      {/* 3. Document Workspace Style 2-Stage Progress UI */}
      {(uploading || uploadDone || uploadFailedStage) && (
        <div className={`rounded-8 border p-4 space-y-3 ${
          uploadFailedStage
            ? "border-danger-300 dark:border-danger-700 bg-danger-50 dark:bg-danger-900/10"
            : uploadDoneStage
            ? "border-success-300 dark:border-success-700 bg-success-50 dark:bg-success-900/10"
            : "border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-900"
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {uploadFailedStage ? (
                <AlertCircle className="w-5 h-5 text-danger-500 shrink-0" />
              ) : uploadDoneStage ? (
                <CheckCircle2 className="w-5 h-5 text-success-500 shrink-0" />
              ) : (
                <Loader2 className="w-5 h-5 text-primary-500 animate-spin shrink-0" />
              )}
              <div>
                <p className="text-sm font-semibold text-neutral-900 dark:text-white">
                  {stagedFile?.name || title}
                </p>
                <p className="text-xs text-neutral-500 dark:text-slate-400 mt-0.5">
                  {uploadFailedStage ? "Ingestion Failed" : uploadDoneStage ? "Ingested into AI Knowledge Base" : isIngestingStage ? "Vectorizing & Ingesting into RAG..." : "Transporting file..."}
                </p>
              </div>
            </div>

            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
              uploadFailedStage
                ? "bg-danger-100 text-danger-700 dark:bg-danger-900/30 dark:text-danger-400"
                : uploadDoneStage
                ? "bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400"
                : "bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400"
            }`}>
              {uploadFailedStage ? "Failed" : uploadDoneStage ? "Done" : isIngestingStage ? "AI Ingestion..." : "Uploading..."}
            </span>
          </div>

          {/* 2-stage Progress bar */}
          {!uploadFailedStage && (
            <div className="flex items-center gap-2 pt-1">
              <div className="flex items-center gap-1.5">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-white ${uploadPhase !== "uploading" ? "bg-success-500" : "bg-primary-500"}`}>
                  {uploadPhase !== "uploading" ? <CheckCircle2 className="w-3 h-3" /> : <Loader2 className="w-3 h-3 animate-spin" />}
                </div>
                <span className="text-xs font-medium text-neutral-700 dark:text-slate-300">File Transport</span>
              </div>

              <div className={`flex-1 h-1 rounded-full ${uploadPhase !== "uploading" ? "bg-success-500" : "bg-neutral-200 dark:bg-slate-700"}`} />

              <div className="flex items-center gap-1.5">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-white ${uploadDoneStage ? "bg-success-500" : isIngestingStage ? "bg-primary-500" : "bg-neutral-300 dark:bg-slate-700 text-neutral-500"}`}>
                  {uploadDoneStage ? <CheckCircle2 className="w-3 h-3" /> : isIngestingStage ? <Loader2 className="w-3 h-3 animate-spin" /> : <Clock className="w-3 h-3" />}
                </div>
                <span className="text-xs font-medium text-neutral-700 dark:text-slate-300">AI Knowledge Ingestion</span>
              </div>
            </div>
          )}

          {/* Expandable Technical Log */}
          {uploadProgress.length > 0 && (
            <div className="pt-2 border-t border-neutral-200 dark:border-slate-800">
              <button
                onClick={() => setShowLogDetails((prev) => !prev)}
                className="flex items-center gap-1 text-[11px] font-semibold text-neutral-500 hover:text-neutral-800 dark:text-slate-400 dark:hover:text-slate-200"
              >
                <span>{showLogDetails ? "Hide technical logs" : "View technical logs"}</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${showLogDetails ? "rotate-180" : ""}`} />
              </button>

              {showLogDetails && (
                <div className="bg-neutral-900 rounded-6 p-3 space-y-1 max-h-32 overflow-y-auto mt-2">
                  {uploadProgress.map((msg, i) => (
                    <p key={i} className="text-[11px] font-mono text-neutral-300 flex items-start gap-2">
                      <span className="text-neutral-500 shrink-0">[{String(i + 1).padStart(2, "0")}]</span>
                      {msg}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* RAG Info Banner */}
      <div className="flex items-start gap-2 p-3 bg-primary-50 dark:bg-primary-900/10 border border-primary-200 dark:border-primary-800 rounded-6">
        <Brain className="w-4 h-4 text-primary-500 shrink-0 mt-0.5" />
        <p className="text-xs text-primary-800 dark:text-primary-300">
          <span className="font-semibold">AI Knowledge Base:</span> Uploaded guidelines are automatically chunked, embedded, and stored in the clinical vector database — making them available for RAG-powered diagnosis and pathway recommendations.
        </p>
      </div>
    </div>
  );
}
