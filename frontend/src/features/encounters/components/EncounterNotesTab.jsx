import React, { useState, useRef } from "react";
import Card from "../../../components/ui/Card";
import Button from "../../../components/ui/Button";
import VoiceInputButton from "../../../components/ui/VoiceInputButton";
import { AlertTriangle, FileText, Trash2, Clock, History, Upload, Loader2, Pencil, ChevronUp, ChevronDown } from "lucide-react";
import { clinicalService } from "../../../services/api/clinicalService";
import { toast } from "react-toastify";
import { logNoteCreated, logNoteDeleted } from "../../../services/api/auditService";

// ─── Section Divider ──────────────────────────────────────────────────────────
function TimeBoundaryDivider({ date, label }) {
    return (
        <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-warning-200 dark:bg-warning-900/40" />
            <div className="flex items-center gap-1.5 px-3 py-1 bg-warning-50 dark:bg-warning-500/10 border border-warning-200 dark:border-warning-500/30 rounded-full">
                <History className="w-3 h-3 text-warning-500" />
                <span className="text-[11px] font-bold text-warning-500 uppercase tracking-wide">{label}</span>
                {date && <span className="text-[10px] text-warning-500/80 ml-1">· before {new Date(date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>}
            </div>
            <div className="flex-1 h-px bg-warning-200 dark:bg-warning-900/40" />
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
    patient,
    latestEncounter
}) {
    const fileInputRef = useRef(null);
    const [isUploading, setIsUploading] = useState(false);
    const [editingNoteId, setEditingNoteId] = useState(null);
    const [editNoteContent, setEditNoteContent] = useState("");
    const [isSavingEdit, setIsSavingEdit] = useState(false);

    // Once the encounter is signed, existing notes are permanent — but a physician can
    // still write NEW notes (addenda) in response, e.g. to a coder's revision request.
    const isSigned = !!latestEncounter?.signedAt;
    const isAddendum = (note) =>
        isSigned && note.encounterId === latestEncounter?.id &&
        new Date(note.createdAt) > new Date(latestEncounter.signedAt);

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
            <Card key={note.id} padding="md" className={isHistorical ? "border-warning-200 dark:border-warning-900/40 bg-warning-50/30 dark:bg-warning-500/5 opacity-85" : ""}>
                <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-0.5 text-xs font-bold rounded-full border ${cfg.color}`}>{displayTag}</span>
                        {isHistorical && (
                            <span className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold text-warning-500 bg-warning-100 dark:bg-warning-500/20 border border-warning-200 dark:border-warning-500/30 rounded-full">
                                <History className="w-2.5 h-2.5" /> Past History
                            </span>
                        )}
                        {!isHistorical && isAddendum(note) && (
                            <span className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-full">
                                <Pencil className="w-2.5 h-2.5" /> Addendum
                            </span>
                        )}
                        {note.status && <span className="px-2 py-0.5 text-xs rounded-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400">{note.status}</span>}
                        <span className="text-xs text-neutral-400 dark:text-neutral-500">{note.createdAt ? new Date(note.createdAt).toLocaleString() : ''}</span>
                    </div>
                    {!isLocked && !isHistorical && (
                        <div className="flex items-center gap-2">
                            <button onClick={() => handleStartEdit(note)} className="p-1 text-neutral-600 dark:text-slate-400 hover:text-primary-600 rounded-6 text-xs flex items-center gap-1 font-medium" title="Edit">
                                <Pencil className="w-3.5 h-3.5" /> Edit
                            </button>
                            <button onClick={() => {
                                handleDeletePatientNote(note.id);
                                logNoteDeleted(patient?.mrn, note.id);
                            }} className="p-1 text-neutral-600 dark:text-slate-400 hover:text-danger-500 rounded-6" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                    )}
                </div>

                {isEditing ? (
                    <div className="mt-2">
                        <textarea
                            value={editNoteContent}
                            onChange={(e) => setEditNoteContent(e.target.value)}
                            className="w-full min-h-[100px] p-3 text-sm bg-white dark:bg-neutral-800 border border-neutral-400 dark:border-neutral-700 rounded-8 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 text-neutral-900 dark:text-neutral-200"
                        />
                        <div className="flex justify-end gap-2 mt-2">
                            <Button size="sm" variant="secondary" onClick={() => setEditingNoteId(null)}>Cancel</Button>
                            <Button size="sm" variant="primary" disabled={isSavingEdit || !editNoteContent.trim()} onClick={() => handleSaveEdit(note.id)}>
                                {isSavingEdit ? "Saving..." : "Save Edit"}
                            </Button>
                        </div>
                    </div>
                ) : (
                    <pre className="text-sm text-neutral-800 dark:text-neutral-300 font-sans whitespace-pre-wrap leading-relaxed bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-8 border border-neutral-200 dark:border-neutral-800">{note.content}</pre>
                )}

                {note.comment && (
                    <div className="mt-2 p-2.5 bg-info-50 dark:bg-info-900/10 border border-info-200 dark:border-info-800 rounded-8">
                        <p className="text-xs font-semibold text-info-700 dark:text-info-400 mb-0.5">Doctor Comment</p>
                        <p className="text-xs text-info-600 dark:text-info-300">{note.comment}</p>
                    </div>
                )}

                {!isHistorical && !isLocked && !isEditing && (
                    <div className="mt-2 pt-2 border-t border-neutral-200 dark:border-neutral-800">
                        <button onClick={() => setExpandedNoteId(isExpanded ? null : note.id)} className="flex items-center gap-1 text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 font-medium">
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />} {isExpanded ? 'Hide' : 'Add Comment'}
                        </button>
                        {isExpanded && (
                            <div className="mt-2 flex gap-2">
                                <textarea value={noteCommentInputs[note.id] || ''} onChange={e => setNoteCommentInputs(prev => ({ ...prev, [note.id]: e.target.value }))} placeholder="Add a comment..." className="flex-1 text-xs p-2 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-6 focus:outline-none focus:border-primary-500 min-h-[60px] text-neutral-900 dark:text-neutral-200" />
                                <button onClick={() => handleSaveNoteComment(note)} className="px-3 py-1.5 text-xs font-semibold bg-primary-500 text-white rounded-6 hover:bg-primary-600 self-end">Save</button>
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
                <span className="text-xs text-neutral-500 dark:text-neutral-400">
                    {boundaryDate ? (
                        <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-primary-500" />New episode started {boundaryDate.toLocaleDateString()}</span>
                    ) : null}
                </span>
                <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-neutral-600 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-6 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors disabled:opacity-60"
                >
                    {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                    Upload External History
                </button>
                <input type="file" ref={fileInputRef} onChange={handleUploadHistory} className="hidden" accept=".pdf,.txt,.png,.jpg,.jpeg,.dcm" />
            </div>

            {(!isLocked || isSigned) && (
                <Card padding="md" className="border-primary-200 dark:border-primary-800 bg-primary-50/10 dark:bg-primary-900/5">
                    <h4 className="text-sm font-bold text-primary-700 dark:text-primary-400 mb-3">
                        {isSigned ? "Add Addendum" : "Add Patient Note"}
                    </h4>
                    {isSigned && (
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-3 -mt-1">
                            This encounter is signed — the original notes are permanent. This adds a new, separately-timestamped addendum instead.
                        </p>
                    )}
                    <div className="flex flex-wrap gap-2 mb-3">
                        {Object.entries(TAG_CONFIG).map(([key, cfg]) => (
                            <button key={key} onClick={() => setNoteTag(key)} className={`px-3 py-1 text-xs font-semibold rounded-full border transition-all ${noteTag === key ? cfg.color + ' shadow-sm' : 'bg-white dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400 hover:border-neutral-400'}`}>{cfg.label}</button>
                        ))}
                    </div>
                    {noteTag === 'CUSTOM' && <input value={noteCustomTag} onChange={e => setNoteCustomTag(e.target.value)} placeholder="Enter custom tag name..." className="w-full mb-3 px-3 py-1.5 text-xs bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-6 focus:outline-none focus:border-primary-500 text-neutral-900 dark:text-neutral-200" />}
                    {noteAlert && (
                        <div className="flex items-start gap-2 mb-3 p-3 bg-danger-50 dark:bg-danger-900/10 border border-danger-300 dark:border-danger-800 rounded-8">
                            <AlertTriangle className="w-4 h-4 text-danger-600 dark:text-danger-500 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-xs font-bold text-danger-700 dark:text-danger-400">Potential Contraindication Detected</p>
                                <p className="text-xs text-danger-600 dark:text-danger-300 mt-0.5">{noteAlert}</p>
                            </div>
                        </div>
                    )}
                    <div className="relative">
                        <textarea value={newNoteContent} onChange={(e) => setNewNoteContent(e.target.value)} placeholder="Type your clinical observations, prescriptions, or history here..." className="w-full min-h-[100px] p-3 pr-12 text-sm bg-white dark:bg-neutral-800 border border-neutral-400 dark:border-neutral-700 rounded-8 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 text-neutral-900 dark:text-neutral-200" />
                        <VoiceInputButton
                            className="absolute top-2 right-2 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700"
                            onTranscript={(text) => setNewNoteContent(prev => (prev && !prev.endsWith(' ') && !prev.endsWith('\n') ? prev + ' ' : prev) + text)}
                        />
                    </div>
                    <div className="flex justify-end mt-3">
                        <Button variant="primary" size="sm" icon={FileText} onClick={() => {
                            handleSavePatientNote();
                            logNoteCreated(patient?.mrn, noteTag);
                        }} disabled={isSavingNote || !newNoteContent.trim()}>{isSavingNote ? "Saving..." : isSigned ? "Save Addendum" : "Save Note"}</Button>
                    </div>
                </Card>
            )}

            {/* Current Episode Notes */}
            {currentNotes.length === 0 && historyNotes.length === 0 && (
                <div className="p-8 text-center text-neutral-500 dark:text-neutral-400 text-sm">No patient notes yet. Add the first note above.</div>
            )}
            {currentNotes.map(note => renderNoteCard(note, false))}

            {/* Time Boundary Divider */}
            {historyNotes.length > 0 && (
                <>
                    <TimeBoundaryDivider date={unarchivedAt} label="Past Medical History" />
                    <div className="bg-warning-50/40 dark:bg-warning-500/5 border border-warning-100 dark:border-warning-500/20 rounded-8 p-3 mb-2">
                        <p className="text-xs text-warning-500 font-medium">
                            Records below are from a previous care episode. They are preserved exactly as entered and cannot be modified. To note any updates, add a new note above.
                        </p>
                    </div>
                    {historyNotes.map(note => renderNoteCard(note, true))}
                </>
            )}
        </div>
    );
}
