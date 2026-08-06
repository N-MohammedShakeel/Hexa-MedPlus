import React from 'react';
import { AlertTriangle } from 'lucide-react';

export default function PatientContextColumn({ patient }) {
    const allergies = patient?.allergies || [];
    const activeMedications = patient?.activeMedications || [];

    return (
        <div className="space-y-4 h-full flex flex-col">
            {/* Allergies Card */}
            <div className="bg-white dark:bg-neutral-900 p-4 rounded-8 shadow-card border border-neutral-400 dark:border-neutral-800">
                <h3 className="text-sm font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider mb-2">Allergies</h3>
                <div className="flex flex-wrap gap-2">
                    {allergies.map((allergy) => (
                        <span key={allergy} className="inline-flex items-center gap-1 px-2 py-1 bg-danger-50 dark:bg-danger-500/10 text-danger-600 dark:text-danger-500 text-sm font-medium rounded-6 border border-danger-200 dark:border-danger-700/50">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            {allergy}
                        </span>
                    ))}
                </div>
            </div>

            {/* Active Medications Card */}
            <div className="bg-white dark:bg-neutral-900 p-4 rounded-8 shadow-card border border-neutral-400 dark:border-neutral-800 flex-1">
                <h3 className="text-sm font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider mb-3">Active Medications</h3>
                <div className="space-y-3">
                    {activeMedications.map((med) => (
                        <div key={med.name} className="flex items-start">
                            <div className="w-2 h-2 mt-2 rounded-full bg-primary-500 mr-3"></div>
                            <div>
                                <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">{med.name}</p>
                                <p className="text-xs text-neutral-500 dark:text-neutral-400">{med.dose}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Vitals Widget */}
            <div className="bg-white dark:bg-neutral-900 p-4 rounded-8 shadow-card border border-neutral-400 dark:border-neutral-800">
                <h3 className="text-sm font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider mb-2">Latest Vitals</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="bg-neutral-50 dark:bg-neutral-800 p-2 rounded-6"><span className="text-neutral-500 dark:text-neutral-400">BP:</span> <span className="font-medium text-neutral-800 dark:text-neutral-200">140/90</span></div>
                    <div className="bg-neutral-50 dark:bg-neutral-800 p-2 rounded-6"><span className="text-neutral-500 dark:text-neutral-400">HR:</span> <span className="font-medium text-neutral-800 dark:text-neutral-200">78</span></div>
                    <div className="bg-neutral-50 dark:bg-neutral-800 p-2 rounded-6"><span className="text-neutral-500 dark:text-neutral-400">SpO2:</span> <span className="font-medium text-neutral-800 dark:text-neutral-200">98%</span></div>
                    <div className="bg-neutral-50 dark:bg-neutral-800 p-2 rounded-6"><span className="text-neutral-500 dark:text-neutral-400">Temp:</span> <span className="font-medium text-neutral-800 dark:text-neutral-200">98.6F</span></div>
                </div>
            </div>
        </div>
    );
}