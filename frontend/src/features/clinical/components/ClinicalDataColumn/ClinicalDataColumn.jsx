import React from 'react';
import { useSelector } from 'react-redux';

export default function ClinicalDataColumn() {
    // In a real app, this comes from the store. Hardcoded for static UI demo.
    const staticNote = `CHIEF COMPLAINT: Fatigue and polyuria x 3 weeks.\n\nHISTORY OF PRESENT ILLNESS: Patient is a 68 y/o male with a history of T2DM and HTN presenting with increased fatigue...`;

    return (
        <div className="flex flex-col h-full">
            {/* Tab Header */}
            <div className="flex border-b bg-gray-50 px-4 pt-2">
                <button className="px-4 py-2 text-sm font-medium border-b-2 border-blue-600 text-blue-600">Notes</button>
                <button className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700">Labs</button>
                <button className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700">Imaging</button>
            </div>

            {/* Note Content Area */}
            <div className="flex-1 p-4 overflow-y-auto">
                <div className="mb-4 flex justify-between items-center">
                    <h4 className="font-semibold text-gray-800">General Progress Note - 10/24/2023</h4>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">H&P</span>
                </div>

                {/* Using whitespace-pre-wrap keeps the formatting of the clinical text */}
                <div className="text-sm text-gray-700 leading-relaxed bg-gray-50 p-4 rounded border font-mono whitespace-pre-wrap">
                    {staticNote}
                </div>
            </div>
        </div>
    );
}