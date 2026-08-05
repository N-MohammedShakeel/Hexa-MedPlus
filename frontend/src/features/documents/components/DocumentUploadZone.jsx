import React, { useState } from 'react';
import { Upload, AlertCircle, Loader2, Download, Terminal } from 'lucide-react';
import { Button, Input } from '../../../components/ui';
import Card from '../../../components/ui/Card';
import axiosInstance from '../../../config/axios';

export default function DocumentUploadZone({ selectedCategory, setSelectedCategory, allPatients, refreshDocuments }) {
  const [stagedFile, setStagedFile] = useState(null);
  const [patientSearchTerm, setPatientSearchTerm] = useState('');
  const [mrnInput, setMrnInput] = useState('');
  const [customDocName, setCustomDocName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progressLog, setProgressLog] = useState([]);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setStagedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      setStagedFile(e.target.files[0]);
    }
    e.target.value = ''; // reset so same file can be re-selected
  };

  const doUpload = async (fileToUpload) => {
    const file = fileToUpload || stagedFile;
    if (!file) return;
    if (!mrnInput) {
      alert('Please select a Target Patient MRN before uploading.');
      return;
    }
    // Require custom name for Other Documents
    if ((selectedCategory === 'Other Documents' || !['Clinical Notes','Lab Reports','Imaging','Recent Uploads','Failed Uploads','All Documents'].includes(selectedCategory)) && !customDocName.trim()) {
      alert('Please enter a document name for Other Documents before uploading.');
      return;
    }
    
    const jobId = `job-${Date.now()}`;
    const fileName = file.name;
    setUploading(true);
    setProgressLog([`▶ [${customDocName.trim() || fileName}] Upload starting...`]);

    // Open SSE stream BEFORE posting (backend opens the sink on first subscribe)
    const es = new EventSource(`/api/documents/progress/${jobId}`);
    es.onmessage = (e) => {
      setProgressLog(prev => [...prev, `  ${e.data}`]);
      const data = e.data.toLowerCase();
      if (data.includes('complete') || data.includes('error') || data.includes('failed')) {
        es.close();
        setUploading(false);
        setStagedFile(null);
        setCustomDocName('');
        refreshDocuments();
      }
    };
    es.onerror = () => {
      es.close();
      setUploading(false);
    };

    try {
      const docType = ['All Documents','Recent Uploads','Failed Uploads'].includes(selectedCategory)
        ? 'Other Documents' : selectedCategory;
      // Map category display name → backend documentType enum
      const typeMap = {
        'Clinical Notes': 'CLINICAL_NOTE',
        'Lab Reports': 'LAB_REPORT',
        'Imaging': 'IMAGING',
        'Hospital Guidelines': 'GUIDELINE',
        'Other Documents': 'OTHER',
      };
      const resolvedType = typeMap[docType] || 'OTHER';
      const formData = new FormData();
      formData.append('file', file);
      formData.append('documentType', resolvedType);
      formData.append('mrn', mrnInput);
      if (customDocName.trim()) formData.append('customDocName', customDocName.trim());
      
      await axiosInstance.post(`/api/documents?jobId=${jobId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
    } catch (err) {
      console.error('Upload failed', err);
      setProgressLog(prev => [...prev, `✗ Upload error: ${err.response?.data?.error || err.message}`]);
      es.close();
      setUploading(false);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-primary-600 dark:text-primary-400">Document Processing</h2>
          <p className="text-sm text-neutral-800 dark:text-slate-400 mt-1">
            Upload and process clinical documents with AI assistance
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" icon={Download}>
            Download Template
          </Button>
          <Button icon={Upload} onClick={() => document.getElementById('docWorkspaceFileInput').click()}>
            Upload Files
          </Button>
        </div>
      </div>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
            <Upload className="w-4 h-4 text-primary-600" /> Upload New Document
          </h3>
          {stagedFile && (
            <Button size="sm" onClick={() => doUpload()} disabled={uploading}>
              {uploading ? 'Processing...' : 'Confirm Upload'}
            </Button>
          )}
        </div>

        <div className="space-y-4">
          {stagedFile ? (
            <div className="bg-primary-50 dark:bg-slate-800 border border-primary-200 dark:border-slate-700 rounded-lg p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-primary-900 dark:text-slate-100">{stagedFile.name}</p>
                <p className="text-xs text-primary-700 dark:text-slate-400 mt-1">
                  {(stagedFile.size / 1024 / 1024).toFixed(2)} MB • Ready to upload
                </p>
              </div>
              <Button variant="danger" size="sm" onClick={() => setStagedFile(null)} disabled={uploading}>Remove</Button>
            </div>
          ) : (
            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
                isDragOver
                  ? 'border-primary-500 bg-primary-50 dark:bg-slate-800 dark:border-primary-400'
                  : 'border-neutral-300 dark:border-slate-700 hover:border-primary-400 hover:bg-neutral-50 dark:hover:bg-slate-800'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => document.getElementById('docWorkspaceFileInput').click()}
            >
              <input
                type="file"
                id="docWorkspaceFileInput"
                className="hidden"
                accept=".pdf,.docx,.dicom,.dcm,.doc,.txt,.png,.jpg,.jpeg"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 bg-info-100 rounded-12 flex items-center justify-center">
                  <Upload className="w-6 h-6 text-primary-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-neutral-900 dark:text-slate-200">
                    Drag & drop files here to stage
                  </p>
                  <p className="text-xs text-neutral-800 dark:text-slate-400 mt-1">
                    PDF, DOCX, DICOM supported (Max 50MB)
                  </p>
                </div>
                <p className="text-xs font-medium text-neutral-700 dark:text-slate-500 uppercase tracking-wider mt-2">
                  Or click to browse file
                </p>
              </div>
            </div>
          )}

          <div className="flex gap-4 pt-3 border-t border-neutral-400 dark:border-slate-700">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-neutral-800 dark:text-slate-300 mb-1.5">
                Target Patient <span className="text-danger-500">*</span>
              </label>
              <div className="relative">
                <Input 
                  placeholder="Search patient by name or MRN..." 
                  leftIcon={AlertCircle} 
                  value={patientSearchTerm}
                  onChange={(e) => {
                    setPatientSearchTerm(e.target.value);
                    setMrnInput('');
                  }}
                  required
                />
                {patientSearchTerm && !mrnInput && (
                  <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-800 border border-neutral-300 dark:border-slate-700 rounded-md shadow-lg max-h-48 overflow-y-auto">
                    {allPatients
                      .filter(p => p.name.toLowerCase().includes(patientSearchTerm.toLowerCase()) || p.mrn.toLowerCase().includes(patientSearchTerm.toLowerCase()))
                      .map(p => (
                        <button
                          key={p.id}
                          className="w-full text-left px-4 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-slate-700 text-neutral-900 dark:text-slate-200"
                          onClick={() => {
                            setMrnInput(p.mrn);
                            setPatientSearchTerm(`${p.name} (${p.mrn})`);
                          }}
                        >
                          <span className="font-semibold">{p.name}</span> <span className="text-neutral-500">({p.mrn})</span>
                        </button>
                      ))}
                    {allPatients.filter(p => p.name.toLowerCase().includes(patientSearchTerm.toLowerCase()) || p.mrn.toLowerCase().includes(patientSearchTerm.toLowerCase())).length === 0 && (
                      <div className="px-4 py-2 text-sm text-neutral-500">No matching patients found.</div>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-semibold text-neutral-800 dark:text-slate-300 mb-1.5">
                Document Category
              </label>
              <select 
                className="w-full py-2 px-3 bg-neutral-50 dark:bg-slate-800 border border-neutral-500 dark:border-slate-700 rounded-6 text-sm text-neutral-900 dark:text-slate-200"
                value={selectedCategory === 'All Documents' || selectedCategory === 'Recent Uploads' || selectedCategory === 'Failed Uploads' ? 'Clinical Notes' : selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option>Clinical Notes</option>
                <option>Lab Reports</option>
                <option>Imaging</option>
                <option>Other Documents</option>
              </select>
            </div>
            {(selectedCategory === 'Other Documents' || (!['Clinical Notes','Lab Reports','Imaging','Recent Uploads','Failed Uploads','All Documents'].includes(selectedCategory))) && (
              <div className="flex-1">
                <label className="block text-xs font-semibold text-neutral-800 dark:text-slate-300 mb-1.5">
                  Document Name <span className="text-danger-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Enter a descriptive name for this document..."
                  value={customDocName}
                  onChange={e => setCustomDocName(e.target.value)}
                  className="w-full py-2 px-3 bg-neutral-50 dark:bg-slate-800 border border-neutral-500 dark:border-slate-700 rounded-6 text-sm text-neutral-900 dark:text-slate-200 focus:outline-none focus:border-primary-500"
                />
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* SSE Progress Terminal */}
      {progressLog.length > 0 && (
        <Card>
          <div className="flex items-center gap-2 mb-3">
            <Terminal className="w-4 h-4 text-neutral-600 dark:text-slate-400" />
            <h3 className="text-xs font-semibold text-neutral-900 dark:text-slate-100 uppercase tracking-wider">
              Processing Log
            </h3>
            {uploading && <Loader2 className="w-3.5 h-3.5 animate-spin text-primary-500 ml-auto" />}
            {!uploading && <button onClick={() => setProgressLog([])} className="ml-auto text-xs text-neutral-500 hover:text-neutral-700">Clear</button>}
          </div>
          <div className="bg-slate-900 rounded-4 p-4 font-mono text-xs space-y-1.5 max-h-44 overflow-y-auto">
            {progressLog.map((line, i) => (
              <div key={i} className={`leading-relaxed ${
                line.includes('⚠') ? 'text-amber-400'
                : line.includes('✗') || line.includes('error') || line.includes('Error') ? 'text-red-400'
                : line.includes('complete') || line.includes('Complete') ? 'text-green-400'
                : 'text-slate-300'
              }`}>{line}</div>
            ))}
          </div>
        </Card>
      )}
    </>
  );
}