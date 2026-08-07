import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { addNewPatient } from "../../../store/slices/patientSlice";
import { notifyError } from "../../../common/utils/toast";
import Modal from "../../../components/ui/Modal/Modal";
import Input from "../../../components/ui/Input";
import Button from "../../../components/ui/Button";

const todayStr = new Date().toISOString().split("T")[0];

// ─── Main Modal ───────────────────────────────────────────────────────────────
// Deliberately limited to core, largely-immutable demographics. Returning-patient
// lookup lives on the dedicated Records page now. Department/Primary Diagnosis are
// set post-creation (Patient Management, or "Apply to Patient Record" from an
// Encounter's AI diagnosis). Medications/Clinical Notes belong in the patient's
// Notes tab, and lab/imaging reports go through Document Workspace — both already
// do this better than a one-shot field on this form ever could.
export default function AddPatientModal({ isOpen, onClose }) {
  const dispatch = useDispatch();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({ name: "", mrn: "", dob: "", gender: "Male" });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData({ name: "", mrn: "", dob: "", gender: "Male" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const trimmedMrn = formData.mrn.trim();
    if (trimmedMrn && (trimmedMrn.length < 5 || trimmedMrn.length > 18)) {
      notifyError("MRN must be between 5 and 18 characters long (e.g. MRN-12345 or 12345678).");
      return;
    }

    if (trimmedMrn && !/^[A-Za-z0-9-]+$/.test(trimmedMrn)) {
      notifyError("MRN can only contain letters, numbers, and hyphens.");
      return;
    }

    setIsSubmitting(true);

    const nameParts = formData.name.trim().split(" ");
    const firstName = nameParts[0] || "";
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "";
    const mrnToUse = trimmedMrn || `MRN-${Math.floor(Math.random() * 900000) + 100000}`;

    try {
      await dispatch(addNewPatient({
        firstName,
        lastName,
        dob: formData.dob,
        gender: formData.gender,
        mrn: mrnToUse,
        status: "Active",
        allergies: [],
        activeMedications: [],
      })).unwrap();

      onClose();
      resetForm();
    } catch (error) {
      console.error("Failed to add patient", error);
      notifyError(error.message || "Failed to add patient");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Patient" size="md">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-slate-100 mb-4 pb-2 border-b border-neutral-200 dark:border-slate-700">Patient Demographics</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Input label="Full Name" name="name" value={formData.name} onChange={handleChange} required />
            </div>
            <Input label="MRN (Optional)" name="mrn" value={formData.mrn} onChange={handleChange} placeholder="e.g. MRN-102948 (5-18 chars)" />
            <Input label="Date of Birth" type="date" name="dob" value={formData.dob} onChange={handleChange} max={todayStr} required />
            <div>
              <label className="block text-xs font-semibold text-neutral-800 dark:text-slate-300 mb-1.5">Gender</label>
              <select name="gender" value={formData.gender} onChange={handleChange}
                className="w-full py-2.5 px-3 bg-white dark:bg-slate-800 border border-neutral-300 dark:border-slate-600 rounded-lg text-sm text-neutral-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500">
                <option>Male</option><option>Female</option><option>Other</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-6 border-t border-neutral-200 dark:border-slate-700">
          <Button variant="secondary" type="button" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save Patient Record"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
