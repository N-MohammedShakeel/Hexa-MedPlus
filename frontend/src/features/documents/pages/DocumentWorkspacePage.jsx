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
import { updateBatchPhaseByFileKey } from '../../../store/slices/uploadSlice';

export default function DocumentWorkspacePage() {
  const dispatch = useDispatch();
  const allPatients = useSelector(selectAllPatients);
  const patientStatus = useSelector(selectPatientStatus);
  const [selectedCategory, setSelectedCategory] = useState('All Documents');
  const [patientSearch, setPatientSearch] = useState('');
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
  const handleAnalysisComplete = (fileKey, success = true) => {
    setReanalyzingFileKeys(prev => {
      const next = new Set(prev);
      next.delete(fileKey);
      return next;
    });
    // If this document also has an entry in the Upload Progress panel (e.g. the
    // doctor resolved the blur annotation without leaving the page), reflect the
    // real outcome there too — its own status polling already stopped the
    // moment it first hit BLUR_DETECTED, so nothing else will update it.
    if (fileKey) {
      dispatch(updateBatchPhaseByFileKey({ fileKey, phase: success ? 'done' : 'failed' }));
    }
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

  // Guideline/protocol uploads live in the Clinical Protocols workflow — they
  // aren't patient documents and shouldn't show up in this workspace's list.
  // Archived patients' documents are also excluded — `allPatients` (selectAllPatients)
  // only ever contains non-archived patients (clinicalService.getPatients() defaults
  // to archived=false), so this is a reliable active-patient membership check.
  const mapDocs = (data, visionByFileKey) => data
    .filter(doc => doc.documentType !== 'GUIDELINE' && allPatients.some(p => p.mrn === doc.targetMrn))
    .map(doc => {
    const vision = visionByFileKey.get(doc.fileKey);
    return {
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
      aiVerified: false,
      verified: vision?.verified || false,
      identityMismatch: (vision?.identityCheckStatus === 'mismatch' && !vision?.identityConfirmed) || false,
    };
  });

  // Small, best-effort join against ai-service's vision results (verified status,
  // identity mismatch flag) so the document list can show both without opening
  // each document — failure here shouldn't block the document list from loading.
  const fetchVisionResultsMap = async () => {
    try {
      const { data } = await axiosInstance.get('/api/ai/vision/results');
      return new Map(data.map(r => [r.fileKey, { verified: r.verified, identityCheckStatus: r.identityCheckStatus, identityConfirmed: r.identityConfirmed }]));
    } catch (error) {
      console.error("Failed to fetch vision results:", error);
      return new Map();
    }
  };

  React.useEffect(() => {
    const fetchDocs = async () => {
      try {
        const [data, visionMap] = await Promise.all([clinicalService.getDocuments(), fetchVisionResultsMap()]);
        setDocuments(mapDocs(data, visionMap));
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
      const [data, visionMap] = await Promise.all([clinicalService.getDocuments(), fetchVisionResultsMap()]);
      setDocuments(mapDocs(data, visionMap));
    } catch (error) {
      console.error("Failed to refresh documents:", error);
    }
  };

  // Auto-refresh document list if any document is processing or blur_detected
  React.useEffect(() => {
    const hasPendingDocs = documents.some(doc => ['PROCESSING', 'AI_PROCESSING', 'BLUR_DETECTED', 'REQUIRES_VERIFICATION'].includes(doc.status));
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
    if (selectedCategory !== 'All Documents' && doc.category !== selectedCategory) return false;
    if (patientSearch.trim()) {
      const term = patientSearch.trim().toLowerCase();
      const patient = allPatients.find(p => p.mrn === doc.mrn);
      const matchesMrn = doc.mrn?.toLowerCase().includes(term);
      const matchesName = patient?.name?.toLowerCase().includes(term);
      if (!matchesMrn && !matchesName) return false;
    }
    return true;
  });


  return (
    <div className="flex h-[calc(100vh-64px)] animate-fade-in">
      {/* Left Sidebar */}
      <DocumentFilters
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        patientSearch={patientSearch}
        setPatientSearch={setPatientSearch}
        patients={allPatients}
      />

      {/* Main Workspace */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-[930px] mx-auto space-y-6">

          <DocumentUploadZone 
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