import React, { useState, useRef } from "react";
import { Loader2, Upload, Brain } from "lucide-react";
import axiosInstance from "../../../config/axios";
import { SPECIALTY_TAGS } from "../constants";

export default function GuidelineUploadPanel({ onUploadSuccess, existingProtocols = [] }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState([]);
  const [uploadDone, setUploadDone] = useState(false);
  const [title, setTitle] = useState("");
  const [specialty, setSpecialty] = useState("General Medicine");
  const [mrnInput, setMrnInput] = useState("");
  const fileInputRef = useRef(null);
  const eventSourceRef = useRef(null);

  const resetUpload = () => {
    setUploading(false);
    setUploadDone(false);
    setUploadProgress([]);
    setTitle("");
    setSpecialty("General Medicine");
    setMrnInput("");
  };

  const doUpload = async (file) => {
    if (!file) return;

    const duplicate = existingProtocols.find((p) => !p.isRetired && p.fileName === file.name);
    if (duplicate) {
      const proceed = window.confirm(
        `A protocol named "${duplicate.title}" already exists and appears active. Upload as a new, unrelated document anyway?\n\nIf this is a revision of the existing protocol, cancel and use "Supersede" on it instead.`
      );
      if (!proceed) return;
    }

    setUploading(true);
    setUploadDone(false);
    setUploadProgress(["Initiating secure upload..."]);

    const jobId = `job-${Date.now()}`;

    // Open SSE stream for live progress
    const sseUrl = `/api/documents/progress/${jobId}`;
    const fullUrl = `${axiosInstance.defaults.baseURL || ""}${sseUrl}`;
    const es = new EventSource(fullUrl);
    eventSourceRef.current = es;
    es.onmessage = (e) => {
      setUploadProgress((prev) => [...prev, e.data]);
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
      formData.append("mrn", mrnInput || "HOSPITAL_WIDE");
      formData.append("specialty", specialty);

      await axiosInstance.post(`/api/documents?jobId=${jobId}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setUploadDone(true);
      setUploadProgress((prev) => [
        ...prev,
        "✅ Guideline ingested into AI knowledge base!",
      ]);
      setTimeout(() => {
        onUploadSuccess();
      }, 1500);
    } catch (err) {
      setUploadProgress((prev) => [
        ...prev,
        `❌ Upload failed: ${err.response?.data?.error || err.message}`,
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
    if (file) doUpload(file);
  };

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${
          isDragOver
            ? "border-primary-400 bg-primary-50 dark:bg-primary-900/20 scale-[1.01]"
            : "border-neutral-300 dark:border-slate-700 bg-neutral-50 dark:bg-slate-800/40 hover:border-primary-300 hover:bg-primary-50/40"
        }`}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !uploading && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".pdf,.docx,.doc,.txt"
          onChange={(e) => { if (e.target.files[0]) doUpload(e.target.files[0]); e.target.value = ""; }}
        />
        <div className="flex flex-col items-center gap-3">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${isDragOver ? "bg-primary-100" : "bg-violet-100 dark:bg-violet-900/30"}`}>
            {uploading ? (
              <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
            ) : (
              <Upload className="w-6 h-6 text-violet-600" />
            )}
          </div>
          <div>
            <p className="text-sm font-semibold text-neutral-800 dark:text-slate-200">
              {uploading ? "Uploading guideline..." : "Drop PDF or DOCX here"}
            </p>
            <p className="text-xs text-neutral-500 dark:text-slate-400 mt-1">
              Clinical protocols, treatment guidelines, hospital policies
            </p>
          </div>
          {!uploading && (
            <span className="text-xs text-primary-600 dark:text-primary-400 font-semibold border border-primary-200 dark:border-primary-800 px-3 py-1 rounded-full">
              Browse Files
            </span>
          )}
        </div>
      </div>

      {/* Metadata */}
      {!uploading && !uploadDone && (
        <div className="grid grid-cols-1 gap-3">
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-slate-300 mb-1.5">
              Guideline Title <span className="text-neutral-400">(optional)</span>
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., ADA Diabetes Protocol 2024"
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-neutral-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20 text-neutral-900 dark:text-slate-200"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-slate-300 mb-1.5">
              Medical Specialty
            </label>
            <select
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-neutral-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-primary-500 text-neutral-900 dark:text-slate-200"
            >
              {SPECIALTY_TAGS.filter((s) => s !== "All").map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* SSE Progress Log */}
      {uploadProgress.length > 0 && (
        <div className="bg-slate-900 rounded-lg p-3 space-y-1 max-h-32 overflow-y-auto">
          {uploadProgress.map((msg, i) => (
            <p key={i} className="text-xs font-mono text-emerald-400 flex items-start gap-2">
              <span className="text-slate-500 shrink-0">[{String(i + 1).padStart(2, "0")}]</span>
              {msg}
            </p>
          ))}
        </div>
      )}

      {/* RAG Info Banner */}
      <div className="flex items-start gap-2 p-3 bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 rounded-lg">
        <Brain className="w-4 h-4 text-violet-600 dark:text-violet-400 shrink-0 mt-0.5" />
        <p className="text-xs text-violet-800 dark:text-violet-300">
          <span className="font-semibold">AI Knowledge Base:</span> Uploaded guidelines are automatically chunked, embedded, and stored in the clinical vector database — making them available for RAG-powered diagnosis and pathway recommendations.
        </p>
      </div>
    </div>
  );
}