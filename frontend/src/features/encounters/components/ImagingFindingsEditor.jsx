import React from "react";
import { Trash2, Plus } from "lucide-react";

const SEVERITY_OPTIONS = ["", "Normal", "Mild", "Moderate", "Significant"];

/**
 * Structured editor for Imaging clinical findings.
 * Fields: finding, location, size_estimate, severity
 */
export default function ImagingFindingsEditor({ value, onChange }) {
  const findings = value || [];

  const update = (idx, field, val) => {
    const next = findings.map((f, i) => i === idx ? { ...f, [field]: val } : f);
    onChange(next);
  };

  const addRow = () => {
    onChange([...findings, { finding: "", location: "", size_estimate: "", severity: "" }]);
  };

  const removeRow = (idx) => {
    onChange(findings.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-3">
      {findings.length === 0 ? (
        <p className="text-xs text-neutral-400 dark:text-neutral-500 italic text-center py-3">
          No findings yet. Click "Add Finding" to add one.
        </p>
      ) : (
        <div className="space-y-2">
          {findings.map((f, idx) => (
            <div
              key={idx}
              className="bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 rounded-8 p-3 space-y-2"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold text-primary-600 dark:text-primary-400 uppercase tracking-wide">
                  Finding #{idx + 1}
                </span>
                <button
                  type="button"
                  onClick={() => removeRow(idx)}
                  className="p-1 rounded-4 text-danger-400 hover:text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-900/20 transition-colors"
                  title="Remove finding"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase mb-1">
                    Finding
                  </label>
                  <input
                    type="text"
                    value={f.finding || ""}
                    onChange={(e) => update(idx, "finding", e.target.value)}
                    placeholder="e.g. Cerebral edema"
                    className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-6 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 placeholder-neutral-300 dark:placeholder-neutral-600"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    value={f.location || ""}
                    onChange={(e) => update(idx, "location", e.target.value)}
                    placeholder="e.g. Bilateral frontal lobes"
                    className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-6 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 placeholder-neutral-300 dark:placeholder-neutral-600"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase mb-1">
                    Size / Extent
                  </label>
                  <input
                    type="text"
                    value={f.size_estimate || ""}
                    onChange={(e) => update(idx, "size_estimate", e.target.value)}
                    placeholder="e.g. Moderate, 2.3cm"
                    className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-6 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 placeholder-neutral-300 dark:placeholder-neutral-600"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase mb-1">
                    Severity
                  </label>
                  <select
                    value={f.severity || ""}
                    onChange={(e) => update(idx, "severity", e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-6 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                  >
                    {SEVERITY_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt || "— Select Severity —"}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={addRow}
        className="flex items-center gap-1.5 text-xs font-semibold text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 bg-primary-50 dark:bg-primary-900/20 hover:bg-primary-100 dark:hover:bg-primary-900/30 border border-primary-200 dark:border-primary-800 px-3 py-1.5 rounded-6 transition-colors w-full justify-center"
      >
        <Plus className="w-3.5 h-3.5" /> Add Finding
      </button>
    </div>
  );
}
