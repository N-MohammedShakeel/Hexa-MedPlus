import React, { useState, useRef } from "react";
import { useDispatch } from "react-redux";
import { addNewPatient, unarchivePatient } from "../../store/slices/patientSlice";
import { clinicalService } from "../../services/api/clinicalService";
import Modal from "../ui/Modal/Modal";
import Input from "../ui/Input";
import Button from "../ui/Button";
import {
  Upload, X, File as FileIcon, Search, Loader2, History,
  FileText, FlaskConical, Microscope, CheckSquare, Square, AlertTriangle
} from "lucide-react";
import apiClient from "../../services/api/apiClient";

// ─── Past Record Card ─────────────────────────────────────────────────────────
function PastRecordCard({ type, icon: Icon, title, date, content, checked, onToggle, readOnly }) {
  return (
    <div className={`border rounded-lg p-3 transition-all ${checked ? 'border-primary-400 bg-primary-50/50 dark:bg-primary-900/10' : 'border-neutral-200 dark:border-slate-700'}`}>
      <div className="flex items-start gap-3">
        {/* Checkbox for selective AI context */}
        <button type="button" onClick={onToggle} className="mt-0.5 flex-shrink-0 text-primary-500">
          {checked ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4 text-neutral-400" />}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Icon className="w-3.5 h-3.5 text-neutral-500" />
            <span className="text-xs font-semibold text-neutral-700 dark:text-slate-300">{title}</span>
            {date && <span className="text-[10px] text-neutral-400 ml-auto">{date}</span>}
          </div>
          <p className="text-xs text-neutral-600 dark:text-slate-400 line-clamp-3">{content}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────
export default function AddPatientModal({ isOpen, onClose }) {
  const dispatch = useDispatch();
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // MRN Lookup states
  const [mrnLookup, setMrnLookup] = useState("");
  const [lookingUp, setLookingUp] = useState(false);
  const [existingPatient, setExistingPatient] = useState(null);
  const [pastHistory, setPastHistory] = useState([]); // [{type, title, date, content}]
  const [selectedForAI, setSelectedForAI] = useState({}); // { idx: bool }
  const [physicianAssessment, setPhysicianAssessment] = useState("");
  const [lookupError, setLookupError] = useState("");
  const [isUnarchiving, setIsUnarchiving] = useState(false);

  const [formData, setFormData] = useState({
    name: "", age: "", gender: "Male", mrn: "",
    department: "General Medicine", primaryDiagnosis: "",
    clinicalNotes: "", medications: "", history: ""
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    if (e.target.files?.length > 0) setSelectedFile(e.target.files[0]);
  };

  // ─── MRN Lookup ─────────────────────────────────────────────────────────────
  const handleMrnLookup = async () => {
    if (!mrnLookup.trim()) return;
    setLookingUp(true);
    setLookupError("");
    setExistingPatient(null);
    setPastHistory([]);
    try {
      const res = await apiClient.get(`/patients/mrn/${mrnLookup.trim()}`);
      const patient = res.data;
      setExistingPatient(patient);

      // Build history list from patient data
      const histItems = [];

      // Past encounters
      try {
        const encRes = await apiClient.get(`/encounters/patient/${patient.id}`);
        const archivedEncs = (encRes.data || []).filter(e => e.status === 'BILLED');
        archivedEncs.forEach(enc => {
          histItems.push({
            type: 'encounter',
            title: `Past Encounter — ${enc.encounterDate?.split('T')[0] || 'Unknown date'}`,
            date: enc.encounterDate?.split('T')[0],
            content: enc.chiefComplaint || enc.notes || 'No notes available',
            icon: FileText,
          });
        });
      } catch { /* no past encounters */ }

      // Documents (lab reports, imaging)
      try {
        const docRes = await apiClient.get(`/documents?mrn=${patient.mrn}`);
        (docRes.data || []).forEach(doc => {
          histItems.push({
            type: doc.documentType === 'LAB_REPORT' ? 'lab' : 'imaging',
            title: doc.fileName,
            date: doc.uploadedAt?.split('T')[0],
            content: doc.extractedText || 'Document available – no text extracted',
            icon: doc.documentType === 'LAB_REPORT' ? FlaskConical : Microscope,
          });
        });
      } catch { /* no docs */ }

      setPastHistory(histItems);
      const defaults = {};
      histItems.forEach((_, i) => { defaults[i] = true; }); // all checked by default
      setSelectedForAI(defaults);
    } catch (err) {
      if (err.response?.status === 404) {
        setLookupError("No patient found with this MRN. You can continue registering as a new patient.");
      } else {
        setLookupError("Lookup failed. Please try again.");
      }
    } finally {
      setLookingUp(false);
    }
  };

  const toggleAIContext = (idx) => {
    setSelectedForAI(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  // ─── Unarchive (returning archived patient) ──────────────────────────────────
  const handleUnarchiveAndClose = async () => {
    if (!existingPatient) return;
    setIsUnarchiving(true);
    try {
      await dispatch(unarchivePatient(existingPatient.id)).unwrap();
      onClose();
      resetForm();
    } catch (error) {
      console.error("Failed to unarchive patient", error);
      alert("Error: " + (error.message || "Failed to unarchive patient"));
    } finally {
      setIsUnarchiving(false);
    }
  };

  // ─── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (existingPatient && !physicianAssessment.trim()) {
      alert("Please provide a mandatory physician assessment of the patient's past medical history before proceeding.");
      return;
    }

    setIsSubmitting(true);

    const nameParts = formData.name.split(" ");
    const firstName = nameParts[0] || "";
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "";
    const currentYear = new Date().getFullYear();
    const dob = `${currentYear - (parseInt(formData.age) || 0)}-01-01`;
    const mrnToUse = formData.mrn || `MRN-${Math.floor(Math.random() * 90000) + 10000}`;

    // Build selected historical context to send to AI
    const selectedHistoryContext = pastHistory
      .filter((_, i) => selectedForAI[i])
      .map(h => `[${h.title}]: ${h.content}`)
      .join('\n\n');

    const combinedHistory = [
      physicianAssessment ? `Physician Assessment of Past History: ${physicianAssessment}` : '',
      selectedHistoryContext ? `\n\nSelected Historical Records:\n${selectedHistoryContext}` : ''
    ].filter(Boolean).join('\n');

    try {
      const newPatientResult = await dispatch(addNewPatient({
        firstName,
        lastName,
        dob,
        gender: formData.gender,
        mrn: mrnToUse,
        department: formData.department,
        allergies: [formData.primaryDiagnosis || "Pending Review"],
        activeMedications: formData.medications ? formData.medications.split('\n').filter(Boolean) : [],
        status: "Active",
        previousPatientHistory: combinedHistory || undefined,
        previousPatientId: existingPatient?.id || undefined,
      })).unwrap();

      if (selectedFile) {
        const patientMrn = newPatientResult?.mrn || mrnToUse;
        await clinicalService.uploadDocument(selectedFile, "LAB_REPORT", patientMrn);
      }

      onClose();
      resetForm();
    } catch (error) {
      console.error("Failed to add patient", error);
      alert("Error: " + (error.message || "Failed to add patient"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({ name: "", age: "", gender: "Male", mrn: "", department: "General Medicine", primaryDiagnosis: "", clinicalNotes: "", medications: "", history: "" });
    setSelectedFile(null);
    setMrnLookup("");
    setExistingPatient(null);
    setPastHistory([]);
    setSelectedForAI({});
    setPhysicianAssessment("");
    setLookupError("");
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Patient" size="xl">
      <form onSubmit={handleSubmit} className="space-y-6">

        {/* ─── MRN Lookup ─────────────────────────────────────────────────────── */}
        <div>
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-slate-100 mb-3 pb-2 border-b border-neutral-200 dark:border-slate-700 flex items-center gap-2">
            <History className="w-4 h-4 text-primary-500" />
            Returning Patient Lookup
          </h3>
          <p className="text-xs text-neutral-500 dark:text-slate-400 mb-3">
            If this patient has visited before, enter their MRN to load their history.
          </p>
          <div className="flex gap-2">
            <Input
              placeholder="Enter existing MRN (e.g. MRN-12345)"
              value={mrnLookup}
              onChange={e => setMrnLookup(e.target.value)}
              leftIcon={Search}
            />
            <Button type="button" variant="secondary" onClick={handleMrnLookup} disabled={lookingUp || !mrnLookup.trim()}>
              {lookingUp ? <Loader2 className="w-4 h-4 animate-spin" /> : "Look Up"}
            </Button>
          </div>
          {lookupError && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" /> {lookupError}
            </p>
          )}
        </div>

        {/* ─── Returning Patient History Panel ────────────────────────────────── */}
        {existingPatient && (
          <div className="border border-primary-200 dark:border-primary-700 rounded-xl p-4 bg-primary-50/50 dark:bg-primary-900/10 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-xs font-bold text-primary-700 dark:text-primary-300">
                {existingPatient.name?.split(' ').map(n => n[0]).join('') || '?'}
              </div>
              <div>
                <p className="text-sm font-semibold text-neutral-900 dark:text-slate-100">Returning: {existingPatient.name}</p>
                <p className="text-xs text-neutral-500 dark:text-slate-400">MRN: {existingPatient.mrn} · Previous visits found</p>
              </div>
            </div>

            {existingPatient.archived ? (
              <div className="border border-amber-300 dark:border-amber-700 rounded-lg p-3 bg-amber-50 dark:bg-amber-900/20 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-amber-800 dark:text-amber-300">This patient is archived</p>
                  <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                    Unarchiving restores their full history into the active workspace instead of creating a duplicate record.
                  </p>
                </div>
                <Button type="button" onClick={handleUnarchiveAndClose} disabled={isUnarchiving} className="flex-shrink-0">
                  {isUnarchiving ? "Unarchiving..." : "Unarchive Patient"}
                </Button>
              </div>
            ) : pastHistory.length > 0 ? (
              <>
                <div>
                  <p className="text-xs font-semibold text-neutral-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                    <CheckSquare className="w-3.5 h-3.5 text-primary-500" />
                    Select records to include as AI context for this new encounter:
                  </p>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {pastHistory.map((item, i) => (
                      <PastRecordCard
                        key={i}
                        {...item}
                        checked={!!selectedForAI[i]}
                        onToggle={() => toggleAIContext(i)}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-red-600 dark:text-red-400 mb-1.5">
                    ✱ Mandatory Physician Assessment of Past History
                  </label>
                  <textarea
                    value={physicianAssessment}
                    onChange={e => setPhysicianAssessment(e.target.value)}
                    placeholder="Describe the current status of past conditions. E.g., 'Previous Type 2 Diabetes is well-controlled on Metformin. The 2024 upper respiratory infection has fully resolved. No known drug allergies remain relevant.'"
                    className="w-full py-2.5 px-3 bg-white dark:bg-slate-800 border border-red-200 dark:border-red-700 rounded-lg text-sm text-neutral-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
                    rows={3}
                    required
                  />
                  <p className="text-[10px] text-neutral-400 mt-1">This assessment is required before creating a new encounter for a returning patient.</p>
                </div>
              </>
            ) : (
              <p className="text-xs text-neutral-500 dark:text-slate-400 italic">No archived records found for this patient.</p>
            )}
          </div>
        )}

        {/* ─── Basic Info ──────────────────────────────────────────────────────── */}
        <div>
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-slate-100 mb-4 pb-2 border-b border-neutral-200 dark:border-slate-700">Patient Demographics</h3>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Full Name" name="name" value={formData.name} onChange={handleChange} required />
            <Input label="MRN (Optional)" name="mrn" value={formData.mrn} onChange={handleChange} placeholder="e.g. MRN-12345" />
            <Input label="Age" type="number" name="age" value={formData.age} onChange={handleChange} required />
            <div>
              <label className="block text-xs font-semibold text-neutral-800 dark:text-slate-300 mb-1.5">Gender</label>
              <select name="gender" value={formData.gender} onChange={handleChange}
                className="w-full py-2.5 px-3 bg-white dark:bg-slate-800 border border-neutral-300 dark:border-slate-600 rounded-lg text-sm text-neutral-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500">
                <option>Male</option><option>Female</option><option>Other</option>
              </select>
            </div>
          </div>
        </div>

        {/* ─── Clinical Info ───────────────────────────────────────────────────── */}
        <div>
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-slate-100 mb-4 pb-2 border-b border-neutral-200 dark:border-slate-700">Initial Clinical Information</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-800 dark:text-slate-300 mb-1.5">Department</label>
              <select name="department" value={formData.department} onChange={handleChange}
                className="w-full py-2.5 px-3 bg-white dark:bg-slate-800 border border-neutral-300 dark:border-slate-600 rounded-lg text-sm text-neutral-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500">
                <option>General Medicine</option><option>Cardiology</option><option>Endocrinology</option><option>Pulmonology</option><option>Oncology</option><option>Neurology</option>
              </select>
            </div>
            <Input label="Primary Diagnosis (Working)" name="primaryDiagnosis" value={formData.primaryDiagnosis} onChange={handleChange} />
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-800 dark:text-slate-300 mb-1.5">Current Medications</label>
              <textarea name="medications" value={formData.medications} onChange={handleChange}
                placeholder="List current medications and dosages..."
                className="w-full py-2.5 px-3 bg-white dark:bg-slate-800 border border-neutral-300 dark:border-slate-600 rounded-lg text-sm text-neutral-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none" rows={2} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-800 dark:text-slate-300 mb-1.5">Clinical Notes (Unstructured Data)</label>
              <textarea name="clinicalNotes" value={formData.clinicalNotes} onChange={handleChange}
                placeholder="Paste referral notes, triage notes, or initial physician observations here for AI ingestion..."
                className="w-full py-2.5 px-3 bg-white dark:bg-slate-800 border border-neutral-300 dark:border-slate-600 rounded-lg text-sm text-neutral-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none" rows={4} />
            </div>
          </div>
        </div>

        {/* ─── File Upload ─────────────────────────────────────────────────────── */}
        <div>
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-slate-100 mb-4 pb-2 border-b border-neutral-200 dark:border-slate-700">Laboratory & Imaging Reports</h3>
          {!selectedFile ? (
            <div onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-neutral-300 dark:border-slate-600 rounded-lg p-6 flex flex-col items-center justify-center bg-neutral-50 dark:bg-slate-800/50 hover:bg-neutral-100 dark:hover:bg-slate-800 transition-colors cursor-pointer">
              <Upload className="w-8 h-8 text-neutral-400 mb-2" />
              <p className="text-sm font-medium text-neutral-700 dark:text-slate-300">Click to select file</p>
              <p className="text-xs text-neutral-500 dark:text-slate-400 mt-1">Upload DICOM, PDF, or text reports for AI analysis</p>
            </div>
          ) : (
            <div className="border border-neutral-300 dark:border-slate-600 rounded-lg p-4 flex items-center justify-between bg-white dark:bg-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary-50 dark:bg-primary-900/40 flex items-center justify-center">
                  <FileIcon className="w-5 h-5 text-primary-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-neutral-900 dark:text-slate-200">{selectedFile.name}</p>
                  <p className="text-xs text-neutral-500 dark:text-slate-400">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              </div>
              <button type="button" onClick={() => setSelectedFile(null)}
                className="p-2 text-neutral-400 hover:text-red-500 transition-colors rounded-full hover:bg-red-50 dark:hover:bg-red-900/30">
                <X className="w-5 h-5" />
              </button>
            </div>
          )}
          <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".pdf,.txt,.dcm" />
        </div>

        {/* ─── Actions ─────────────────────────────────────────────────────────── */}
        <div className="flex justify-end gap-3 pt-6 border-t border-neutral-200 dark:border-slate-700">
          <Button variant="secondary" type="button" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting || existingPatient?.archived} title={existingPatient?.archived ? "Use the Unarchive Patient button above instead" : undefined}>
            {isSubmitting ? "Saving..." : "Save Patient Record"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
