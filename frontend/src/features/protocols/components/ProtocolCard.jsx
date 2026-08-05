import React from "react";
import StatusBadge from "../../../components/ui/Badge";
import { Brain, Clock, Timer } from "lucide-react";
import { daysUntilExpiry, isExpiringSoon } from "../utils/expiry";

export default function ProtocolCard({ protocol, isSelected, onClick }) {
  const expiringSoon = !protocol.isRetired && isExpiringSoon(protocol.expiryDate);
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-lg border transition-all group ${
        protocol.isRetired ? "opacity-60" : ""
      } ${
        isSelected
          ? "border-l-4 border-l-primary-500 bg-primary-50/40 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800"
          : "border-l-4 border-l-transparent bg-white dark:bg-slate-800/50 hover:bg-neutral-50 dark:hover:bg-slate-800 border-neutral-200 dark:border-slate-700"
      }`}
    >
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide ${
            protocol.statusColor === "success"
              ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
              : "bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"
          }`}>
            {protocol.specialty}
          </span>
          {protocol.version > 1 && (
            <span className="text-[10px] font-bold text-neutral-500 dark:text-slate-400">v{protocol.version}</span>
          )}
          {protocol.vectorized && (
            <span className="flex items-center gap-0.5 text-[10px] text-violet-600 dark:text-violet-400 font-semibold">
              <Brain className="w-2.5 h-2.5" /> RAG
            </span>
          )}
          {expiringSoon && (
            <span className="flex items-center gap-0.5 text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
              <Timer className="w-2.5 h-2.5" /> Expires in {daysUntilExpiry(protocol.expiryDate)}d
            </span>
          )}
        </div>
        <StatusBadge status={protocol.statusColor} label={protocol.status} />
      </div>
      <h4 className="text-xs font-semibold text-neutral-900 dark:text-slate-200 leading-5 text-left">
        {protocol.title}
      </h4>
      <div className="flex items-center gap-2 mt-1.5">
        <div className="flex items-center gap-1 text-[10px] text-neutral-500 dark:text-slate-500">
          <Clock className="w-2.5 h-2.5" />
          {protocol.lastUpdated}
        </div>
        <span className="text-[10px] text-neutral-400 dark:text-slate-600">·</span>
        <span className="text-[10px] text-neutral-500 dark:text-slate-500">
          {protocol.source}
        </span>
      </div>
    </button>
  );
}