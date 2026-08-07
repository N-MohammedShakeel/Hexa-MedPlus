import React, { useState } from 'react';
import { FileText, Beaker, Image as ImageIcon, Search, X } from 'lucide-react';

const NAV_ITEMS = [
  { id: 'All Documents', label: 'All Documents', icon: FileText },
  { id: 'Clinical Notes', label: 'Clinical Notes', icon: FileText },
  { id: 'Lab Reports', label: 'Lab Reports', icon: Beaker },
  { id: 'Imaging', label: 'Imaging', icon: ImageIcon },
];

export default function DocumentFilters({ selectedCategory, setSelectedCategory, patientSearch, setPatientSearch, patients = [] }) {
  const [isFocused, setIsFocused] = useState(false);
  const term = patientSearch.trim().toLowerCase();
  const matches = term
    ? patients.filter(p => p.name?.toLowerCase().includes(term) || p.mrn?.toLowerCase().includes(term)).slice(0, 8)
    : [];
  const showDropdown = isFocused && term.length > 0;

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

      {/* Filter by Patient (name or MRN) */}
      <div className="p-3 pb-1 border-b border-neutral-200 dark:border-slate-800">
        <p className="px-1 pb-2 text-[10px] font-bold uppercase tracking-widest text-neutral-400 dark:text-slate-500">
          Filter by Patient
        </p>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400 dark:text-slate-500" />
          <input
            type="text"
            value={patientSearch}
            onChange={(e) => setPatientSearch(e.target.value)}
            placeholder="Search by name or MRN..."
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className="w-full pl-8 pr-7 py-2 bg-white dark:bg-slate-800 border border-neutral-300 dark:border-slate-700 rounded-6 text-xs text-neutral-900 dark:text-slate-200 placeholder:text-neutral-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
          {patientSearch && (
            <button
              onClick={() => setPatientSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 dark:hover:text-slate-300"
              title="Clear"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          {showDropdown && (
            <div className="absolute z-10 left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-neutral-300 dark:border-slate-700 rounded-6 shadow-lg max-h-48 overflow-y-auto">
              {matches.length > 0 ? matches.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => { setPatientSearch(p.mrn); setIsFocused(false); }}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-neutral-100 dark:hover:bg-slate-700 text-neutral-800 dark:text-slate-200"
                >
                  <span className="font-semibold">{p.name}</span>{' '}
                  <span className="text-neutral-500 dark:text-slate-400">({p.mrn})</span>
                </button>
              )) : (
                <div className="px-3 py-2 text-xs text-neutral-500 dark:text-slate-400">No matching patients found.</div>
              )}
            </div>
          )}
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