import React from 'react';
import { FileText, Upload, Clock, AlertCircle } from 'lucide-react';

export default function DocumentFilters({ selectedCategory, setSelectedCategory, onUploadClick }) {
  return (
    <div className="w-[350px] bg-neutral-50 dark:bg-slate-900 border-r border-neutral-500 dark:border-slate-800 flex flex-col">
      {/* Sidebar Header */}
      <div className="p-4 pb-4 border-b border-neutral-500 dark:border-slate-800 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-info-100 rounded-12 flex items-center justify-center">
            <FileText className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-primary-600 dark:text-primary-400">Document Workspace</h2>
            <p className="text-xs font-semibold text-neutral-800 dark:text-slate-400">
              Ingest & Process
            </p>
          </div>
        </div>
      </div>

      {/* Category Nav */}
      <nav className="p-4 space-y-1 flex-1 overflow-y-auto">
        <button
          onClick={() => setSelectedCategory('All Documents')}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-4 text-xs font-semibold transition-colors ${
            selectedCategory === 'All Documents'
              ? 'bg-info-50 text-info-500 dark:bg-info-900/30 dark:text-info-400'
              : 'text-neutral-800 dark:text-slate-400 hover:bg-neutral-100 dark:hover:bg-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          All Documents
        </button>
        
        {['Clinical Notes', 'Lab Reports', 'Imaging', 'Other Documents'].map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-4 text-xs font-semibold transition-colors ${
              selectedCategory === category
                ? 'bg-info-50 text-info-500 dark:bg-info-900/30 dark:text-info-400'
                : 'text-neutral-800 dark:text-slate-400 hover:bg-neutral-100 dark:hover:bg-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            {category}
          </button>
        ))}

        <div className="border-t border-neutral-500 dark:border-slate-800 pt-4 mt-4">
          <button 
            onClick={onUploadClick}
            className="w-full bg-primary-600 text-white rounded-4 px-4 py-2 text-xs font-semibold flex items-center justify-center gap-2 hover:bg-primary-700 transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            Upload Document
          </button>
        </div>

        <div className="border-t border-neutral-500 dark:border-slate-800 pt-4 mt-4 space-y-1">
          <button 
            onClick={() => setSelectedCategory('Recent Uploads')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-4 text-xs font-semibold transition-colors ${
              selectedCategory === 'Recent Uploads'
                ? 'bg-info-50 text-info-500 dark:bg-info-900/30 dark:text-info-400'
                : 'text-neutral-800 dark:text-slate-400 hover:bg-neutral-100 dark:hover:bg-slate-800'
            }`}
          >
            <Clock className="w-4 h-4" />
            Recent Uploads
          </button>
          <button 
            onClick={() => setSelectedCategory('Failed Uploads')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-4 text-xs font-semibold transition-colors ${
              selectedCategory === 'Failed Uploads'
                ? 'bg-danger-50 text-danger-600 dark:bg-danger-900/30 dark:text-danger-400'
                : 'text-neutral-800 dark:text-slate-400 hover:bg-neutral-100 dark:hover:bg-slate-800'
            }`}
          >
            <AlertCircle className="w-4 h-4" />
            Failed Uploads
          </button>
        </div>
      </nav>
    </div>
  );
}
