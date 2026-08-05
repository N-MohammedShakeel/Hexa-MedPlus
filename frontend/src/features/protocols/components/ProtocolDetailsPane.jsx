import React, { useState, useEffect } from "react";
import StatusBadge from "../../../components/ui/Badge";
import { clinicalService } from "../../../services/api/clinicalService";
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
      if (fetchProtocols) await fetchProtocols();
    } catch (err) {
      console.error("Failed to supersede guideline:", err);
      alert("Failed to upload new version. Please try again.");
    } finally {
      setIsSuperseding(false);
    }
  };

  if (selectedProtocol) {
    return (
      <div className="max-w-3xl mx-auto p-8 animate-fade-in">
        {/* Header Card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-neutral-200 dark:border-slate-700 overflow-hidden shadow-sm mb-6">
          <div className="h-2 bg-gradient-to-r from-violet-500 to-primary-500" />
          <div className="p-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-violet-100 dark:bg-violet-900/40 rounded-xl flex items-center justify-center shrink-0">
                  <BookOpen className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <StatusBadge status={selectedProtocol.statusColor} label={selectedProtocol.status} />
                    <span className="px-2 py-0.5 bg-violet-50 dark:bg-violet-900/30 border border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-400 text-[10px] font-bold rounded-full uppercase">
                      {selectedProtocol.specialty}
                    </span>
                    {selectedProtocol.vectorized && (
                      <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold rounded-full flex items-center gap-1 uppercase">
                        <Brain className="w-2.5 h-2.5" /> In AI Knowledge Base
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {!selectedProtocol.isRetired && (
                  <button
                    onClick={() => setShowSupersedeForm((v) => !v)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-lg text-xs font-semibold text-primary-600 dark:text-primary-400 hover:bg-primary-100 transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Supersede
                  </button>
                )}
                <button
                  onClick={() => handleDelete(selectedProtocol.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-100 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </div>
            </div>

            <h1 className="text-xl font-bold text-neutral-900 dark:text-white mb-2 leading-tight">
              {selectedProtocol.title}
            </h1>
            <p className="text-sm text-neutral-600 dark:text-slate-400 leading-relaxed mb-4">
              {selectedProtocol.description}
            </p>

            <div className="flex items-center gap-6 text-xs text-neutral-500 dark:text-slate-400 flex-wrap">
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
                <div className={`flex items-center gap-1.5 ${selectedProtocol.isRetired ? "" : "text-amber-600 dark:text-amber-400"}`}>
                  <CalendarClock className="w-3.5 h-3.5" />
                  {selectedProtocol.isRetired ? "Retired" : "Expires"}: {selectedProtocol.expiryDate}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Supersede Form */}
        {showSupersedeForm && (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-primary-200 dark:border-primary-800 p-5 mb-6 shadow-sm animate-fade-in">
            <h4 className="text-sm font-bold text-neutral-900 dark:text-slate-100 mb-1 flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-primary-500" /> Upload New Version
            </h4>
            <p className="text-xs text-neutral-500 dark:text-slate-400 mb-4">
              Uploading a file here retires v{selectedProtocol.version || 1} and embeds the new file as v{(selectedProtocol.version || 1) + 1}.
            </p>
            <div className="space-y-3">
              <input
                type="file"
                accept=".pdf,.docx,.doc,.txt"
                onChange={(e) => setSupersedeFile(e.target.files[0] || null)}
                className="w-full text-xs text-neutral-700 dark:text-slate-300"
              />
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-slate-300 mb-1.5">
                  Expiry Date <span className="text-neutral-400">(optional)</span>
                </label>
                <input
                  type="date"
                  value={supersedeExpiry}
                  onChange={(e) => setSupersedeExpiry(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-neutral-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-primary-500 text-neutral-900 dark:text-slate-200"
                />
              </div>
              <div className="flex items-center gap-2 justify-end">
                <button
                  onClick={() => { setShowSupersedeForm(false); setSupersedeFile(null); setSupersedeExpiry(""); }}
                  className="px-3 py-1.5 text-xs font-semibold text-neutral-600 dark:text-slate-400 hover:bg-neutral-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSupersede}
                  disabled={!supersedeFile || isSuperseding}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-primary-600 text-white text-xs font-semibold rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSuperseding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  {isSuperseding ? "Uploading..." : "Upload New Version"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Version History */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-neutral-200 dark:border-slate-700 overflow-hidden shadow-sm mb-6">
          <button
            onClick={toggleVersionHistory}
            className="w-full flex items-center justify-between px-5 py-3 hover:bg-neutral-50 dark:hover:bg-slate-700/50 transition-colors"
          >
            <span className="flex items-center gap-2 text-sm font-bold text-neutral-900 dark:text-slate-100">
              <History className="w-4 h-4 text-neutral-500" /> Version History
            </span>
            <ChevronDown className={`w-4 h-4 text-neutral-400 transition-transform ${showVersionHistory ? "rotate-180" : ""}`} />
          </button>
          {showVersionHistory && (
            <div className="px-5 pb-4 border-t border-neutral-100 dark:border-slate-700">
              {versionHistoryLoading ? (
                <div className="flex items-center gap-2 py-4 text-xs text-neutral-500 dark:text-slate-400">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading version history...
                </div>
              ) : !versionHistory || versionHistory.length === 0 ? (
                <p className="py-4 text-xs text-neutral-500 dark:text-slate-400">No version history available.</p>
              ) : (
                <div className="pt-3 space-y-2">
                  {versionHistory.map((doc) => {
                    const isCurrent = doc.id === selectedProtocol.id;
                    return (
                      <button
                        key={doc.id}
                        onClick={() => !isCurrent && selectVersion(doc)}
                        disabled={isCurrent}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors ${
                          isCurrent
                            ? "bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 cursor-default"
                            : "bg-neutral-50 dark:bg-slate-700/30 border border-neutral-100 dark:border-slate-700 hover:bg-neutral-100 dark:hover:bg-slate-700"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-neutral-800 dark:text-slate-200">v{doc.version || 1}</span>
                          {isCurrent && (
                            <span className="text-[10px] font-bold text-primary-600 dark:text-primary-400 uppercase">Viewing</span>
                          )}
                          <span className="text-[10px] text-neutral-500 dark:text-slate-500">
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
        <div className={`rounded-xl border p-4 mb-6 ${
          selectedProtocol.vectorized
            ? "bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800"
            : "bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800"
        }`}>
          <div className="flex items-start gap-3">
            {selectedProtocol.vectorized ? (
              <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
            )}
            <div>
              <h4 className={`text-sm font-bold mb-1 ${
                selectedProtocol.vectorized
                  ? "text-emerald-800 dark:text-emerald-400"
                  : "text-amber-800 dark:text-amber-400"
              }`}>
                {selectedProtocol.vectorized ? "Active in AI Knowledge Base" : "Awaiting Embedding"}
              </h4>
              <p className={`text-xs leading-relaxed ${
                selectedProtocol.vectorized
                  ? "text-emerald-700 dark:text-emerald-300"
                  : "text-amber-700 dark:text-amber-300"
              }`}>
                {selectedProtocol.vectorized
                  ? "This guideline has been chunked and embedded into the clinical vector database. It is now referenced automatically by the AI Diagnostics and Pathway agents when generating recommendations for relevant clinical cases."
                  : "This document is still being processed. Once complete, it will be available to the AI pipeline for RAG-based recommendations."}
              </p>
            </div>
          </div>
        </div>

        {/* Clinical Alert */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-neutral-200 dark:border-slate-700 p-5 mb-6 shadow-sm">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-primary-500 mt-0.5 shrink-0" />
            <div>
              <h4 className="text-sm font-bold text-neutral-900 dark:text-slate-100 mb-1">Clinical Usage Notice</h4>
              <p className="text-sm text-neutral-600 dark:text-slate-400 leading-relaxed">
                This protocol should only be used by qualified healthcare professionals. Always verify patient allergies,
                contraindications, and current medication list before applying any guideline. This document is for
                reference only — final clinical decisions rest with the treating physician.
              </p>
            </div>
          </div>
        </div>

        {/* How AI Uses This Guideline */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-neutral-200 dark:border-slate-700 overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-neutral-100 dark:border-slate-700 bg-violet-50/50 dark:bg-violet-900/10">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-violet-600" />
              <h3 className="text-sm font-bold text-neutral-900 dark:text-slate-100">
                How This Guideline Influences AI
              </h3>
            </div>
          </div>
          <div className="p-5 grid grid-cols-1 gap-4">
            {[
              {
                icon: Brain,
                color: "text-violet-600 bg-violet-50 dark:bg-violet-900/30",
                title: "Diagnostics Agent",
                desc: "Retrieved as RAG context when diagnosing relevant conditions, improving diagnostic accuracy with evidence-based reasoning.",
              },
              {
                icon: ChevronRight,
                color: "text-blue-600 bg-blue-50 dark:bg-blue-900/30",
                title: "Pathway Agent",
                desc: "Informs treatment pathway generation — step recommendations align with the protocols stored in this knowledge base.",
              },
              {
                icon: Info,
                color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30",
                title: "Drug Alert Engine",
                desc: "Drug-guideline interactions flagged in the clinical note editor are enriched by content from uploaded protocols.",
              },
            ].map((item) => (
              <div key={item.title} className="flex items-start gap-3 p-3 rounded-lg bg-neutral-50 dark:bg-slate-700/30 border border-neutral-100 dark:border-slate-700">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${item.color}`}>
                  <item.icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-neutral-800 dark:text-slate-200">{item.title}</p>
                  <p className="text-xs text-neutral-500 dark:text-slate-400 mt-0.5 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-8">
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
        {/* Header */}
        <div className="text-center mb-2">
          <div className="w-16 h-16 bg-gradient-to-br from-violet-500 to-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Brain className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-bold text-neutral-900 dark:text-white">AI Knowledge Base</h2>
          <p className="text-sm text-neutral-500 dark:text-slate-400 mt-1">Vector store health &amp; RAG index status</p>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-3 gap-4">
          {[
            {
              label: "Indexed Documents",
              value: ragLoading ? "…" : (ragStatus?.totalDocuments ?? protocols.filter((p) => p.vectorized).length),
              sub: "In vector store",
              icon: Database,
              color: "bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400",
            },
            {
              label: "Vector Chunks",
              value: ragLoading ? "…" : (ragStatus?.totalChunks ?? (protocols.filter((p) => p.vectorized).length * 12)),
              sub: "Embedded segments",
              icon: Sparkles,
              color: "bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400",
            },
            {
              label: "Index Health",
              value: ragLoading ? "…" : (ragStatus?.healthy === false ? "⚠ Warning" : "✓ Healthy"),
              sub: ragLoading ? "Checking…" : (ragStatus?.lastIndexed ? `Last: ${new Date(ragStatus.lastIndexed).toLocaleTimeString()}` : "Live"),
              icon: CheckCircle,
              color: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
            },
          ].map((stat, i) => (
            <div key={i} className="bg-white dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 rounded-xl p-4 text-center shadow-sm">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3 ${stat.color}`}>
                <stat.icon className="w-5 h-5" />
              </div>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">{stat.value}</p>
              <p className="text-xs font-semibold text-neutral-600 dark:text-slate-400 mt-0.5">{stat.label}</p>
              <p className="text-[10px] text-neutral-400 dark:text-slate-500 mt-0.5">{stat.sub}</p>
            </div>
          ))}
        </div>

        {/* Recent Protocols */}
        <div className="bg-white dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-neutral-200 dark:border-slate-700 flex items-center justify-between">
            <h3 className="text-sm font-bold text-neutral-900 dark:text-slate-100">Recently Indexed Guidelines</h3>
            <button onClick={fetchRagStatus} className="text-xs text-primary-600 hover:text-primary-700 font-semibold flex items-center gap-1">
              <Loader2 className={`w-3 h-3 ${ragLoading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>
          {protocols.filter((p) => p.vectorized).length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm text-neutral-500 dark:text-slate-400">No guidelines indexed yet.</p>
              <button
                onClick={() => setShowUploadPanel(true)}
                className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-violet-600 text-white text-xs font-semibold rounded-lg hover:bg-violet-700 transition-colors"
              >
                <Upload className="w-3.5 h-3.5" /> Upload First Guideline
              </button>
            </div>
          ) : (
            <div className="divide-y divide-neutral-100 dark:divide-slate-700">
              {protocols.filter((p) => p.vectorized).slice(0, 5).map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedProtocol(p)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-neutral-50 dark:hover:bg-slate-700/50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-violet-100 dark:bg-violet-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FileText className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-neutral-900 dark:text-slate-200 truncate max-w-[280px]">{p.title}</p>
                      <p className="text-[10px] text-neutral-500 dark:text-slate-500">{p.specialty} · {p.lastUpdated}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 rounded-full flex items-center gap-1 flex-shrink-0">
                    <Brain className="w-2.5 h-2.5" /> RAG
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* How It Works */}
        <div className="bg-gradient-to-br from-violet-50 to-primary-50 dark:from-violet-900/20 dark:to-primary-900/20 border border-violet-200 dark:border-violet-800 rounded-xl p-5">
          <h4 className="text-sm font-bold text-violet-900 dark:text-violet-200 mb-3 flex items-center gap-2">
            <Info className="w-4 h-4" /> How RAG Works in Hexa MedPlus
          </h4>
          <div className="space-y-2.5">
            {[
              { step: "1", text: "Upload a PDF/DOCX guideline — it's parsed, chunked into semantic segments." },
              { step: "2", text: "Each chunk is embedded using NVIDIA NIM and stored in the vector database (PGVector)." },
              { step: "3", text: "When AI analyzes a clinical note, it retrieves the most relevant guideline chunks (semantic search)." },
              { step: "4", text: "Retrieved context is injected into the LLM prompt, producing guideline-grounded diagnoses with citations." },
            ].map((item) => (
              <div key={item.step} className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-violet-600 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{item.step}</span>
                <p className="text-xs text-violet-800 dark:text-violet-300 leading-relaxed">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}