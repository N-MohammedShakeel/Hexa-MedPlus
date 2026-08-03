import React from "react";
import { BookOpen, Search, X, Plus, Loader2, Upload, Brain } from "lucide-react";
import Input from "../../../components/ui/Input";
import GuidelineUploadPanel from "./GuidelineUploadPanel";
import ProtocolCard from "./ProtocolCard";

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
  return (
    <div className="w-[380px] bg-white dark:bg-slate-900 border-r border-neutral-200 dark:border-slate-800 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-neutral-200 dark:border-slate-800">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-violet-100 dark:bg-violet-900/40 rounded-lg flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-neutral-900 dark:text-slate-100">Hospital Guidelines</h2>
              <p className="text-[10px] text-neutral-500 dark:text-slate-400">{protocols.length} protocols loaded</p>
            </div>
          </div>
          <button
            onClick={() => setShowUploadPanel((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              showUploadPanel
                ? "bg-violet-600 text-white shadow-md"
                : "bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 border border-violet-200 dark:border-violet-800 hover:bg-violet-100"
            }`}
          >
            {showUploadPanel ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            {showUploadPanel ? "Close" : "Upload"}
          </button>
        </div>

        {/* Upload Panel (collapsible) */}
        {showUploadPanel && (
          <div className="mt-3 pt-3 border-t border-neutral-200 dark:border-slate-700 animate-fade-in">
            <GuidelineUploadPanel
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
                    ? "bg-violet-600 text-white"
                    : "bg-neutral-100 dark:bg-slate-800 text-neutral-600 dark:text-slate-400 hover:bg-neutral-200 dark:hover:bg-slate-700"
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
            <Loader2 className="w-7 h-7 animate-spin text-violet-500 mb-3" />
            <p className="text-xs text-neutral-500">Loading knowledge base...</p>
          </div>
        ) : filteredProtocols.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <div className="w-12 h-12 bg-neutral-100 dark:bg-slate-800 rounded-xl flex items-center justify-center mb-3">
              <BookOpen className="w-6 h-6 text-neutral-400" />
            </div>
            <p className="text-sm font-semibold text-neutral-700 dark:text-slate-300">No guidelines found</p>
            <p className="text-xs text-neutral-500 dark:text-slate-400 mt-1">
              Upload your first hospital guideline using the Upload button above.
            </p>
            <button
              onClick={() => setShowUploadPanel(true)}
              className="mt-4 flex items-center gap-1.5 px-4 py-2 bg-violet-600 text-white text-xs font-semibold rounded-lg hover:bg-violet-700 transition-colors"
            >
              <Upload className="w-3.5 h-3.5" /> Upload Guideline
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between px-2 py-1.5 mb-1">
              <span className="text-[10px] font-bold text-neutral-500 dark:text-slate-500 uppercase tracking-widest">
                {filteredProtocols.length} Guidelines
              </span>
              <div className="flex items-center gap-1 text-[10px] text-violet-600 dark:text-violet-400 font-semibold">
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
    </div>
  );
}
