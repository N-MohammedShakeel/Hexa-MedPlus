import React, { useState } from 'react';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import { UploadCloud, FileText, CheckCircle } from 'lucide-react';
import { clinicalService } from '../../../services/api/clinicalService';

export default function HospitalPoliciesPage() {
  const [file, setFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState('idle'); // idle, uploading, success, error

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setUploadStatus('idle');
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploadStatus('uploading');
    try {
      await clinicalService.uploadDocument(file, 'PROTOCOL_OVERRIDE', 'ALL_PATIENTS');
      setUploadStatus('success');
      setFile(null); // Clear file after success
    } catch (error) {
      console.error("Upload failed:", error);
      setUploadStatus('error');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">Hospital Policies & Overrides</h1>
        <p className="text-neutral-600 dark:text-slate-400">
          Upload custom internal policies to securely blend with official medical guidelines in the clinical workflow.
        </p>
      </div>

      <Card padding="lg" className="border border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-900">
        <div className="mb-6">
          <h2 className="text-lg font-bold text-neutral-900 dark:text-slate-100 mb-1">Upload New Policy</h2>
          <p className="text-sm text-neutral-500 dark:text-slate-400">Supported format: PDF</p>
        </div>

        <div className="border-2 border-dashed border-neutral-300 dark:border-slate-600 rounded-xl p-10 flex flex-col items-center justify-center bg-neutral-50 dark:bg-slate-800/50 mb-6 transition-colors hover:border-primary-400 dark:hover:border-primary-500">
          <UploadCloud className="w-12 h-12 text-primary-500 mb-4" />
          <h3 className="text-base font-medium text-neutral-900 dark:text-slate-200 mb-2">Select a file to upload</h3>
          <p className="text-sm text-neutral-500 dark:text-slate-400 text-center max-w-sm mb-6">
            Files uploaded here will be processed by the AI RAG engine and applied automatically to relevant clinical notes.
          </p>
          
          <input 
            type="file" 
            id="file-upload" 
            className="hidden" 
            accept="application/pdf"
            onChange={handleFileChange}
          />
          <label htmlFor="file-upload">
            <span className="cursor-pointer bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 px-4 py-2 rounded-lg text-sm font-medium text-neutral-700 dark:text-slate-200 hover:bg-neutral-100 dark:hover:bg-slate-600 shadow-sm transition-colors">
              Browse Files
            </span>
          </label>
        </div>

        {file && (
          <div className="flex items-center justify-between p-4 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-lg mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white dark:bg-slate-800 rounded shadow-sm">
                <FileText className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-neutral-900 dark:text-slate-200">{file.name}</p>
                <p className="text-xs text-neutral-500 dark:text-slate-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            </div>
            
            <Button 
              onClick={handleUpload} 
              disabled={uploadStatus === 'uploading'}
              className="bg-primary-600 hover:bg-primary-700 text-white"
            >
              {uploadStatus === 'uploading' ? 'Uploading...' : 'Confirm Upload'}
            </Button>
          </div>
        )}

        {uploadStatus === 'success' && (
          <div className="flex items-center gap-2 text-sm text-success-700 dark:text-success-400 bg-success-50 dark:bg-success-900/30 p-4 rounded-lg border border-success-200 dark:border-success-800/50">
            <CheckCircle className="w-5 h-5" />
            Policy uploaded successfully! The AI engine is currently processing the vectors.
          </div>
        )}
        
        {uploadStatus === 'error' && (
          <div className="text-sm text-danger-700 dark:text-danger-400 bg-danger-50 dark:bg-danger-900/30 p-4 rounded-lg border border-danger-200 dark:border-danger-800/50">
            Failed to upload policy. Ensure backend services are running.
          </div>
        )}
      </Card>
    </div>
  );
}
