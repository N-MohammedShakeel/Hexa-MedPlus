import React from 'react';

export default function PatientContextColumn({ patient }) {
    return (
        <div className="space-y-4 h-full flex flex-col">
            {/* Allergies Card */}
            <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Allergies</h3>
                <div className="flex flex-wrap gap-2">
                    {patient.allergies.map((allergy) => (
                        <span key={allergy} className="px-3 py-1 bg-red-100 text-red-700 text-sm font-medium rounded-full border border-red-200">
                            ⚠️ {allergy}
                        </span>
                    ))}
                </div>
            </div>

            {/* Active Medications Card */}
            <div className="bg-white p-4 rounded-lg shadow border border-gray-200 flex-1">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Active Medications</h3>
                <div className="space-y-3">
                    {patient.activeMedications.map((med) => (
                        <div key={med.name} className="flex items-start">
                            <div className="w-2 h-2 mt-2 rounded-full bg-blue-500 mr-3"></div>
                            <div>
                                <p className="text-sm font-semibold text-gray-800">{med.name}</p>
                                <p className="text-xs text-gray-500">{med.dose}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Vitals Widget */}
            <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Latest Vitals</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="bg-gray-50 p-2 rounded"><span className="text-gray-500">BP:</span> <span className="font-medium">140/90</span></div>
                    <div className="bg-gray-50 p-2 rounded"><span className="text-gray-500">HR:</span> <span className="font-medium">78</span></div>
                    <div className="bg-gray-50 p-2 rounded"><span className="text-gray-500">SpO2:</span> <span className="font-medium">98%</span></div>
                    <div className="bg-gray-50 p-2 rounded"><span className="text-gray-500">Temp:</span> <span className="font-medium">98.6F</span></div>
                </div>
            </div>
        </div>
    );
}