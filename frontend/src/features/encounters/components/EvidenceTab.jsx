import React from "react";
import { FileText, Beaker, Activity, Image as ImageIcon } from "lucide-react";

export default function EvidenceTab({ activeTab, setActiveTab }) {
    const tabs = [
        { id: "notes", label: "Notes", Icon: FileText },
        { id: "labs", label: "Labs", Icon: Beaker },
        { id: "imaging", label: "Imaging", Icon: ImageIcon },
        { id: "vitals", label: "Vitals", Icon: Activity },
    ];

    return (
        <div className="flex border-b border-neutral-400 bg-neutral-100 px-4 pt-2">
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id
                            ? "border-primary-500 text-primary-600"
                            : "border-transparent text-neutral-600 hover:text-neutral-900"
                        }`}
                >
                    <tab.Icon className="w-4 h-4" />
                    {tab.label}
                </button>
            ))}
        </div>
    );
}
