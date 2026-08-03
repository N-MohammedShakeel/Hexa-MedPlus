import React, { useState, useEffect } from "react";
import { clinicalService } from "../services/api/clinicalService";
import axiosInstance from "../config/axios";

import ProtocolList from "../features/protocols/components/ProtocolList";
import ProtocolDetailsPane from "../features/protocols/components/ProtocolDetailsPane";

const SPECIALTY_TAGS = [
  "All",
  "Cardiology",
  "Emergency",
  "Neurology",
  "Oncology",
  "Endocrinology",
  "Pulmonology",
  "General Medicine",
];

export default function ClinicalProtocolsPage() {
  const [protocols, setProtocols] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProtocol, setSelectedProtocol] = useState(null);
  const [activeSpecialty, setActiveSpecialty] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [showUploadPanel, setShowUploadPanel] = useState(false);
  const [ragStatus, setRagStatus] = useState(null);
  const [ragLoading, setRagLoading] = useState(false);

  const fetchRagStatus = async () => {
    setRagLoading(true);
    try {
      const res = await axiosInstance.get('/api/ai/rag/status');
      setRagStatus(res.data);
    } catch (err) {
      // Fallback: derive from protocol list
      setRagStatus(null);
    } finally {
      setRagLoading(false);
    }
  };

  const fetchProtocols = async () => {
    try {
      setLoading(true);
      // Only fetch GUIDELINE-type documents (category = "Clinical Protocol")
      const docs = await clinicalService.getDocuments("Clinical Protocol");
      const mapped = docs.map((doc) => ({
        id: doc.id,
        title: doc.fileName.replace(/\.[^/.]+$/, ""),
        specialty: doc.specialty || "General Medicine",
        status: doc.status === "RETIRED" ? "Retired" : doc.status === "COMPLETED" ? "Active" : "Under Review",
        statusColor: doc.status === "RETIRED" ? "default" : doc.status === "COMPLETED" ? "success" : "warning",
        grade: "A",
        source: "Hospital Knowledge Base",
        lastUpdated: new Date(doc.uploadedAt).toISOString().split("T")[0],
        vectorized: doc.status === "COMPLETED",
        description:
          "Hospital clinical guideline ingested into the AI RAG knowledge base. This document influences AI-generated diagnoses and treatment pathways.",
        mrn: doc.targetMrn,
        fileName: doc.fileName,
        fileKey: doc.fileKey,
        version: doc.version || 1,
        expiryDate: doc.expiryDate,
        retiredAt: doc.retiredAt,
        isRetired: doc.status === "RETIRED",
      }));
      setProtocols(mapped);
    } catch (err) {
      console.error("Failed to fetch protocols:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProtocols();
    fetchRagStatus();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this guideline? It will be removed from the AI knowledge base.")) return;
    try {
      await clinicalService.deleteDocument(id);
      setProtocols((prev) => prev.filter((p) => p.id !== id));
      if (selectedProtocol?.id === id) setSelectedProtocol(null);
    } catch (err) {
      console.error("Failed to delete:", err);
      alert("Failed to delete guideline.");
    }
  };

  const filteredProtocols = protocols.filter((p) => {
    const matchesSpecialty = activeSpecialty === "All" || p.specialty === activeSpecialty;
    const matchesSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSpecialty && matchesSearch;
  });

  return (
    <div className="flex h-[calc(100vh-64px)] animate-fade-in">
      <ProtocolList
        protocols={protocols}
        filteredProtocols={filteredProtocols}
        loading={loading}
        selectedProtocol={selectedProtocol}
        setSelectedProtocol={setSelectedProtocol}
        activeSpecialty={activeSpecialty}
        setActiveSpecialty={setActiveSpecialty}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        showUploadPanel={showUploadPanel}
        setShowUploadPanel={setShowUploadPanel}
        fetchProtocols={fetchProtocols}
        SPECIALTY_TAGS={SPECIALTY_TAGS}
      />
      <div className="flex-1 bg-neutral-50 dark:bg-slate-900/50 overflow-y-auto">
        <ProtocolDetailsPane
          selectedProtocol={selectedProtocol}
          setSelectedProtocol={setSelectedProtocol}
          handleDelete={handleDelete}
          ragStatus={ragStatus}
          ragLoading={ragLoading}
          protocols={protocols}
          fetchRagStatus={fetchRagStatus}
          fetchProtocols={fetchProtocols}
          setShowUploadPanel={setShowUploadPanel}
        />
      </div>
    </div>
  );
}
