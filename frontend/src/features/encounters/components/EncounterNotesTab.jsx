import React, { useState, useRef } from "react";
import Card from "../../../components/ui/Card";
import Button from "../../../components/ui/Button";
import VoiceInputButton from "../../../components/ui/VoiceInputButton";
import { AlertTriangle, FileText, Trash2, Clock, History, Upload, X, File as FileIcon } from "lucide-react";
import { clinicalService } from "../../../services/api/clinicalService";
import { toast } from "react-toastify";
import { logNoteCreated, logNoteDeleted } from "../../../services/api/auditService";

// ─── Section Divider ──────────────────────────────────────────────────────────
function TimeBoundaryDivider({ date, label }) {
    return (
        <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-amber-200" />
            <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200 rounded-full">
                <History className="w-3 h-3 text-amber-600" />
                <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wide">{label}</span>
                {date && <span className="text-[10px] text-amber-500 ml-1">· before {new Date(date).toLocaleDateString()}</span>}
            </div>
            <div className="flex-1 h-px bg-amber-200" />
        </div>
    );
}

export default function EncounterNotesTab({
    isLocked,
    noteTag, setNoteTag,
    noteCustomTag, setNoteCustomTag,
    noteAlert,
    newNoteContent, setNewNoteContent,
    handleSavePatientNote, isSavingNote,
    patientNotes,
    expandedNoteId, setExpandedNoteId,
    handleDeletePatientNote,
    handleEditPatientNote,
    noteCommentInputs, setNoteCommentInputs,
    handleSaveNoteComment,
    TAG_CONFIG,
    unarchivedAt,
    patient
}) {
    const fileInputRef = useRef(null);
    const [isUploading, setIsUploading] = useState(false);
    const [editingNoteId, setEditingNoteId] = useState(null);
    const [editNoteContent, setEditNoteContent] = useState("");
    const [isSavingEdit, setIsSavingEdit] = useState(false);

    const handleUploadHistory = async (e) => {
        const file = e.target.files?.[0];
        if (!file || !patient?.mrn) return;
        setIsUploading(true);
        try {
            await clinicalService.uploadDocument(file, 'HISTORY', patient.mrn);
            toast.success("External history document uploaded. Vision AI will analyze it shortly.");
        } catch (err) {
            toast.error("Failed to upload document.");
        } finally {
            setIsUploading(false);
            e.target.value = null;
        }
    };

    // Split notes by time boundary
    const boundaryDate = unarchivedAt ? new Date(unarchivedAt) : null;
    const currentNotes = boundaryDate
        ? patientNotes.filter(n => new Date(n.createdAt) >= boundaryDate)
        : patientNotes;
    const historyNotes = boundaryDate
        ? patientNotes.filter(n => new Date(n.createdAt) < boundaryDate)
        : [];

    const handleStartEdit = (note) => {
        setEditingNoteId(note.id);
        setEditNoteContent(note.content);
        setExpandedNoteId(null);
    };

    const handleSaveEdit = async (noteId) => {
        if (!editNoteContent.trim()) return;
        setIsSavingEdit(true);
        try {
            await handleEditPatientNote(noteId, editNoteContent);
            setEditingNoteId(null);
        } catch (err) {
            // Error handled in parent
        } finally {
            setIsSavingEdit(false);
        }
    };

    const renderNoteCard = (note, isHistorical = false) => {
        const cfg = TAG_CONFIG[note.tag] || TAG_CONFIG.CUSTOM;
        const displayTag = note.tag === 'CUSTOM' ? (note.customTag || 'Custom') : cfg.label;
        const isExpanded = expandedNoteId === note.id;
        const isEditing = editingNoteId === note.id;

        return (
            <Card key={note.id} padding="md" className={isHistorical ? "border-amber-200 bg-amber-50/30 opacity-85" : ""}>
                <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-0.5 text-xs font-bold rounded-full border ${cfg.color}`}>{displayTag}</span>
                        {isHistorical && (
                            <span className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold text-amber-700 bg-amber-100 border border-amber-200 rounded-full">
                                <History className="w-2.5 h-2.5" /> Past History
                            </span>
                        )}
                        {note.status && <span className="px-2 py-0.5 text-xs rounded-full bg-neutral-100 border border-neutral-200 text-neutral-600">{note.status}</span>}
                        <span className="text-xs text-neutral-400">{note.createdAt ? new Date(note.createdAt).toLocaleString() : ''}</span>
                    </div>
                    {!isLocked && !isHistorical && (
                        <div className="flex items-center gap-2">
                            <button onClick={() => handleStartEdit(note)} className="p-1 text-neutral-400 hover:text-blue-500 rounded text-xs flex items-center gap-1 font-medium" title="Edit">
                                ✎ Edit
                            </button>
                            <button onClick={() => {
                                handleDeletePatientNote(note.id);
                                logNoteDeleted(patient?.mrn, note.id);
                            }} className="p-1 text-neutral-400 hover:text-red-500 rounded" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                    )}
                </div>
                
                {isEditing ? (
                    <div className="mt-2">
                        <textarea 
                            value={editNoteContent} 
                            onChange={(e) => setEditNoteContent(e.target.value)} 
                            className="w-full min-h-[100px] p-3 text-sm border border-neutral-400 rounded-lg focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500" 
                        />
                        <div className="flex justify-end gap-2 mt-2">
                            <Button size="sm" variant="secondary" onClick={() => setEditingNoteId(null)}>Cancel</Button>
                            <Button size="sm" variant="primary" disabled={isSavingEdit || !editNoteContent.trim()} onClick={() => handleSaveEdit(note.id)}>
                                {isSavingEdit ? "Saving..." : "Save Edit"}
                            </Button>
                        </div>
                    </div>
                ) : (
                    <pre className="text-sm text-neutral-800 font-sans whitespace-pre-wrap leading-relaxed bg-neutral-50 p-4 rounded border border-neutral-200">{note.content}</pre>
                )}

                {note.comment && (
                    <div className="mt-2 p-2.5 bg-blue-50 border border-blue-200 rounded-md">
                        <p className="text-xs font-semibold text-blue-800 mb-0.5">Doctor Comment</p>
                        <p className="text-xs text-blue-700">{note.comment}</p>
                    </div>
                )}
                
                {!isHistorical && !isLocked && !isEditing && (
                    <div className="mt-2 pt-2 border-t border-neutral-200">
                        <button onClick={() => setExpandedNoteId(isExpanded ? null : note.id)} className="text-xs text-primary-600 hover:text-primary-800 font-medium">{isExpanded ? '▲ Hide' : '▼ Add Comment'}</button>
                        {isExpanded && (
                            <div className="mt-2 flex gap-2">
                                <textarea value={noteCommentInputs[note.id] || ''} onChange={e => setNoteCommentInputs(prev => ({ ...prev, [note.id]: e.target.value }))} placeholder="Add a comment..." className="flex-1 text-xs p-2 border border-neutral-300 rounded focus:outline-none focus:border-primary-500 min-h-[60px]" />
                                <button onClick={() => handleSaveNoteComment(note)} className="px-3 py-1.5 text-xs font-semibold bg-primary-600 text-white rounded hover:bg-primary-700 self-end">Save</button>
                            </div>
                        )}
                    </div>
                )}
            </Card>
        );
    };

    return (
        <div className="max-w-3xl mx-auto space-y-4">
            {/* Upload External History Button */}
            <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-neutral-500">
                    {boundaryDate ? (
                        <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-primary-500" />New episode started {boundaryDate.toLocaleDateString()}</span>
                    ) : null}
                </span>
                <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors disabled:opacity-60"
                >
                    {isUploading ? <span className="animate-spin">⏳</span> : <Upload className="w-3.5 h-3.5" />}
                    Upload External History
                </button>
                <input type="file" ref={fileInputRef} onChange={handleUploadHistory} className="hidden" accept=".pdf,.txt,.png,.jpg,.jpeg,.dcm" />
            </div>

            {!isLocked && (
                <Card padding="md" className="border-primary-200 bg-primary-50/10">
                    <h4 className="text-sm font-bold text-primary-800 mb-3">Add Patient Note</h4>
                    <div className="flex flex-wrap gap-2 mb-3">
                        {Object.entries(TAG_CONFIG).map(([key, cfg]) => (
                            <button key={key} onClick={() => setNoteTag(key)} className={`px-3 py-1 text-xs font-semibold rounded-full border transition-all ${noteTag === key ? cfg.color + ' shadow-sm' : 'bg-white border-neutral-300 text-neutral-500 hover:border-neutral-400'}`}>{cfg.label}</button>
                        ))}
                    </div>
                    {noteTag === 'CUSTOM' && <input value={noteCustomTag} onChange={e => setNoteCustomTag(e.target.value)} placeholder="Enter custom tag name..." className="w-full mb-3 px-3 py-1.5 text-xs border border-neutral-300 rounded-md focus:outline-none focus:border-primary-500" />}
                    {noteAlert && (
                        <div className="flex items-start gap-2 mb-3 p-3 bg-danger-50 border border-danger-300 rounded-lg">
                            <AlertTriangle className="w-4 h-4 text-danger-600 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-xs font-bold text-danger-800">Potential Contraindication Detected</p>
                                <p className="text-xs text-danger-700 mt-0.5">{noteAlert}</p>
                            </div>
                        </div>
                    )}
                    <div className="relative">
                        <textarea value={newNoteContent} onChange={(e) => setNewNoteContent(e.target.value)} placeholder="Type your clinical observations, prescriptions, or history here..." className="w-full min-h-[100px] p-3 pr-12 text-sm border border-neutral-400 rounded-lg focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500" />
                        <VoiceInputButton
                            className="absolute top-2 right-2 bg-white dark:bg-slate-900 border border-neutral-300 dark:border-slate-600"
                            onTranscript={(text) => setNewNoteContent(prev => (prev && !prev.endsWith(' ') && !prev.endsWith('\n') ? prev + ' ' : prev) + text)}
                        />
                    </div>
                    <div className="flex justify-end mt-3">
                        <Button variant="primary" size="sm" icon={FileText} onClick={() => {
                            handleSavePatientNote();
                            logNoteCreated(patient?.mrn, noteTag);
                        }} disabled={isSavingNote || !newNoteContent.trim()}>{isSavingNote ? "Saving..." : "Save Note"}</Button>
                    </div>
                </Card>
            )}

            {/* Current Episode Notes */}
            {currentNotes.length === 0 && historyNotes.length === 0 && (
                <div className="p-8 text-center text-slate-500 text-sm">No patient notes yet. Add the first note above.</div>
            )}
            {currentNotes.map(note => renderNoteCard(note, false))}

            {/* Time Boundary Divider */}
            {historyNotes.length > 0 && (
                <>
                    <TimeBoundaryDivider date={unarchivedAt} label="Past Medical History" />
                    <div className="bg-amber-50/40 border border-amber-100 rounded-xl p-3 mb-2">
                        <p className="text-xs text-amber-700 font-medium">
                            📋 Records below are from a previous care episode. They are preserved exactly as entered and cannot be modified. To note any updates, add a new note above.
                        </p>
                    </div>
                    {historyNotes.map(note => renderNoteCard(note, true))}
                </>
            )}
        </div>
    );
}
