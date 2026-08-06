import React, { useState } from 'react';
import EmptyState from '../../../../components/ui/EmptyState';
import { FlaskConical, ScanLine } from 'lucide-react';

export default function ClinicalDataColumn() {
    // In a real app, this comes from the store. Hardcoded for static UI demo.
    const staticNote = `CHIEF COMPLAINT: Fatigue and polyuria x 3 weeks.\n\nHISTORY OF PRESENT ILLNESS: Patient is a 68 y/o male with a history of T2DM and HTN presenting with increased fatigue...`;
    const [activeTab, setActiveTab] = useState('Notes');

    return (
        <div className="flex flex-col h-full">
            {/* Tab Header */}
            <div className="flex border-b border-neutral-400 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 px-4 pt-2">
                {['Notes', 'Labs', 'Imaging'].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-4 py-2 text-sm font-medium border-b-2 ${activeTab === tab ? 'border-primary-500 text-primary-600 dark:text-primary-400' : 'border-transparent text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'}`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Note Content Area */}
            <div className="flex-1 p-4 overflow-y-auto">
                {activeTab === 'Notes' && (
                    <>
                        <div className="mb-4 flex justify-between items-center">
                            <h4 className="font-semibold text-neutral-800 dark:text-neutral-200">General Progress Note - 10/24/2023</h4>
                            <span className="text-xs bg-info-50 dark:bg-info-500/10 text-info-500 dark:text-info-500 px-2 py-1 rounded-6">H&P</span>
                        </div>

                        {/* Using whitespace-pre-wrap keeps the formatting of the clinical text */}
                        <div className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed bg-neutral-50 dark:bg-neutral-800 p-4 rounded-8 border border-neutral-400 dark:border-neutral-800 font-mono whitespace-pre-wrap">
                            {staticNote}
                        </div>
                    </>
                )}
                {activeTab === 'Labs' && (
                    <EmptyState icon={FlaskConical} title="No Lab Data Linked Yet" description="Lab results are not yet wired into this workspace view." />
                )}
                {activeTab === 'Imaging' && (
                    <EmptyState icon={ScanLine} title="No Imaging Linked Yet" description="Imaging studies are not yet wired into this workspace view." />
                )}
            </div>
        </div>
    );
}