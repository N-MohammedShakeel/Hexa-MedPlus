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

  const [formData, setFormData] = useState({ name: "", dob: "", gender: "Male", status: "Outpatient" });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData({ name: "", dob: "", gender: "Male", status: "Outpatient" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const trimmedName = formData.name.trim();
    if (!trimmedName) {
      notifyError("Please enter the patient's Full Name.");
      return;
    }

    if (!formData.dob) {
      notifyError("Please select a valid Date of Birth.");
      return;
    }

    if (new Date(formData.dob) > new Date()) {
      notifyError("Date of Birth cannot be in the future.");
      return;
    }

    if (!formData.gender) {
      notifyError("Please select a Gender.");
      return;
    }

    if (!formData.status) {
      notifyError("Please select an Admission Type.");
      return;
    }

    setIsSubmitting(true);

    const nameParts = trimmedName.split(" ");
    const firstName = nameParts[0] || "";
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "";
    const autoMrn = `MRN-${Math.floor(Math.random() * 900000) + 100000}`;

    try {
      await dispatch(addNewPatient({
        firstName,
        lastName,
        dob: formData.dob,
        gender: formData.gender,
        mrn: autoMrn,
        status: formData.status,
        allergies: [],
        activeMedications: [],
      }));

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
          <p className="text-xs text-neutral-500 dark:text-slate-400 mb-4">A unique MRN will be auto-generated for this patient upon registration.</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Input label="Full Name *" name="name" value={formData.name} onChange={handleChange} placeholder="e.g. John Doe" required />
            </div>
            <Input label="Date of Birth *" type="date" name="dob" value={formData.dob} onChange={handleChange} max={todayStr} required />
            <div>
              <label className="block text-xs font-semibold text-neutral-800 dark:text-slate-300 mb-1.5">Gender <span className="text-danger-500">*</span></label>
              <select name="gender" value={formData.gender} onChange={handleChange} required
                className="w-full py-2.5 px-3 bg-white dark:bg-slate-800 border border-neutral-300 dark:border-slate-600 rounded-lg text-sm text-neutral-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500">
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-neutral-800 dark:text-slate-300 mb-1.5">Admission Type <span className="text-danger-500">*</span></label>
              <select name="status" value={formData.status} onChange={handleChange} required
                className="w-full py-2.5 px-3 bg-white dark:bg-slate-800 border border-neutral-300 dark:border-slate-600 rounded-lg text-sm text-neutral-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500">
                <option value="Inpatient">Inpatient (Admitted — overnight bed)</option>
                <option value="Outpatient">Outpatient (Clinic / Day visit)</option>
                <option value="Emergency">Emergency / Under Observation</option>
                <option value="CCU Admitted">CCU Admitted (Critical Care)</option>
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
