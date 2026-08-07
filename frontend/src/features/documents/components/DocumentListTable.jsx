import React from 'react';
import { Loader2, AlertTriangle, CheckCircle, Trash2, FileText, Clock } from 'lucide-react';
import Card from '../../../components/ui/Card';
import StatusBadge from '../../../components/ui/Badge';

export default function DocumentListTable({ selectedCategory, filteredDocs, loading, handleRowClick, handleDelete }) {
  return (
    <Card padding="none" className="overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-800 border-b border-neutral-500 dark:border-slate-700">
        <h3 className="text-xs font-semibold text-neutral-900 dark:text-slate-100 uppercase tracking-wider">
          {selectedCategory}
        </h3>
        <span className="px-2 py-0.5 bg-neutral-300 dark:bg-slate-700 rounded-2 text-xs font-medium text-neutral-800 dark:text-slate-300">
          {filteredDocs.length} documents
        </span>
      </div>
      <div className="overflow-y-auto max-h-[400px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary-500 mb-4" />
            <p className="text-sm text-neutral-600">Loading documents...</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-500 dark:border-slate-700 bg-neutral-100 dark:bg-slate-800/50">
                <th className="text-left px-4 py-2 text-xs font-medium text-neutral-800 dark:text-slate-300">Document</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-neutral-800 dark:text-slate-300">Patient MRN</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-neutral-800 dark:text-slate-300">Type</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-neutral-800 dark:text-slate-300">Status</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-neutral-800 dark:text-slate-300">Verified</th>
                <th className="text-right px-4 py-2 text-xs font-medium text-neutral-800 dark:text-slate-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDocs.length > 0 ? filteredDocs.map((doc) => (
                <tr
                  key={doc.id}
                  onClick={() => handleRowClick(doc)}
                  className={`border-b border-neutral-400 dark:border-slate-700/50 cursor-pointer hover:shadow-md transition-shadow ${
                    doc.status === 'COMPLETED'
                      ? 'bg-white dark:bg-slate-900 hover:bg-neutral-50 dark:hover:bg-slate-800'
                      : ['PROCESSING', 'AI_PROCESSING', 'REQUIRES_VERIFICATION'].includes(doc.status)
                      ? 'bg-white dark:bg-slate-900 hover:bg-neutral-50 dark:hover:bg-slate-800'
                      : doc.status === 'FAILED'
                      ? 'bg-danger-50 dark:bg-danger-900/10 opacity-90'
                      : 'bg-neutral-50 dark:bg-slate-800/30 opacity-80 hover:bg-neutral-100 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {doc.status === 'FAILED' && (
                        <AlertTriangle className="w-4 h-4 text-danger-500" />
                      )}
                      {doc.identityMismatch && (
                        <AlertTriangle className="w-4 h-4 text-danger-500" title="Patient identity mismatch detected — click to review" />
                      )}
                      <span className="text-sm text-neutral-900 dark:text-slate-200 font-medium">
                        {doc.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs text-neutral-800 dark:text-slate-300 font-medium">
                      {doc.mrn}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-1.5 py-0.5 bg-neutral-300 dark:bg-slate-700 rounded-2 text-xs font-medium text-neutral-800 dark:text-slate-300">
                      {doc.type}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {doc.status === 'AI_PROCESSING' ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-primary-500" />
                        <span className="text-xs font-semibold text-primary-500 dark:text-primary-400">
                          AI Analysis Running...
                        </span>
                      </div>
                    ) : ['PROCESSING', 'REQUIRES_VERIFICATION', 'PENDING'].includes(doc.status) ? (
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-neutral-400" />
                        <span className="text-xs font-semibold text-neutral-500 dark:text-slate-400">Pending</span>
                      </div>
                    ) : doc.status === 'COMPLETED' ? (
                      <StatusBadge status="success" label="Completed" />
                    ) : doc.status === 'FAILED' ? (
                      <StatusBadge status="danger" label="Failed" />
                    ) : doc.status === 'BLUR_DETECTED' ? (
                      <StatusBadge status="warning" label="Blur Detected" />
                    ) : (
                      <span className="px-2 py-0.5 bg-neutral-200 dark:bg-slate-700 rounded-2 text-xs font-medium text-neutral-600 dark:text-slate-400">{doc.status}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {doc.status !== 'COMPLETED' ? (
                      <StatusBadge status="neutral" label="Pending" />
                    ) : doc.verified ? (
                      <StatusBadge status="success" label="Verified" />
                    ) : (
                      <StatusBadge status="warning" label="Verify Now" />
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(doc.id); }} className="text-neutral-600 dark:text-slate-400 hover:text-danger-500 transition-colors p-1" title="Delete Document">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center text-sm text-neutral-600 dark:text-slate-400">
                    No documents found in this category.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </Card>
  );
}