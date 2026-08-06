import React, { useState, useEffect } from "react";
import { X, Save, Brain, Loader2 } from "lucide-react";
import Button from "../../../components/ui/Button";
import ImagingFindingsEditor from "./ImagingFindingsEditor";
import LabFindingsEditor from "./LabFindingsEditor";

/**
 * Dedicated modal for editing Vision AI clinical findings (Labs or Imaging).
 * Prevents inline card/view overlap by isolating the editor in a clean dialog.
 */
export default function EditFindingsModal({ record, onClose, onSave }) {
  const [findings, setFindings] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (record) {
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
      await onSave(record.id, findings);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-neutral-900/75 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white dark:bg-neutral-900 rounded-12 shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden border border-neutral-200 dark:border-neutral-800">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-8 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                Edit {isLab ? "Structured Lab Results" : "Imaging Clinical Findings"}
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {record.aiHeading || record.fileKey?.split("/").pop() || "Document Record"}
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
        <div className="flex-1 p-6 overflow-y-auto">
          {isLab ? (
            <LabFindingsEditor value={findings} onChange={setFindings} />
          ) : (
            <ImagingFindingsEditor value={findings} onChange={setFindings} />
          )}
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
