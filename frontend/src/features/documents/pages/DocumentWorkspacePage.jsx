import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { selectAllPatients, fetchPatients, selectPatientStatus } from '../../../store/slices/patientSlice';
import { clinicalService } from '../../../services/api/clinicalService';
import axiosInstance from '../../../config/axios';
import DocumentFilters from '../components/DocumentFilters';
import DocumentUploadZone from '../components/DocumentUploadZone';
import DocumentListTable from '../components/DocumentListTable';
import BlurAnnotationModal from '../components/BlurAnnotationModal';
import DocumentViewModal from '../components/DocumentViewModal';
import { useConfirm } from '../../../contexts/ConfirmContext';
import { notifyError } from '../../../common/utils/toast';

export default function DocumentWorkspacePage() {
  const dispatch = useDispatch();
  const allPatients = useSelector(selectAllPatients);
  const patientStatus = useSelector(selectPatientStatus);
  const [selectedCategory, setSelectedCategory] = useState('All Documents');
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [docAiResult, setDocAiResult] = useState(null);
  const [loadingAiResult, setLoadingAiResult] = useState(false);
  
  // Object URL mapping for fetched blobs
  const [docBlobUrl, setDocBlobUrl] = useState(null);
  // analyzingStates: { [aiResultId]: { isAnalyzing: bool, inputs: [] } }
  const [analyzingStates, setAnalyzingStates] = useState({});
  // reanalyzingFileKeys: set of fileKeys currently being reanalyzed (for document list spinner)
  const [reanalyzingFileKeys, setReanalyzingFileKeys] = useState(new Set());
  const confirm = useConfirm();
  // Ref so polling closure can always read current reanalyzingFileKeys
  const reanalyzingRef = React.useRef(reanalyzingFileKeys);
  React.useEffect(() => { reanalyzingRef.current = reanalyzingFileKeys; }, [reanalyzingFileKeys]);

  useEffect(() => {
    if (!selectedDoc) {
      setDocBlobUrl(null);
      return;
    }
    let objectUrl = null;
    let isActive = true;
    const fetchBlob = async () => {
      try {
        const fileKeyToFetch = selectedDoc.fileKey || selectedDoc.name;
        const token = localStorage.getItem('jwt_token');
        const response = await fetch(`/api/documents/download?fileKey=${encodeURIComponent(fileKeyToFetch)}`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        const blob = await response.blob();
        if (!isActive) return;
        let type = blob.type;
        if (fileKeyToFetch.toLowerCase().endsWith('.pdf')) type = 'application/pdf';
        const typedBlob = new Blob([blob], { type });
        objectUrl = URL.createObjectURL(typedBlob);
        setDocBlobUrl(objectUrl);
      } catch (err) {
        console.error("Failed to load document blob:", err);
      }
    };
    fetchBlob();
    return () => {
      isActive = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [selectedDoc]);

  const handleRowClick = (doc) => {
    // Don't open blur annotation if reanalysis is already in flight for this doc
    setSelectedDoc(doc);
  };

  // Called from BlurAnnotationModal when user clicks "Start Analyzing"
  const handleAnalysisStarted = (fileKey, aiResultId) => {
    setReanalyzingFileKeys(prev => new Set([...prev, fileKey]));
    // After reanalysis completes, polling will update docAiResult and remove the spinner
  };

  // Called from BlurAnnotationModal's reanalyze async call completion
  const handleAnalysisComplete = (fileKey) => {
    setReanalyzingFileKeys(prev => {
      const next = new Set(prev);
      next.delete(fileKey);
      return next;
    });
    // Refresh document list so status column reflects COMPLETED
    refreshDocuments();
  };

  useEffect(() => {
    if (!selectedDoc) {
      setDocAiResult(null);
      return;
    }

    let intervalId = null;
    let isPolling = true;

    const loadAiResult = async () => {
      if (!isPolling) return;
      
      try {
        const { data } = await axiosInstance.get('/api/ai/vision/results/' + selectedDoc.mrn);
        const match = data.find(r => 
          r.documentId === selectedDoc.id ||
          r.fileKey === selectedDoc.fileKey ||
          r.fileKey === selectedDoc.name // fallback
        );

        if (match) {
          setDocAiResult(match);
          setLoadingAiResult(false);
          // Only stop polling if this document is NOT currently being reanalyzed
          if (!reanalyzingRef.current.has(selectedDoc.fileKey)) {
            isPolling = false;
            if (intervalId) clearInterval(intervalId);
          }
          // else: keep polling so we catch the fresh result after re-analysis completes
        } else {
          // Keep polling, keep loading state true
          setDocAiResult(null);
          setLoadingAiResult(true);
        }
      } catch (err) {
        console.error('Failed to load AI result:', err);
        setDocAiResult(null);
        setLoadingAiResult(false);
      }
    };

    loadAiResult();
    intervalId = setInterval(loadAiResult, 3000);

    return () => {
      isPolling = false;
      if (intervalId) clearInterval(intervalId);
    };
  }, [selectedDoc]);

  React.useEffect(() => {
    if (patientStatus === 'idle') {
      dispatch(fetchPatients());
    }
  }, [patientStatus, dispatch]);

  React.useEffect(() => {
    const fetchDocs = async () => {
      try {
        const data = await clinicalService.getDocuments();
        setDocuments(data.map(doc => ({
          id: doc.id,
          name: doc.fileName,
          fileKey: doc.fileKey,
          type: doc.documentType,
          size: doc.fileSize ? (doc.fileSize / 1024 / 1024).toFixed(1) + ' MB' : 'Unknown',
          status: doc.status,
          statusColor: doc.status === 'COMPLETED' ? 'success' : doc.status === 'FAILED' ? 'danger' : 'info',
          category: doc.category,
          date: new Date(doc.uploadedAt).toISOString().split('T')[0],
          mrn: doc.targetMrn,
          patientGender: doc.patientGender || '',
          aiVerified: false
        })));
      } catch (error) {
        console.error("Failed to fetch documents:", error);
        notifyError('Failed to load documents.');
      } finally {
        setLoading(false);
      }
    };
    fetchDocs();
  }, []);

  const refreshDocuments = async () => {
    try {
      const data = await clinicalService.getDocuments();
      setDocuments(data.map(doc => ({
        id: doc.id,
        name: doc.fileName,
        fileKey: doc.fileKey,
        type: doc.documentType,
        size: doc.fileSize ? (doc.fileSize / 1024 / 1024).toFixed(1) + ' MB' : 'Unknown',
        status: doc.status,
        statusColor: doc.status === 'COMPLETED' ? 'success' : doc.status === 'FAILED' ? 'danger' : 'info',
        category: doc.category,
        date: new Date(doc.uploadedAt).toISOString().split('T')[0],
        mrn: doc.targetMrn,
        patientGender: doc.patientGender || '',
        aiVerified: false
      })));
    } catch (error) {
      console.error("Failed to refresh documents:", error);
    }
  };

  // Auto-refresh document list if any document is processing or blur_detected
  React.useEffect(() => {
    const hasPendingDocs = documents.some(doc => doc.status === 'PROCESSING' || doc.status === 'BLUR_DETECTED' || doc.status === 'REQUIRES_VERIFICATION');
    if (!hasPendingDocs) return;

    const interval = setInterval(() => {
      refreshDocuments();
    }, 8000);

    return () => clearInterval(interval);
  }, [documents]);

  const handleDelete = async (docId) => {
    const ok = await confirm('Are you sure you want to delete this document?');
    if (!ok) return;
    try {
      const docToDelete = documents.find(d => d.id === docId);
      await axiosInstance.delete(`/api/documents/${docId}`);
      // Cascade delete the corresponding vision AI record
      if (docToDelete?.fileKey) {
        try {
          await axiosInstance.delete(`/api/ai/vision/results/by-file-key/${encodeURIComponent(docToDelete.fileKey)}`);
        } catch (e) {
          console.warn('Could not cascade delete vision record', e);
        }
      }
      refreshDocuments();
    } catch (err) {
      console.error('Failed to delete document', err);
      notifyError('Failed to delete document.');
    }
  };

  const filteredDocs = documents.filter(doc => {
    if (selectedCategory === 'All Documents') return true;
    if (selectedCategory === 'Recent Uploads') return doc.status === 'PENDING' || doc.status === 'PROCESSING';
    if (selectedCategory === 'Failed Uploads') return doc.status === 'FAILED' || doc.status === 'REQUIRES_VERIFICATION';
    return doc.category === selectedCategory;
  });


  return (
    <div className="flex h-[calc(100vh-64px)] animate-fade-in">
      {/* Left Sidebar */}
      <DocumentFilters 
        selectedCategory={selectedCategory} 
        setSelectedCategory={setSelectedCategory} 
        onUploadClick={() => document.getElementById('docWorkspaceFileInput')?.click()}
      />

      {/* Main Workspace */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-[930px] mx-auto space-y-6">

          <DocumentUploadZone 
            selectedCategory={selectedCategory} 
            setSelectedCategory={setSelectedCategory} 
            allPatients={allPatients} 
            refreshDocuments={refreshDocuments} 
          />

          {/* Processing Queue */}
          <DocumentListTable 
            selectedCategory={selectedCategory} 
            filteredDocs={filteredDocs} 
            loading={loading} 
            handleRowClick={handleRowClick} 
            handleDelete={handleDelete}
            reanalyzingFileKeys={reanalyzingFileKeys}
          />
        </div>
      </div>

      {/* Document View Modal */}
      {selectedDoc && (() => {
        // Determine if this doc is currently being reanalyzed
        const isReanalyzing = selectedDoc?.fileKey && reanalyzingFileKeys.has(selectedDoc.fileKey);
        // Show BlurAnnotationModal only if: DB says needs_blur_annotation AND no doctor inputs yet AND NOT currently reanalyzing
        // We use needsBlurAnnotation (mapped from DB needs_blur_annotation) as the source of truth.
        // This ensures that after reanalysis (which sets needs_blur_annotation=False in DB), we never reopen blur modal.
        // Fallback for old records (where needsBlurAnnotation is null): check blurryRegions.length
        const needsAnnotation = (
            docAiResult?.needsBlurAnnotation === true ||
            (docAiResult?.needsBlurAnnotation == null && docAiResult?.blurryRegions?.length > 0)
          )
          && (!docAiResult?.blurDoctorInputs || docAiResult?.blurDoctorInputs?.length === 0)
          && !isReanalyzing;

        if (needsAnnotation) {
          return (
            <BlurAnnotationModal 
              doc={selectedDoc}
              docAiResult={docAiResult}
              setDocAiResult={setDocAiResult}
              docBlobUrl={docBlobUrl}
              onClose={() => setSelectedDoc(null)}
              analyzingStates={analyzingStates}
              setAnalyzingStates={setAnalyzingStates}
              onAnalysisStarted={handleAnalysisStarted}
              onAnalysisComplete={handleAnalysisComplete}
            />
          );
        }
        return (
          <DocumentViewModal 
            selectedDoc={selectedDoc}
            setSelectedDoc={setSelectedDoc}
            docAiResult={docAiResult}
            setDocAiResult={setDocAiResult}
            docBlobUrl={docBlobUrl}
            loadingAiResult={loadingAiResult || isReanalyzing}
            reanalyzing={isReanalyzing}
            setDocuments={setDocuments}
          />
        );
      })()}
    </div>
  );
}