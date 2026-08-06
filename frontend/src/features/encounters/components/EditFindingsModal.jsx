import React, { useState, useEffect } from "react";
import { X, Save, Brain, Loader2 } from "lucide-react";
import Button from "../../../components/ui/Button";
import ImagingFindingsEditor from "./ImagingFindingsEditor";
import LabFindingsEditor from "./LabFindingsEditor";

/**
 * Dedicated modal for editing Vision AI clinical findings (Labs or Imaging),
 * including Title / Heading, Radiologist Summary, and Structured Table Rows.
 */
export default function EditFindingsModal({ record, onClose, onSave }) {
  const [heading, setHeading] = useState("");
  const [summary, setSummary] = useState("");
  const [findings, setFindings] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (record) {
      setHeading(record.aiHeading || record.fileKey?.split("/").pop() || "");
      setSummary(record.reportSummary || "");
      setFindings(record.clinicalFindings ? JSON.parse(JSON.stringify(record.clinicalFindings)) : []);
    }
  }, [record]);

  if (!record) return null;

  const isLab =
    record.documentType === "LAB_REPORT" ||
    (!record.documentType && !["IMAGING", "XRAY", "MRI", "CT_SCAN", "DICOM"].includes(record.documentType));

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(record.id, {
        aiHeading: heading,
        reportSummary: summary,
        clinicalFindings: findings,
      });
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-neutral-900/75 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white dark:bg-neutral-900 rounded-12 shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-neutral-200 dark:border-neutral-800">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-8 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                Edit {isLab ? "Lab Analysis & Title" : "Imaging Analysis & Summary"}
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 font-mono">
                {record.fileKey}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-6 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 p-6 overflow-y-auto space-y-5">
          {/* 1. Title / Heading */}
          <div>
            <label className="block text-xs font-bold uppercase text-neutral-600 dark:text-neutral-400 mb-1.5">
              Document Title / Heading
            </label>
            <input
              type="text"
              value={heading}
              onChange={(e) => setHeading(e.target.value)}
              placeholder="e.g. CT Brain - Normal Scan"
              className="w-full px-3 py-2 text-sm bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-8 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500 font-semibold"
            />
          </div>

          {/* 2. Summary (Imaging Radiologist Summary / Lab AI Summary) */}
          <div>
            <label className="block text-xs font-bold uppercase text-neutral-600 dark:text-neutral-400 mb-1.5">
              {isLab ? "Lab Summary / Impression" : "AI Radiologist Summary"}
            </label>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={3}
              placeholder={isLab ? "e.g. Normal lab panel results..." : "e.g. Normal non-contrast CT brain. No evidence of acute hemorrhage or edema."}
              className="w-full px-3 py-2 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-8 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500 leading-relaxed font-sans"
            />
          </div>

          {/* 3. Structured Clinical Findings / Lab Results Table */}
          <div>
            <label className="block text-xs font-bold uppercase text-neutral-600 dark:text-neutral-400 mb-2">
              {isLab ? "Structured Lab Test Rows" : "Clinical Findings Rows"}
            </label>
            {isLab ? (
              <LabFindingsEditor value={findings} onChange={setFindings} />
            ) : (
              <ImagingFindingsEditor value={findings} onChange={setFindings} />
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button size="sm" icon={isSaving ? Loader2 : Save} onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </div>

      </div>
    </div>
  );
}
