import React, { useState } from "react";
import { BookOpen, Search, X, Plus, Loader2, Upload, Brain, TimerReset, Timer, Layers } from "lucide-react";
import Input from "../../../components/ui/Input";
import EmptyState from "../../../components/ui/EmptyState";
import GuidelineUploadPanel from "./GuidelineUploadPanel";
import ProtocolCard from "./ProtocolCard";
import BatchUploadWizard from "./BatchUploadWizard";
import { clinicalService } from "../../../services/api/clinicalService";
import { notifySuccess, notifyError } from "../../../common/utils/toast";
import { isExpiringSoon } from "../utils/expiry";

export default function ProtocolList({
  protocols,
  filteredProtocols,
  loading,
  selectedProtocol,
  setSelectedProtocol,
  activeSpecialty,
  setActiveSpecialty,
  searchTerm,
  setSearchTerm,
  showUploadPanel,
  setShowUploadPanel,
  fetchProtocols,
  SPECIALTY_TAGS,
}) {
  const [sweeping, setSweeping] = useState(false);
  const [showBatchWizard, setShowBatchWizard] = useState(false);
  const expiringSoonCount = protocols.filter((p) => !p.isRetired && isExpiringSoon(p.expiryDate)).length;

  const handleTriggerSweep = async () => {
    setSweeping(true);
    try {
      const result = await clinicalService.triggerExpirySweep();
      const count = result?.retiredCount ?? 0;
      notifySuccess(count > 0 ? `Retired ${count} expired guideline(s).` : "No expired guidelines found.");
      await fetchProtocols();
    } catch (err) {
      console.error("Failed to trigger expiry sweep:", err);
      notifyError("Failed to run the expiry sweep. Please try again.");
    } finally {
      setSweeping(false);
    }
  };

  return (
    <div className="w-[380px] bg-white dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary-500" />
            <div>
              <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">Hospital Guidelines</h2>
              <div className="flex items-center gap-1.5">
                <p className="text-[10px] text-neutral-500 dark:text-neutral-400">{protocols.length} protocols loaded</p>
                {expiringSoonCount > 0 && (
                  <span className="flex items-center gap-0.5 text-[10px] font-bold text-warning-500">
                    <Timer className="w-2.5 h-2.5" /> {expiringSoonCount} expiring soon
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleTriggerSweep}
              disabled={sweeping}
              title="Manually run the expiry sweep now, instead of waiting for the nightly job"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-6 text-xs font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-700 disabled:opacity-50 transition-colors"
            >
              {sweeping ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <TimerReset className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={() => setShowUploadPanel((v) => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-6 text-xs font-semibold transition-all ${
                showUploadPanel
                  ? "bg-primary-500 text-white"
                  : "bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 border border-primary-200 dark:border-primary-800 hover:bg-primary-100"
              }`}
            >
              {showUploadPanel ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
              {showUploadPanel ? "Close" : "Upload"}
            </button>
            <button
              onClick={() => setShowBatchWizard(true)}
              title="Batch upload multiple guidelines at once"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-6 text-xs font-semibold bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 border border-primary-200 dark:border-primary-800 hover:bg-primary-100 transition-colors"
            >
              <Layers className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Upload Panel (collapsible) */}
        {showUploadPanel && (
          <div className="mt-3 pt-3 border-t border-neutral-200 dark:border-neutral-800 animate-fade-in">
            <GuidelineUploadPanel
              existingProtocols={protocols}
              onUploadSuccess={() => {
                setShowUploadPanel(false);
                fetchProtocols();
              }}
            />
          </div>
        )}

        {/* Search */}
        {!showUploadPanel && (
          <div className="mt-3">
            <Input
              placeholder="Search guidelines..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClear={() => setSearchTerm('')}
              leftIcon={Search}
            />
          </div>
        )}

        {/* Specialty Filter Chips */}
        {!showUploadPanel && (
          <div className="flex gap-1.5 overflow-x-auto mt-3 pb-1 scrollbar-hide">
            {SPECIALTY_TAGS.map((tag) => (
              <button
                key={tag}
                onClick={() => setActiveSpecialty(tag)}
                className={`px-2.5 py-1 rounded-full text-[10px] font-bold whitespace-nowrap transition-colors ${
                  activeSpecialty === tag
                    ? "bg-primary-500 text-white"
                    : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Protocol List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="w-7 h-7 animate-spin text-primary-500 mb-3" />
            <p className="text-xs text-neutral-500">Loading knowledge base...</p>
          </div>
        ) : filteredProtocols.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="No guidelines found"
            description="Upload your first hospital guideline using the Upload button above."
            action={
              <button
                onClick={() => setShowUploadPanel(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-primary-500 text-white text-xs font-semibold rounded-6 hover:bg-primary-600 transition-colors"
              >
                <Upload className="w-3.5 h-3.5" /> Upload Guideline
              </button>
            }
          />
        ) : (
          <>
            <div className="flex items-center justify-between px-2 py-1.5 mb-1">
              <span className="text-[10px] font-bold text-neutral-500 dark:text-neutral-500 uppercase tracking-widest">
                {filteredProtocols.length} Guidelines
              </span>
              <div className="flex items-center gap-1 text-[10px] text-primary-600 dark:text-primary-400 font-semibold">
                <Brain className="w-3 h-3" /> RAG-Enabled
              </div>
            </div>
            {filteredProtocols.map((protocol) => (
              <ProtocolCard
                key={protocol.id}
                protocol={protocol}
                isSelected={selectedProtocol?.id === protocol.id}
                onClick={() => setSelectedProtocol(protocol)}
              />
            ))}
          </>
        )}
      </div>

      <BatchUploadWizard
        isOpen={showBatchWizard}
        onClose={() => setShowBatchWizard(false)}
        existingProtocols={protocols}
        onComplete={fetchProtocols}
      />
    </div>
  );
}
