import React, { useState } from "react";
import Card from "../../../components/ui/Card";
import Button from "../../../components/ui/Button";
import { Activity } from "lucide-react";
import { useDispatch } from "react-redux";
import { createEncounter, updateEncounterVitals } from "../../../store/slices/encounterSlice";

export default function EncounterVitalsTab({
    latestEncounter, isLocked, patientId, refetchEncounters
}) {
    const dispatch = useDispatch();
    const [vitalsForm, setVitalsForm] = useState({ bloodPressure: '', heartRate: '', o2Sat: '', temperature: '' });
    const [isSavingVitals, setIsSavingVitals] = useState(false);

    const handleSaveVitals = async () => {
        setIsSavingVitals(true);
        try {
            let targetEncounterId = latestEncounter?.id;
            if (!targetEncounterId) {
                const newEncounterRes = await dispatch(createEncounter({
                    patientId: patientId,
                    encounterDate: new Date().toISOString(),
                    encounterType: 'Outpatient',
                    chiefComplaint: 'Initial Visit'
                }));
                targetEncounterId = newEncounterRes.data?.id || newEncounterRes.id;
            }
            await dispatch(updateEncounterVitals(targetEncounterId, vitalsForm));
            await refetchEncounters();
            setVitalsForm({ bloodPressure: '', heartRate: '', o2Sat: '', temperature: '' });
        } catch (err) {
            console.error('Failed to save vitals', err);
        } finally {
            setIsSavingVitals(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto space-y-4">
            {/* Current Values */}
            <div className="grid grid-cols-4 gap-4">
                {[
                    { label: "BP", value: latestEncounter?.bloodPressure || "N/A", unit: "", flag: latestEncounter?.bloodPressure ? "normal" : "none" },
                    { label: "HR", value: latestEncounter?.heartRate || "N/A", unit: latestEncounter?.heartRate ? " bpm" : "", flag: latestEncounter?.heartRate ? "normal" : "none" },
                    { label: "O2 Sat", value: latestEncounter?.o2Sat || "N/A", unit: latestEncounter?.o2Sat ? "%" : "", flag: latestEncounter?.o2Sat && Number(latestEncounter.o2Sat) < 95 ? "high" : "normal" },
                    { label: "Temp", value: latestEncounter?.temperature || "N/A", unit: latestEncounter?.temperature ? " °F" : "", flag: "normal" },
                ].map((v, i) => (
                    <Card key={i} padding="md">
                        <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1">{v.label}</p>
                        <p className={`text-2xl font-bold ${v.flag === "high" ? "text-danger-600" : v.flag === "none" ? "text-neutral-400" : "text-neutral-900"}`}>
                            {v.value}{v.unit}
                        </p>
                    </Card>
                ))}
            </div>

            {/* Entry Form — only when not locked */}
            {!isLocked && (
                <Card padding="md" className="border-primary-200 bg-primary-50/10">
                    <h4 className="text-sm font-bold text-primary-800 mb-3">Update Vitals</h4>
                    <div className="grid grid-cols-2 gap-3">
                        {[
                            { key: 'bloodPressure', label: 'Blood Pressure', placeholder: 'e.g. 120/80', unit: 'mmHg' },
                            { key: 'heartRate',     label: 'Heart Rate',     placeholder: 'e.g. 72',     unit: 'bpm' },
                            { key: 'o2Sat',         label: 'O2 Saturation',  placeholder: 'e.g. 98',     unit: '%' },
                            { key: 'temperature',   label: 'Temperature',    placeholder: 'e.g. 98.6',   unit: '°F' },
                        ].map(field => (
                            <div key={field.key}>
                                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                                    {field.label} <span className="font-normal text-neutral-400">({field.unit})</span>
                                </label>
                                <input
                                    type="text"
                                    value={vitalsForm[field.key]}
                                    onChange={e => setVitalsForm(v => ({ ...v, [field.key]: e.target.value }))}
                                    placeholder={field.placeholder}
                                    className="w-full px-3 py-2 text-sm border border-neutral-400 rounded-lg focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                                />
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-end mt-3">
                        <Button
                            variant="primary" size="sm" icon={Activity}
                            disabled={isSavingVitals || !Object.values(vitalsForm).some(v => v.trim())}
                            onClick={handleSaveVitals}
                        >
                            {isSavingVitals ? 'Saving...' : 'Save Vitals'}
                        </Button>
                    </div>
                </Card>
            )}
        </div>
    );
}
