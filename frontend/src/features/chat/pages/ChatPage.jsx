import React, { useState, useEffect, useRef, useCallback } from 'react';
import { chatService } from '../../../services/api/chatService';
import { clinicalService } from '../../../services/api/clinicalService';
import { Plus, Trash2, Send, Bot, User, Loader2, MessageSquare, Sparkles, Users, BookOpen, Globe, X, ChevronLeft } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import VoiceInputButton from '../../../components/ui/VoiceInputButton';

const MODE_META = {
  general: { label: 'General', icon: Globe },
  patient: { label: 'Patient', icon: Users },
  protocol: { label: 'Protocol', icon: BookOpen },
};

// ─── New Conversation Modal — forces a scope choice before querying ───────────
function NewChatModal({ onClose, onCreate }) {
  const [step, setStep] = useState('mode'); // 'mode' | 'patient' | 'protocol'
  const [patientQuery, setPatientQuery] = useState('');
  const [patients, setPatients] = useState([]);
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [protocols, setProtocols] = useState([]);
  const [loadingProtocols, setLoadingProtocols] = useState(false);

  useEffect(() => {
    if (step === 'patient') {
      setLoadingPatients(true);
      clinicalService.getPatients().then(setPatients).catch(() => setPatients([])).finally(() => setLoadingPatients(false));
    } else if (step === 'protocol') {
      setLoadingProtocols(true);
      clinicalService.getDocuments('Clinical Protocol').then(setProtocols).catch(() => setProtocols([])).finally(() => setLoadingProtocols(false));
    }
  }, [step]);

  const filteredPatients = patients.filter(p =>
    `${p.firstName} ${p.lastName}`.toLowerCase().includes(patientQuery.toLowerCase()) ||
    (p.mrn || '').toLowerCase().includes(patientQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-8 shadow-2xl w-full max-w-md border border-neutral-200 dark:border-slate-700" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-neutral-200 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {step !== 'mode' && (
              <button onClick={() => setStep('mode')} className="p-1 rounded-6 hover:bg-neutral-100 dark:hover:bg-slate-800 text-neutral-500">
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
            <h3 className="text-sm font-bold text-neutral-900 dark:text-white">New Conversation</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-6 hover:bg-neutral-100 dark:hover:bg-slate-800 text-neutral-500">
            <X className="w-4 h-4" />
          </button>
        </div>

        {step === 'mode' && (
          <div className="p-5 space-y-2">
            <p className="text-xs text-neutral-500 dark:text-slate-400 mb-3">
              Pick a scope to keep answers focused — this avoids stuffing unrelated hospital data into the AI's context.
            </p>
            <button
              onClick={() => onCreate('general', null, null)}
              className="w-full text-left p-3 rounded-6 border border-neutral-200 dark:border-slate-700 hover:border-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors flex items-start gap-3"
            >
              <Globe className="w-4 h-4 text-primary-500 mt-0.5" />
              <span>
                <span className="block text-sm font-semibold text-neutral-900 dark:text-white">General Medical</span>
                <span className="block text-xs text-neutral-500 dark:text-slate-400 mt-0.5">No patient or document context — general clinical knowledge only.</span>
              </span>
            </button>
            <button
              onClick={() => setStep('patient')}
              className="w-full text-left p-3 rounded-6 border border-neutral-200 dark:border-slate-700 hover:border-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors flex items-start gap-3"
            >
              <Users className="w-4 h-4 text-primary-500 mt-0.5" />
              <span>
                <span className="block text-sm font-semibold text-neutral-900 dark:text-white">Patient Data</span>
                <span className="block text-xs text-neutral-500 dark:text-slate-400 mt-0.5">Scoped to one patient's notes and lab history.</span>
              </span>
            </button>
            <button
              onClick={() => setStep('protocol')}
              className="w-full text-left p-3 rounded-6 border border-neutral-200 dark:border-slate-700 hover:border-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors flex items-start gap-3"
            >
              <BookOpen className="w-4 h-4 text-primary-500 mt-0.5" />
              <span>
                <span className="block text-sm font-semibold text-neutral-900 dark:text-white">Protocol / Guideline</span>
                <span className="block text-xs text-neutral-500 dark:text-slate-400 mt-0.5">Scoped to a single uploaded hospital guideline.</span>
              </span>
            </button>
          </div>
        )}

        {step === 'patient' && (
          <div className="p-5 space-y-3">
            <input
              autoFocus
              value={patientQuery}
              onChange={e => setPatientQuery(e.target.value)}
              placeholder="Search patient by name or MRN..."
              className="w-full px-3 py-2 border border-neutral-300 dark:border-slate-600 rounded-6 text-sm bg-white dark:bg-slate-800 text-neutral-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <div className="max-h-64 overflow-y-auto space-y-1">
              {loadingPatients ? (
                <p className="text-xs text-neutral-400 text-center py-4">Loading patients...</p>
              ) : filteredPatients.length === 0 ? (
                <p className="text-xs text-neutral-400 text-center py-4">No matching patients.</p>
              ) : filteredPatients.map(p => (
                <button
                  key={p.id}
                  onClick={() => onCreate('patient', p.mrn, `${p.firstName} ${p.lastName}`)}
                  className="w-full text-left px-3 py-2 rounded-6 hover:bg-primary-50 dark:hover:bg-primary-900/20 text-sm text-neutral-800 dark:text-slate-200 flex items-center justify-between"
                >
                  <span>{p.firstName} {p.lastName}</span>
                  <span className="text-xs text-neutral-400 font-mono">{p.mrn}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 'protocol' && (
          <div className="p-5 space-y-3">
            <div className="max-h-64 overflow-y-auto space-y-1">
              {loadingProtocols ? (
                <p className="text-xs text-neutral-400 text-center py-4">Loading protocols...</p>
              ) : protocols.length === 0 ? (
                <p className="text-xs text-neutral-400 text-center py-4">No guidelines uploaded yet.</p>
              ) : protocols.map(doc => (
                <button
                  key={doc.id}
                  onClick={() => onCreate('protocol', doc.fileKey, doc.fileName)}
                  className="w-full text-left px-3 py-2 rounded-6 hover:bg-primary-50 dark:hover:bg-primary-900/20 text-sm text-neutral-800 dark:text-slate-200"
                >
                  {doc.fileName}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Session Sidebar ──────────────────────────────────────────────────────────
function SessionSidebar({ sessions, activeId, onSelect, onNew, onDelete }) {
  return (
    <aside className="w-72 flex flex-col border-r border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex-shrink-0">
      <div className="p-4 border-b border-neutral-200 dark:border-slate-700">
        <button
          onClick={onNew}
          className="w-full flex items-center gap-2 px-4 py-2.5 rounded-6 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Conversation
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {sessions.length === 0 && (
          <p className="text-xs text-neutral-400 text-center mt-8 px-4">No conversations yet.<br/>Start one above.</p>
        )}
        {sessions.map(s => {
          const meta = MODE_META[s.mode] || MODE_META.general;
          return (
            <div
              key={s.id}
              onClick={() => onSelect(s.id)}
              className={`group flex items-center justify-between gap-2 px-3 py-2.5 rounded-6 cursor-pointer text-sm transition-colors ${
                s.id === activeId
                  ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 font-semibold'
                  : 'text-neutral-700 dark:text-slate-300 hover:bg-neutral-100 dark:hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <MessageSquare className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">{s.title}</span>
                {s.mode !== 'general' && (
                  <span className="flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded-full bg-neutral-200 dark:bg-slate-700 text-neutral-600 dark:text-slate-300 font-normal">
                    {meta.label}
                  </span>
                )}
              </div>
              <button
                onClick={e => { e.stopPropagation(); onDelete(s.id); }}
                className="opacity-0 group-hover:opacity-100 p-1 rounded-6 hover:bg-danger-50 dark:hover:bg-danger-900/40 text-danger-500 transition-all flex-shrink-0"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          );
        })}
      </div>
    </aside>
  );
}

// ─── Message Bubble ───────────────────────────────────────────────────────────
function MessageBubble({ role, content }) {
  const isUser = role === 'user';
  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
        isUser ? 'bg-primary-100 dark:bg-primary-900/50' : 'bg-primary-500'
      }`}>
        {isUser
          ? <User className="w-4 h-4 text-primary-600 dark:text-primary-400" />
          : <Bot className="w-4 h-4 text-white" />
        }
      </div>
      <div className={`max-w-[75%] px-4 py-3 rounded-8 text-sm leading-relaxed ${
        isUser
          ? 'bg-primary-600 text-white rounded-tr-sm'
          : 'bg-white dark:bg-slate-800 text-neutral-800 dark:text-slate-200 border border-neutral-200 dark:border-slate-700 rounded-tl-sm shadow-sm'
      }`}>
        {isUser ? (
          <p>{content}</p>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Chat Page ───────────────────────────────────────────────────────────
export default function ChatPage() {
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  const scrollToBottom = () => bottomRef.current?.scrollIntoView({ behavior: 'smooth' });

  useEffect(() => { scrollToBottom(); }, [messages, streamingContent]);

  // Load sessions on mount
  useEffect(() => {
    chatService.getSessions().then(data => {
      setSessions(data);
      if (data.length > 0) selectSession(data[0].id);
    }).catch(() => {});
  }, []);

  const selectSession = useCallback(async (id) => {
    setActiveSessionId(id);
    setStreamingContent('');
    try {
      const msgs = await chatService.getMessages(id);
      setMessages(msgs);
    } catch {
      setMessages([]);
    }
  }, []);

  const handleCreateSession = async (mode, contextId, contextLabel) => {
    setShowNewChatModal(false);
    const session = await chatService.createSession(mode, contextId, contextLabel);
    setSessions(prev => [session, ...prev]);
    setActiveSessionId(session.id);
    setMessages([]);
    setStreamingContent('');
  };

  const handleDeleteSession = async (id) => {
    await chatService.deleteSession(id);
    setSessions(prev => prev.filter(s => s.id !== id));
    if (activeSessionId === id) {
      setActiveSessionId(null);
      setMessages([]);
    }
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isStreaming) return;

    let sessionId = activeSessionId;
    if (!sessionId) {
      const session = await chatService.createSession();
      setSessions(prev => [session, ...prev]);
      sessionId = session.id;
      setActiveSessionId(session.id);
    }

    const userMsg = { id: Date.now(), role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsStreaming(true);
    setStreamingContent('');

    let finalContent = '';
    await chatService.sendMessage(
      sessionId,
      text,
      (delta) => {
        finalContent += delta;
        setStreamingContent(finalContent);
      },
      (full) => {
        setMessages(prev => [...prev, { id: Date.now() + 1, role: 'assistant', content: full }]);
        setStreamingContent('');
        setIsStreaming(false);
        // Update session title in sidebar
        chatService.getSessions().then(data => setSessions(data)).catch(() => {});
      }
    );
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const hasNoSession = !activeSessionId;
  const activeSession = sessions.find(s => s.id === activeSessionId);
  const activeModeMeta = MODE_META[activeSession?.mode] || MODE_META.general;

  return (
    <div className="flex h-[calc(100vh-5rem)] -m-6 rounded-8 overflow-hidden border border-neutral-200 dark:border-slate-700 bg-neutral-50 dark:bg-slate-900">
      {/* Sidebar */}
      <SessionSidebar
        sessions={sessions}
        activeId={activeSessionId}
        onSelect={selectSession}
        onNew={() => setShowNewChatModal(true)}
        onDelete={handleDeleteSession}
      />
      {showNewChatModal && (
        <NewChatModal onClose={() => setShowNewChatModal(false)} onCreate={handleCreateSession} />
      )}

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-neutral-900 dark:text-white">Hexa Medical AI</h2>
            <p className="text-xs text-neutral-500 dark:text-slate-400">Clinical Intelligence Assistant</p>
          </div>
          {activeSession && (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-neutral-100 dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 text-xs font-medium text-neutral-700 dark:text-slate-300">
              <activeModeMeta.icon className="w-3.5 h-3.5" />
              {activeSession.mode === 'general' ? 'General' : `${activeModeMeta.label}: ${activeSession.contextLabel || activeSession.contextId}`}
            </span>
          )}
          <div className="ml-auto flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-success-500 animate-pulse" />
            <span className="text-xs text-success-600 dark:text-success-500 font-medium">Online</span>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {hasNoSession && messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
              <Bot className="w-10 h-10 text-primary-500" strokeWidth={1.5} />
              <div>
                <h3 className="text-lg font-bold text-neutral-900 dark:text-white">Hexa Medical AI</h3>
                <p className="text-sm text-neutral-500 dark:text-slate-400 mt-1 max-w-sm">
                  Ask me about ICD-10 codes, differential diagnoses, treatment pathways, lab values, or any clinical question.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2 w-full max-w-md">
                {[
                  "What are the ICD-10 codes for Type 2 Diabetes?",
                  "Differential diagnosis for chest pain in a 45yo male",
                  "CPT codes for an office visit with complex MDM",
                  "Treatment pathway for community-acquired pneumonia"
                ].map(q => (
                  <button
                    key={q}
                    onClick={() => { setInput(q); textareaRef.current?.focus(); }}
                    className="text-left px-3 py-2.5 rounded-6 border border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-neutral-700 dark:text-slate-300 hover:border-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map(m => <MessageBubble key={m.id} role={m.role} content={m.content} />)}

          {/* Streaming bubble */}
          {isStreaming && streamingContent && (
            <MessageBubble role="assistant" content={streamingContent + '▍'} />
          )}
          {isStreaming && !streamingContent && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="bg-white dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 rounded-8 rounded-tl-sm px-4 py-3 flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-primary-500" />
                <span className="text-xs text-neutral-500 dark:text-neutral-400">Thinking...</span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-900">
          <div className="flex items-end gap-3 bg-neutral-50 dark:bg-slate-800 border border-neutral-200 dark:border-slate-600 rounded-8 px-4 py-3 focus-within:border-primary-400 focus-within:ring-2 focus-within:ring-primary-100 dark:focus-within:ring-primary-900/30 transition-all">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a clinical question... (Enter to send, Shift+Enter for newline)"
              rows={1}
              className="flex-1 bg-transparent text-sm text-neutral-900 dark:text-slate-100 placeholder-neutral-400 resize-none outline-none max-h-32"
              style={{ lineHeight: '1.5' }}
            />
            <VoiceInputButton
              onTranscript={(text) => setInput(prev => (prev && !prev.endsWith(' ') && !prev.endsWith('\n') ? prev + ' ' : prev) + text)}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isStreaming}
              className="w-9 h-9 rounded-6 bg-primary-600 hover:bg-primary-700 disabled:bg-neutral-200 dark:disabled:bg-slate-700 flex items-center justify-center transition-colors flex-shrink-0"
            >
              {isStreaming
                ? <Loader2 className="w-4 h-4 text-white animate-spin" />
                : <Send className="w-4 h-4 text-white disabled:text-neutral-400" />
              }
            </button>
          </div>
          <p className="text-[11px] text-neutral-400 dark:text-slate-500 mt-2 text-center">
            AI responses are suggestions only and require physician validation.
          </p>
        </div>
      </div>
    </div>
  );
}
