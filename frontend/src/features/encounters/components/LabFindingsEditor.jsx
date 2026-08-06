import React from "react";
import { Trash2, Plus } from "lucide-react";

const FLAG_OPTIONS = ["", "HIGH", "LOW", "NORMAL", "CRITICAL"];

/**
 * Structured editor for Lab Report clinical findings.
 * Fields: finding (test name), result, unit, reference_range, flag
 */
export default function LabFindingsEditor({ value, onChange }) {
  const findings = value || [];

  const update = (idx, field, val) => {
    const next = findings.map((f, i) => i === idx ? { ...f, [field]: val } : f);
    onChange(next);
  };

  const addRow = () => {
    onChange([...findings, { finding: "", result: "", unit: "", reference_range: "", flag: "" }]);
  };

  const removeRow = (idx) => {
    onChange(findings.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-3">
      {findings.length === 0 ? (
        <p className="text-xs text-neutral-400 dark:text-neutral-500 italic text-center py-3">
          No test results yet. Click "Add Test" to add one.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-8 border border-neutral-200 dark:border-neutral-700">
          <table className="w-full text-xs text-left">
            <thead className="bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 border-b border-neutral-200 dark:border-neutral-700">
              <tr>
                <th className="px-2.5 py-2 font-semibold">Test Name</th>
                <th className="px-2.5 py-2 font-semibold">Result</th>
                <th className="px-2.5 py-2 font-semibold">Unit</th>
                <th className="px-2.5 py-2 font-semibold">Reference Range</th>
                <th className="px-2.5 py-2 font-semibold">Flag</th>
                <th className="px-2.5 py-2 w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {findings.map((f, idx) => (
                <tr key={idx} className="bg-white dark:bg-neutral-900">
                  <td className="px-1.5 py-1">
                    <input
                      type="text"
                      value={f.finding || f.test_name || ""}
                      onChange={(e) => update(idx, "finding", e.target.value)}
                      placeholder="e.g. HbA1c"
                      className="w-full px-2 py-1 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-4 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 placeholder-neutral-300 dark:placeholder-neutral-600"
                    />
                  </td>
                  <td className="px-1.5 py-1">
                    <input
                      type="text"
                      value={f.result || ""}
                      onChange={(e) => update(idx, "result", e.target.value)}
                      placeholder="6.8"
                      className="w-full px-2 py-1 text-xs font-mono bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-4 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 placeholder-neutral-300 dark:placeholder-neutral-600"
                    />
                  </td>
                  <td className="px-1.5 py-1">
                    <input
                      type="text"
                      value={f.unit || ""}
                      onChange={(e) => update(idx, "unit", e.target.value)}
                      placeholder="%"
                      className="w-20 px-2 py-1 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-4 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 placeholder-neutral-300 dark:placeholder-neutral-600"
                    />
                  </td>
                  <td className="px-1.5 py-1">
                    <input
                      type="text"
                      value={f.reference_range || ""}
                      onChange={(e) => update(idx, "reference_range", e.target.value)}
                      placeholder="< 5.7"
                      className="w-full px-2 py-1 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-4 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 placeholder-neutral-300 dark:placeholder-neutral-600"
                    />
                  </td>
                  <td className="px-1.5 py-1">
                    <select
                      value={f.flag || ""}
                      onChange={(e) => update(idx, "flag", e.target.value)}
                      className={`w-full px-2 py-1 text-xs font-bold rounded-4 border focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 ${
                        (f.flag || "").match(/HIGH|CRITICAL/i)
                          ? "bg-danger-50 dark:bg-danger-900/20 text-danger-700 dark:text-danger-400 border-danger-200 dark:border-danger-800"
                          : (f.flag || "").match(/LOW/i)
                          ? "bg-warning-50 dark:bg-warning-900/20 text-warning-600 dark:text-warning-400 border-warning-200 dark:border-warning-800"
                          : (f.flag || "").match(/NORMAL/i)
                          ? "bg-success-50 dark:bg-success-900/20 text-success-700 dark:text-success-500 border-success-200 dark:border-success-800"
                          : "bg-neutral-50 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-700"
                      }`}
                    >
                      {FLAG_OPTIONS.map((opt) => (
                        <option key={opt} value={opt} className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100">
                          {opt || "—"}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-1.5 py-1 text-center">
                    <button
                      type="button"
                      onClick={() => removeRow(idx)}
                      className="p-1 rounded-4 text-danger-400 hover:text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-900/20 transition-colors"
                      title="Remove row"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <button
        type="button"
        onClick={addRow}
        className="flex items-center gap-1.5 text-xs font-semibold text-info-600 dark:text-info-400 hover:text-info-700 bg-info-50 dark:bg-info-900/20 hover:bg-info-100 dark:hover:bg-info-900/30 border border-info-200 dark:border-info-800 px-3 py-1.5 rounded-6 transition-colors w-full justify-center"
      >
        <Plus className="w-3.5 h-3.5" /> Add Test Result
      </button>
    </div>
  );
}
