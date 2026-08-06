import React from "react";
import { Tag, X, ChevronDown, Check, FileText, Pill, History, MessageSquare } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { fetchPatientNotes, createPatientNote, updateNoteComment } from "../../../store/slices/encounterSlice";
import axiosInstance from "../../../config/axios";
import Button from "../../../components/ui/Button";
import { notifyError } from "../../../common/utils/toast";

const NOTE_TAGS = [
  { id: 'PRESCRIPTION',   label: 'Prescription',   icon: Pill,          color: 'bg-info-50 text-info-600 border-info-200 dark:bg-info-500/10 dark:text-info-500 dark:border-info-500/30' },
  { id: 'CLINICAL_NOTE',  label: 'Clinical Note',  icon: FileText,      color: 'bg-success-50 text-success-600 border-success-200 dark:bg-success-500/10 dark:text-success-500 dark:border-success-500/30' },
  { id: 'HISTORY',        label: 'History',         icon: History,       color: 'bg-primary-50 text-primary-600 border-primary-200 dark:bg-primary-900/20 dark:text-primary-400 dark:border-primary-800' },
  { id: 'COMMENT',        label: 'Comment',         icon: MessageSquare, color: 'bg-warning-50 text-warning-500 border-warning-200 dark:bg-warning-500/10 dark:border-warning-500/30' },
];

const NOTE_STATUSES = [
  'Active',
  'Current Medication',
  'Missed Doses',
  'Resolved',
  'Past (Cured)',
  'Under Observation',
];

