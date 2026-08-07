import React, { useState, useEffect } from 'react';
import { UploadCloud, File, AlertCircle, CheckCircle, FileText, Beaker, Image as ImageIcon, Shield, Folder, RefreshCw, Trash2 } from 'lucide-react';
import axiosInstance from '../../../config/axios';
import { Card } from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import StatusBadge from '../../../components/ui/Badge';
import EmptyState from '../../../components/ui/EmptyState';
import { useConfirm } from '../../../contexts/ConfirmContext';
import { notifyError } from '../../../common/utils/toast';

const DOCUMENT_TYPES = [
    { value: 'GUIDELINE', label: 'Clinical Protocol / Guideline', category: 'Clinical Protocol', icon: Shield },
    { value: 'LAB_REPORT', label: 'Lab Report', category: 'Lab Report', icon: Beaker },
    { value: 'IMAGING', label: 'Imaging Report', category: 'Imaging Report', icon: ImageIcon },
    { value: 'DISCHARGE', label: 'Discharge Summary', category: 'Discharge Summary', icon: FileText },
    { value: 'OTHER', label: 'Other Document', category: 'Other Documents', icon: Folder },
];

export default function DocumentUploadPage() {
    const [file, setFile] = useState(null);
    const [documentType, setDocumentType] = useState('GUIDELINE');
    const [uploading, setUploading] = useState(false);
    const [status, setStatus] = useState(null);
    const [progressEvents, setProgressEvents] = useState([]);
    const [isDragging, setIsDragging] = useState(false);
    const [documents, setDocuments] = useState([]);
    const [docsLoading, setDocsLoading] = useState(false);
    const [activeFilter, setActiveFilter] = useState('All');
    const fileInputRef = React.useRef(null);
    const confirm = useConfirm();

    const fetchDocuments = async (category = null) => {
        setDocsLoading(true);
        try {
            const url = category && category !== 'All'
                ? `/api/documents?category=${encodeURIComponent(category)}`
                : '/api/documents';
            const res = await axiosInstance.get(url);
            setDocuments(res.data || []);
        } catch (err) {
            console.error('Failed to load documents:', err);
            notifyError('Failed to load documents.');
        } finally {
            setDocsLoading(false);
        }
    };

    useEffect(() => {
        fetchDocuments();
    }, []);

    const handleFilterChange = (filter) => {
        setActiveFilter(filter);
        fetchDocuments(filter === 'All' ? null : filter);
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setStatus(null);
            setProgressEvents([]);
        }
    };

    const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
    const handleDragLeave = (e) => { e.preventDefault(); setIsDragging(false); };
    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            setFile(e.dataTransfer.files[0]);
            setStatus(null);
            setProgressEvents([]);
        }
    };
    const handleClickArea = () => { if (fileInputRef.current) fileInputRef.current.click(); };

    const handleUpload = async () => {
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);
        formData.append('documentType', documentType);

        const jobId = crypto.randomUUID();
        const eventSource = new EventSource(`/api/documents/progress/${jobId}`);

        eventSource.onmessage = (event) => {
            setProgressEvents(prev => [...prev, event.data]);
            if (event.data.toLowerCase().includes('complete')) {
                eventSource.close();
            }
        };
        eventSource.onerror = () => { eventSource.close(); };

        try {
            setUploading(true);
            setStatus('uploading');
            setProgressEvents([]);
            await axiosInstance.post(`/api/documents?jobId=${jobId}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setStatus('success');
            setFile(null);
            // Refresh document list after upload
            fetchDocuments(activeFilter === 'All' ? null : activeFilter);
        } catch (error) {
            console.error('Upload failed:', error);
            setStatus('error');
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (id) => {
        const ok = await confirm('Are you sure you want to delete this document?');
        if (!ok) return;
        try {
            await axiosInstance.delete(`/api/documents/${id}`);
            setDocuments(prev => prev.filter(d => d.id !== id));
        } catch (err) {
            console.error('Failed to delete document:', err);
            notifyError('Failed to delete document.');
        }
    };

    const selectedType = DOCUMENT_TYPES.find(t => t.value === documentType) || DOCUMENT_TYPES[0];
    const filterTabs = ['All', ...DOCUMENT_TYPES.map(t => t.category)];

    return (
        <div className="p-8 max-w-5xl mx-auto animate-fade-in">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-neutral-900 dark:text-slate-100">
                    Document Knowledge Base
                </h1>
                <p className="text-neutral-600 dark:text-slate-400 mt-2">
                    Upload clinical guidelines, lab reports, imaging, or other documents.
                    Clinical protocols are ingested into the AI Engine's RAG vector database.
                </p>
            </div>

            {/* Upload Card */}
            <Card padding="lg" className={`border-2 border-dashed transition-colors cursor-pointer mb-8 ${
                isDragging
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-neutral-300 dark:border-slate-700 bg-neutral-50 dark:bg-slate-800/50 hover:bg-neutral-100 dark:hover:bg-slate-800'
            }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={handleClickArea}
            >
                <div className="text-center pointer-events-none">
                    <UploadCloud className="w-10 h-10 text-primary-600 dark:text-primary-400 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-neutral-900 dark:text-slate-100">Upload Document</h3>
                    <p className="text-sm text-neutral-600 dark:text-slate-400 mt-1 mb-4">
                        Drag and drop a PDF or image here, or click to browse.
                    </p>

                    {/* Document Type Selector */}
                    <div className="flex justify-center mb-5 pointer-events-auto" onClick={e => e.stopPropagation()}>
                        <div>
                            <label className="block text-xs font-semibold text-neutral-700 dark:text-slate-300 mb-1.5 text-left">Document Type</label>
                            <select
                                value={documentType}
                                onChange={e => setDocumentType(e.target.value)}
                                className="w-64 px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-6 text-sm text-neutral-700 dark:text-slate-200 focus:outline-none focus:border-primary-500"
                            >
                                {DOCUMENT_TYPES.map(t => (
                                    <option key={t.value} value={t.value}>{t.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="flex justify-center mb-4 pointer-events-auto">
                        <input
                            type="file"
                            accept=".pdf,.png,.jpg,.jpeg"
                            onChange={handleFileChange}
                            className="hidden"
                            ref={fileInputRef}
                        />
                        <span className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-6 shadow-sm text-sm font-semibold text-neutral-700 dark:text-slate-200 hover:bg-neutral-50 dark:hover:bg-slate-600 transition-colors">
                            Select File
                        </span>
                    </div>

                    {file && (
                        <div
                            className="max-w-md mx-auto bg-white dark:bg-slate-900 p-4 rounded-8 shadow-sm border border-neutral-200 dark:border-slate-700 flex items-center justify-between pointer-events-auto"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center gap-3 overflow-hidden">
                                <File className="w-6 h-6 text-primary-500 shrink-0" />
                                <div className="truncate text-left">
                                    <p className="text-sm font-medium text-neutral-900 dark:text-slate-200 truncate">{file.name}</p>
                                    <p className="text-xs text-neutral-500 dark:text-slate-400">{(file.size / 1024 / 1024).toFixed(2)} MB · {selectedType.label}</p>
                                </div>
                            </div>
                            <Button variant="primary" size="sm" onClick={handleUpload} disabled={uploading}>
                                {uploading ? 'Processing...' : 'Upload & Process'}
                            </Button>
                        </div>
                    )}

                    {/* SSE Progress Log — shown as soon as events arrive */}
                    {progressEvents.length > 0 && (
                        <div className="max-w-md mx-auto mt-4 text-left bg-neutral-900 rounded-8 p-4 font-mono text-xs text-success-500 border border-neutral-700 shadow-inner h-32 overflow-y-auto flex flex-col">
                            {progressEvents.map((msg, idx) => (
                                <div key={idx} className="mb-1 animate-fade-in">&gt; {msg}</div>
                            ))}
                            {uploading && <div className="animate-pulse">&gt; _</div>}
                        </div>
                    )}

                    {status === 'success' && (
                        <div className="mt-4 flex items-center justify-center gap-2 text-success-600 dark:text-success-500">
                            <CheckCircle className="w-5 h-5" />
                            <span className="text-sm font-medium">Document successfully uploaded and processed!</span>
                        </div>
                    )}
                    {status === 'error' && (
                        <div className="mt-4 flex items-center justify-center gap-2 text-danger-600 dark:text-danger-500">
                            <AlertCircle className="w-5 h-5" />
                            <span className="text-sm font-medium">Upload failed. Make sure document-service is running.</span>
                        </div>
                    )}
                </div>
            </Card>

            {/* Documents List */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-neutral-900 dark:text-slate-100">Uploaded Documents</h2>
                    <button onClick={() => fetchDocuments(activeFilter === 'All' ? null : activeFilter)} className="flex items-center gap-1.5 text-sm text-neutral-500 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
                        <RefreshCw className="w-3.5 h-3.5" /> Refresh
                    </button>
                </div>

                {/* Filter Tabs */}
                <div className="flex gap-2 mb-4 flex-wrap">
                    {filterTabs.map(tab => (
                        <button
                            key={tab}
                            onClick={() => handleFilterChange(tab)}
                            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                                activeFilter === tab
                                    ? 'bg-primary-600 text-white border-primary-600'
                                    : 'bg-white dark:bg-slate-800 text-neutral-600 dark:text-slate-400 border-neutral-300 dark:border-slate-600 hover:border-primary-400'
                            }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                {docsLoading ? (
                    <div className="text-center text-neutral-400 dark:text-slate-500 py-8">Loading documents...</div>
                ) : documents.length === 0 ? (
                    <EmptyState
                        icon={Folder}
                        title="No documents found"
                        description={activeFilter !== 'All' ? `No documents in "${activeFilter}".` : 'Upload a document to get started.'}
                        className="border-2 border-dashed border-neutral-200 dark:border-slate-700 rounded-8"
                    />
                ) : (
                    <div className="space-y-2">
                        {documents.map(doc => {
                            const TypeIcon = DOCUMENT_TYPES.find(t => t.category === doc.category)?.icon || FileText;
                            return (
                                <div key={doc.id} className="flex items-center gap-4 p-4 bg-white dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 rounded-8 hover:border-primary-300 transition-colors">
                                    <TypeIcon className="w-5 h-5 text-primary-600 dark:text-primary-400 shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-neutral-900 dark:text-slate-200 truncate">{doc.fileName}</p>
                                        <p className="text-xs text-neutral-500 dark:text-slate-400 mt-0.5">
                                            {doc.category} · {doc.fileSize ? `${(doc.fileSize / 1024).toFixed(0)} KB` : 'Unknown size'} · {doc.status}
                                        </p>
                                    </div>
                                    <StatusBadge status={doc.status === 'COMPLETED' ? 'success' : 'warning'} label={doc.status} />
                                    <button onClick={() => handleDelete(doc.id)} className="p-1.5 text-neutral-600 dark:text-slate-400 hover:text-danger-500 hover:bg-danger-50 dark:hover:bg-danger-500/10 rounded-6 transition-colors">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
