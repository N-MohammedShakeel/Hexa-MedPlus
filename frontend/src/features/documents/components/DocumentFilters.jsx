import React from 'react';
import { FileText, Beaker, Image as ImageIcon } from 'lucide-react';

const NAV_ITEMS = [
  { id: 'All Documents', label: 'All Documents', icon: FileText },
  { id: 'Clinical Notes', label: 'Clinical Notes', icon: FileText },
  { id: 'Lab Reports', label: 'Lab Reports', icon: Beaker },
  { id: 'Imaging', label: 'Imaging', icon: ImageIcon },
];

export default function DocumentFilters({ selectedCategory, setSelectedCategory }) {
  return (
    <div className="w-[220px] bg-neutral-50 dark:bg-slate-900 border-r border-neutral-200 dark:border-slate-800 flex flex-col">
      {/* Sidebar Header */}
      <div className="p-4 pb-4 border-b border-neutral-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <FileText className="w-5 h-5 text-primary-600 dark:text-primary-400 shrink-0" />
          <div>
            <h2 className="text-sm font-bold text-primary-600 dark:text-primary-400">Document Workspace</h2>
            <p className="text-xs text-neutral-500 dark:text-slate-400">Ingest &amp; Process</p>
          </div>
        </div>
      </div>

      {/* Category Nav */}
      <nav className="p-3 space-y-1 flex-1 overflow-y-auto">
        <p className="px-2 pt-1 pb-2 text-[10px] font-bold uppercase tracking-widest text-neutral-400 dark:text-slate-500">
          Filter by Type
        </p>
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setSelectedCategory(id)}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-6 text-xs font-semibold transition-colors ${
              selectedCategory === id
                ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400'
                : 'text-neutral-700 dark:text-slate-400 hover:bg-neutral-100 dark:hover:bg-slate-800'
            }`}
          >
            <Icon className="w-3.5 h-3.5 shrink-0" />
            {label}
          </button>
        ))}
      </nav>
    </div>
  );
}