export default function PatientNotesDrawer({ patient, onClose }) {
  const dispatch = useDispatch();
  const notesObj = useSelector(state => state.encounter.patientNotes);
  const notes = notesObj[patient.mrn] || [];
  const loadingStates = useSelector(state => state.encounter.loadingStates);
  const loading = loadingStates[`notes_${patient.mrn}`] || false;
  
  const [activeTag, setActiveTag] = React.useState('PRESCRIPTION');
  const [newNote, setNewNote] = React.useState({ content: '', status: 'Active' });
  const [saving, setSaving] = React.useState(false);
  const [expandedNote, setExpandedNote] = React.useState(null);

  // Load notes on mount
  React.useEffect(() => {
    dispatch(fetchPatientNotes(patient.mrn));
  }, [dispatch, patient.mrn]);

  const filteredNotes = notes.filter(n => n.tag === activeTag);

  const handleAdd = async () => {
    if (!newNote.content.trim()) return;
    setSaving(true);
    try {
      await dispatch(createPatientNote(patient.mrn, {
        tag: activeTag,
        content: newNote.content,
        status: newNote.status
      }));
      setNewNote({ content: '', status: 'Active' });
    } catch (e) {
      console.error(e);
      notifyError('Failed to add note.');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (noteId, newStatus) => {
    try {
      await axiosInstance.put(`/api/clinical/patients/${patient.mrn}/notes/${noteId}`, { status: newStatus });
      await dispatch(fetchPatientNotes(patient.mrn));
    } catch (e) {
      console.error('Failed to update note status', e);
      notifyError('Failed to update note status.');
    }
  };

  const tagDef = tag => NOTE_TAGS.find(t => t.id === tag) || NOTE_TAGS[0];

  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      {/* Backdrop */}
      <div className="flex-1 bg-neutral-900/40 backdrop-blur-sm" />
      {/* Drawer */}
      <div
        className="w-[420px] bg-white dark:bg-slate-900 h-full flex flex-col shadow-2xl border-l border-neutral-300 dark:border-slate-700 animate-fade-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-neutral-200 dark:border-slate-700 flex items-start justify-between bg-neutral-50 dark:bg-slate-800/50">
          <div>
            <h3 className="text-base font-bold text-neutral-900 dark:text-slate-100 flex items-center gap-2">
              <Tag className="w-4 h-4 text-primary-500" />
              Clinical Notes
            </h3>
            <p className="text-xs text-neutral-500 dark:text-slate-400 mt-0.5">
              {patient.name} <span className="font-mono">{patient.mrn}</span>
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-neutral-200 dark:hover:bg-slate-700 rounded-full transition-colors">
            <X className="w-4 h-4 text-neutral-500" />
          </button>
        </div>

        {/* Tag Pills */}
        <div className="px-4 py-3 flex gap-2 flex-wrap border-b border-neutral-200 dark:border-slate-700">
          {NOTE_TAGS.map(tag => {
            const Icon = tag.icon;
            const count = notes.filter(n => n.tag === tag.id).length;
            return (
              <button
                key={tag.id}
                onClick={() => setActiveTag(tag.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all ${
                  activeTag === tag.id
                    ? tag.color + ' shadow-sm scale-105'
                    : 'bg-neutral-100 dark:bg-slate-800 text-neutral-600 dark:text-slate-400 border-neutral-300 dark:border-slate-600 hover:border-neutral-400'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tag.label}
                {count > 0 && (
                  <span className="ml-0.5 bg-white/60 dark:bg-black/30 rounded-full px-1.5 py-0.5 text-[10px] font-bold">{count}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Add new note */}
        <div className="px-4 py-3 border-b border-neutral-200 dark:border-slate-700 bg-neutral-50/50 dark:bg-slate-800/30 space-y-2">
          <label className="block text-xs font-semibold text-neutral-700 dark:text-slate-300">
            Add {tagDef(activeTag).label}
          </label>
          <textarea
            value={newNote.content}
            onChange={e => setNewNote(p => ({ ...p, content: e.target.value }))}
            placeholder={`Enter ${tagDef(activeTag).label.toLowerCase()} details...`}
            rows={3}
            className="w-full p-2.5 text-sm bg-white dark:bg-slate-900 border border-neutral-300 dark:border-slate-600 rounded-8 text-neutral-800 dark:text-slate-200 placeholder-neutral-400 focus:ring-2 focus:ring-primary-500 focus:outline-none resize-none"
          />
          <div className="flex items-center gap-2">
            <select
              value={newNote.status}
              onChange={e => setNewNote(p => ({ ...p, status: e.target.value }))}
              className="flex-1 text-xs px-2 py-1.5 bg-white dark:bg-slate-800 border border-neutral-300 dark:border-slate-600 rounded-6 text-neutral-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {NOTE_STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
            <Button size="sm" onClick={handleAdd} disabled={saving || !newNote.content.trim()}>
              {saving ? 'Saving...' : 'Add Note'}
            </Button>
          </div>
        </div>

        {/* Notes list */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-sm text-neutral-400">Loading notes...</div>
          ) : filteredNotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              {(() => { const Icon = tagDef(activeTag).icon; return <Icon className="w-10 h-10 text-neutral-300 dark:text-slate-600 mb-2" />; })()}
              <p className="text-sm text-neutral-400 dark:text-slate-500">No {tagDef(activeTag).label.toLowerCase()} notes yet.</p>
            </div>
          ) : (
            filteredNotes.map(note => {
              const def = tagDef(note.tag);
              const Icon = def.icon;
              const isExpanded = expandedNote === note.id;
              return (
                <div key={note.id} className={`rounded-8 border ${def.color} p-3 space-y-2`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="text-xs font-bold uppercase tracking-wide">{def.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-neutral-400 dark:text-slate-500">
                        {note.createdAt ? new Date(note.createdAt).toLocaleDateString() : ''}
                      </span>
                      <button onClick={() => setExpandedNote(isExpanded ? null : note.id)} className="text-xs opacity-60 hover:opacity-100">
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      </button>
                    </div>
                  </div>
                  <p className={`text-sm text-current leading-relaxed ${isExpanded ? '' : 'line-clamp-2'}`}>
                    {note.content}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wide opacity-60">Status:</span>
                    <select
                      value={note.status || 'Active'}
                      onChange={e => handleStatusChange(note.id, e.target.value)}
                      className="text-xs bg-white/60 dark:bg-black/20 border-0 rounded px-1.5 py-0.5 font-semibold focus:outline-none focus:ring-1 focus:ring-current"
                    >
                      {NOTE_STATUSES.map(s => <option key={s}>{s}</option>)}
                    </select>
                    {note.status === 'Resolved' || note.status === 'Past (Cured)' ? (
                      <Check className="w-3 h-3 text-success-500 ml-auto" />
                    ) : null}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}