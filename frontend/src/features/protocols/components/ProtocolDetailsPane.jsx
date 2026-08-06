import React, { useState, useEffect } from "react";
import StatusBadge from "../../../components/ui/Badge";
import { clinicalService } from "../../../services/api/clinicalService";
import { notifyError } from "../../../common/utils/toast";
import {
  BookOpen,
  AlertTriangle,
  CheckCircle,
  ChevronRight,
  Clock,
  Loader2,
  Upload,
  FileText,
  Shield,
  Brain,
  Trash2,
  Sparkles,
  Database,
  Info,
  RefreshCw,
  CalendarClock,
  History,
  ChevronDown,
} from "lucide-react";

export default function ProtocolDetailsPane({
  selectedProtocol,
  setSelectedProtocol,
  handleDelete,
  ragStatus,
  ragLoading,
  protocols,
  fetchRagStatus,
  fetchProtocols,
  setShowUploadPanel,
}) {
  const [showSupersedeForm, setShowSupersedeForm] = useState(false);
  const [supersedeFile, setSupersedeFile] = useState(null);
  const [supersedeExpiry, setSupersedeExpiry] = useState("");
  const [isSuperseding, setIsSuperseding] = useState(false);

  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [versionHistory, setVersionHistory] = useState(null);
  const [versionHistoryLoading, setVersionHistoryLoading] = useState(false);

  const toggleVersionHistory = async () => {
    const opening = !showVersionHistory;
    setShowVersionHistory(opening);
    if (opening && versionHistory === null && selectedProtocol) {
      setVersionHistoryLoading(true);
      try {
        const chain = await clinicalService.getVersionHistory(selectedProtocol.id);
        setVersionHistory(chain);
      } catch (err) {
        console.error("Failed to load version history:", err);
        setVersionHistory([]);
      } finally {
        setVersionHistoryLoading(false);
      }
    }
  };

  const selectVersion = (doc) => {
    const target = protocols.find((p) => p.id === doc.id);
    if (target) setSelectedProtocol(target);
  };

  useEffect(() => {
    setShowVersionHistory(false);
    setVersionHistory(null);
  }, [selectedProtocol?.id]);

  const handleSupersede = async () => {
    if (!supersedeFile || !selectedProtocol) return;
    setIsSuperseding(true);
    try {
      await clinicalService.supersedeDocument(selectedProtocol.id, supersedeFile, supersedeExpiry || undefined);
      setShowSupersedeForm(false);
      setSupersedeFile(null);
      setSupersedeExpiry("");
      setSelectedProtocol(null);
      // Wait briefly for the backend to commit the RETIRED status on the old doc
      // before re-fetching the list, otherwise the stale "Active" record shows up.
      if (fetchProtocols) {
        await new Promise((r) => setTimeout(r, 1000));
        await fetchProtocols();
      }
    } catch (err) {
      console.error("Failed to supersede guideline:", err);
      notifyError("Failed to upload new version. Please try again.");
    } finally {
      setIsSuperseding(false);
    }
  };

  if (selectedProtocol) {
    return (
      <div className="max-w-3xl mx-auto p-8 animate-fade-in">
        {/* Header Card */}
        <div className="bg-white dark:bg-neutral-900 rounded-8 border border-neutral-200 dark:border-neutral-800 shadow-sm mb-6">
          <div className="p-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex items-center gap-2 flex-wrap">
                <StatusBadge status={selectedProtocol.statusColor} label={selectedProtocol.status} />
                <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                  {selectedProtocol.specialty}
                </span>
                {selectedProtocol.vectorized && (
                  <span className="flex items-center gap-1 text-[11px] font-semibold text-primary-600 dark:text-primary-400">
                    <Brain className="w-3 h-3" /> In AI Knowledge Base
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {!selectedProtocol.isRetired && (
                  <button
                    onClick={() => setShowSupersedeForm((v) => !v)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-6 text-xs font-semibold text-primary-600 dark:text-primary-400 hover:bg-primary-100 transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Supersede
                  </button>
                )}
                <button
                  onClick={() => handleDelete(selectedProtocol.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 rounded-6 text-xs font-semibold text-danger-600 dark:text-danger-400 hover:bg-danger-100 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </div>
            </div>

            <h1 className="text-xl font-bold text-neutral-900 dark:text-white mb-2 leading-tight">
              {selectedProtocol.title}
            </h1>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed mb-4">
              {selectedProtocol.description}
            </p>

            <div className="flex items-center gap-6 text-xs text-neutral-500 dark:text-neutral-400 flex-wrap">
              <div className="flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5" />
                Source: {selectedProtocol.source}
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                Uploaded: {selectedProtocol.lastUpdated}
              </div>
              <div className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                File: {selectedProtocol.fileName}
              </div>
              <div className="flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5" />
                Version: v{selectedProtocol.version || 1}
              </div>
              {selectedProtocol.expiryDate && (
                <div className={`flex items-center gap-1.5 ${selectedProtocol.isRetired ? "" : "text-warning-500"}`}>
                  <CalendarClock className="w-3.5 h-3.5" />
                  {selectedProtocol.isRetired ? "Retired" : "Expires"}: {selectedProtocol.expiryDate}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Supersede Form */}
        {showSupersedeForm && (
          <div className="bg-white dark:bg-neutral-900 rounded-8 border border-primary-200 dark:border-primary-800 p-5 mb-6 shadow-sm animate-fade-in">
            <h4 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 mb-1 flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-primary-500" /> Upload New Version
            </h4>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4">
              Uploading a file here retires v{selectedProtocol.version || 1} and embeds the new file as v{(selectedProtocol.version || 1) + 1}.
            </p>
            <div className="space-y-3">
              <input
                type="file"
                accept=".pdf,.docx,.doc,.txt"
                onChange={(e) => setSupersedeFile(e.target.files[0] || null)}
                className="w-full text-xs text-neutral-700 dark:text-neutral-300"
              />
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Expiry Date <span className="text-neutral-400">(optional)</span>
                </label>
                <input
                  type="date"
                  value={supersedeExpiry}
                  onChange={(e) => setSupersedeExpiry(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-6 focus:outline-none focus:border-primary-500 text-neutral-900 dark:text-neutral-200"
                />
              </div>
              <div className="flex items-center gap-2 justify-end">
                <button
                  onClick={() => { setShowSupersedeForm(false); setSupersedeFile(null); setSupersedeExpiry(""); }}
                  className="px-3 py-1.5 text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-6 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSupersede}
                  disabled={!supersedeFile || isSuperseding}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-primary-500 text-white text-xs font-semibold rounded-6 hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSuperseding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  {isSuperseding ? "Uploading..." : "Upload New Version"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Version History */}
        <div className="bg-white dark:bg-neutral-900 rounded-8 border border-neutral-200 dark:border-neutral-800 overflow-hidden shadow-sm mb-6">
          <button
            onClick={toggleVersionHistory}
            className="w-full flex items-center justify-between px-5 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
          >
            <span className="flex items-center gap-2 text-sm font-bold text-neutral-900 dark:text-neutral-100">
              <History className="w-4 h-4 text-neutral-500" /> Version History
            </span>
            <ChevronDown className={`w-4 h-4 text-neutral-400 transition-transform ${showVersionHistory ? "rotate-180" : ""}`} />
          </button>
          {showVersionHistory && (
            <div className="px-5 pb-4 border-t border-neutral-100 dark:border-neutral-800">
              {versionHistoryLoading ? (
                <div className="flex items-center gap-2 py-4 text-xs text-neutral-500 dark:text-neutral-400">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading version history...
                </div>
              ) : !versionHistory || versionHistory.length === 0 ? (
                <p className="py-4 text-xs text-neutral-500 dark:text-neutral-400">No version history available.</p>
              ) : (
                <div className="pt-3 space-y-2">
                  {versionHistory.map((doc) => {
                    const isCurrent = doc.id === selectedProtocol.id;
                    return (
                      <button
                        key={doc.id}
                        onClick={() => !isCurrent && selectVersion(doc)}
                        disabled={isCurrent}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-6 text-left transition-colors ${
                          isCurrent
                            ? "bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 cursor-default"
                            : "bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-100 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">v{doc.version || 1}</span>
                          {isCurrent && (
                            <span className="text-[10px] font-bold text-primary-600 dark:text-primary-400 uppercase">Viewing</span>
                          )}
                          <span className="text-[10px] text-neutral-500 dark:text-neutral-500">
                            {doc.uploadedAt ? new Date(doc.uploadedAt).toISOString().split("T")[0] : ""}
                          </span>
                        </div>
                        <StatusBadge
                          status={doc.status === "RETIRED" ? "neutral" : doc.status === "COMPLETED" ? "success" : "warning"}
                          label={doc.status === "RETIRED" ? "Retired" : doc.status === "COMPLETED" ? "Active" : "Under Review"}
                        />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* AI RAG Status Card */}
        <div className={`rounded-8 border p-4 mb-6 ${
          selectedProtocol.vectorized
            ? "bg-success-50 dark:bg-success-900/10 border-success-200 dark:border-success-800"
            : "bg-warning-50 dark:bg-warning-900/10 border-warning-200 dark:border-warning-900/40"
        }`}>
          <div className="flex items-start gap-3">
            {selectedProtocol.vectorized ? (
              <CheckCircle className="w-5 h-5 text-success-500 mt-0.5 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-warning-500 mt-0.5 shrink-0" />
            )}
            <div>
              <h4 className={`text-sm font-bold mb-1 ${
                selectedProtocol.vectorized
                  ? "text-success-700 dark:text-success-400"
                  : "text-warning-500"
              }`}>
                {selectedProtocol.vectorized ? "Active in AI Knowledge Base" : "Awaiting Embedding"}
              </h4>
              <p className="text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">
                {selectedProtocol.vectorized
                  ? "This guideline has been chunked and embedded into the clinical vector database. It is now referenced automatically by the AI Diagnostics and Pathway agents when generating recommendations for relevant clinical cases."
                  : "This document is still being processed. Once complete, it will be available to the AI pipeline for RAG-based recommendations."}
              </p>
            </div>
          </div>
        </div>

        {/* Clinical Alert */}
        <div className="bg-white dark:bg-neutral-900 rounded-8 border border-neutral-200 dark:border-neutral-800 p-5 mb-6 shadow-sm">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-primary-500 mt-0.5 shrink-0" />
            <div>
              <h4 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 mb-1">Clinical Usage Notice</h4>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                This protocol should only be used by qualified healthcare professionals. Always verify patient allergies,
                contraindications, and current medication list before applying any guideline. This document is for
                reference only — final clinical decisions rest with the treating physician.
              </p>
            </div>
          </div>
        </div>

        {/* How AI Uses This Guideline */}
        <div className="bg-white dark:bg-neutral-900 rounded-8 border border-neutral-200 dark:border-neutral-800 overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-neutral-100 dark:border-neutral-800">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary-500" />
              <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                How This Guideline Influences AI
              </h3>
            </div>
          </div>
          <div className="p-5 grid grid-cols-1 gap-4">
            {[
              {
                icon: Brain,
                title: "Diagnostics Agent",
                desc: "Retrieved as RAG context when diagnosing relevant conditions, improving diagnostic accuracy with evidence-based reasoning.",
              },
              {
                icon: ChevronRight,
                title: "Pathway Agent",
                desc: "Informs treatment pathway generation — step recommendations align with the protocols stored in this knowledge base.",
              },
              {
                icon: Info,
                title: "Drug Alert Engine",
                desc: "Drug-guideline interactions flagged in the clinical note editor are enriched by content from uploaded protocols.",
              },
            ].map((item) => (
              <div key={item.title} className="flex items-start gap-3 p-3 rounded-6 bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800">
                <item.icon className="w-4 h-4 text-primary-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-neutral-800 dark:text-neutral-200">{item.title}</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const isHealthy = ragStatus ? ragStatus.status === "ONLINE" : true;

  return (
    <div className="h-full overflow-y-auto p-8">
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
        {/* Header */}
        <div className="text-center mb-2">
          <Brain className="w-10 h-10 text-primary-500 mx-auto mb-3" strokeWidth={1.5} />
          <h2 className="text-xl font-bold text-neutral-900 dark:text-white">AI Knowledge Base</h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">Vector store health &amp; RAG index status</p>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-3 gap-4">
          {[
            {
              label: "Indexed Documents",
              value: ragLoading ? "…" : (ragStatus?.documentCount ?? protocols.filter((p) => p.vectorized).length),
              sub: "In vector store",
              icon: Database,
            },
            {
              label: "Vector Chunks",
              value: ragLoading ? "…" : (ragStatus?.chunkCount ?? (protocols.filter((p) => p.vectorized).length * 12)),
              sub: "Embedded segments",
              icon: Sparkles,
            },
            {
              label: "Index Health",
              value: ragLoading ? "…" : (isHealthy ? "Healthy" : "Warning"),
              sub: ragLoading ? "Checking…" : "Live",
              icon: isHealthy ? CheckCircle : AlertTriangle,
            },
          ].map((stat, i) => (
            <div key={i} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-8 p-4 text-center shadow-sm">
              <stat.icon className="w-5 h-5 text-primary-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">{stat.value}</p>
              <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 mt-0.5">{stat.label}</p>
              <p className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-0.5">{stat.sub}</p>
            </div>
          ))}
        </div>

        {/* Recent Protocols */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-8 overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
            <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">Recently Indexed Guidelines</h3>
            <button onClick={fetchRagStatus} className="text-xs text-primary-600 hover:text-primary-700 font-semibold flex items-center gap-1">
              <Loader2 className={`w-3 h-3 ${ragLoading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>
          {protocols.filter((p) => p.vectorized).length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm text-neutral-500 dark:text-neutral-400">No guidelines indexed yet.</p>
              <button
                onClick={() => setShowUploadPanel(true)}
                className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-primary-500 text-white text-xs font-semibold rounded-6 hover:bg-primary-600 transition-colors"
              >
                <Upload className="w-3.5 h-3.5" /> Upload First Guideline
              </button>
            </div>
          ) : (
            <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {protocols.filter((p) => p.vectorized).slice(0, 5).map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedProtocol(p)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="w-4 h-4 text-neutral-400 shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-200 truncate max-w-[280px]">{p.title}</p>
                      <p className="text-[10px] text-neutral-500 dark:text-neutral-500">{p.specialty} · {p.lastUpdated}</p>
                    </div>
                  </div>
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-primary-600 dark:text-primary-400 shrink-0">
                    <Brain className="w-2.5 h-2.5" /> RAG
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* How It Works */}
        <div className="bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800 rounded-8 p-5">
          <h4 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 mb-3 flex items-center gap-2">
            <Info className="w-4 h-4 text-primary-500" /> How RAG Works in Hexa MedPlus
          </h4>
          <div className="space-y-2.5">
            {[
              { step: "1", text: "Upload a PDF/DOCX guideline — it's parsed, chunked into semantic segments." },
              { step: "2", text: "Each chunk is embedded using NVIDIA NIM and stored in the vector database (PGVector)." },
              { step: "3", text: "When AI analyzes a clinical note, it retrieves the most relevant guideline chunks (semantic search)." },
              { step: "4", text: "Retrieved context is injected into the LLM prompt, producing guideline-grounded diagnoses with citations." },
            ].map((item) => (
              <div key={item.step} className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-primary-500 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{item.step}</span>
                <p className="text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
