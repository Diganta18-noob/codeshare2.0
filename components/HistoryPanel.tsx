'use client';

import { useState, useEffect, useCallback } from 'react';
import { useEditorStore } from '@/store/editorStore';
import { socket } from '@/lib/socket';

interface SnapshotItem {
  _id: string;
  code: string;
  language: string;
  label: string;
  createdAt: string;
}

interface HistoryPanelProps {
  roomId: string;
  isVisible: boolean;
  onToggle: () => void;
}

export default function HistoryPanel({ roomId, isVisible, onToggle }: HistoryPanelProps) {
  const { setCode, setLanguage, code, language } = useEditorStore();
  const [snapshots, setSnapshots] = useState<SnapshotItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [labelInput, setLabelInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const fetchSnapshots = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/rooms/${roomId}/snapshots`);
      const data = await res.json();
      if (data.success) {
        setSnapshots(data.snapshots);
      }
    } catch (err) {
      console.error('Failed to load snapshots:', err);
    } finally {
      setIsLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    if (isVisible) {
      fetchSnapshots();
    }
  }, [isVisible, fetchSnapshots]);

  const handleCreateSnapshot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    setIsSaving(true);

    try {
      const res = await fetch(`/api/rooms/${roomId}/snapshots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          language,
          label: labelInput.trim() || 'Manual Snapshot',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setLabelInput('');
        fetchSnapshots();
      }
    } catch (err) {
      console.error('Failed to create snapshot:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRestore = useCallback((snap: SnapshotItem) => {
    if (confirm(`Are you sure you want to restore the code to the snapshot from ${new Date(snap.createdAt).toLocaleString()}?`)) {
      setCode(snap.code);
      setLanguage(snap.language);
      
      // Sync across websockets
      socket.emit('code-change', { roomId, code: snap.code });
      socket.emit('language-change', { roomId, language: snap.language });

      // Persist to DB
      fetch(`/api/rooms/${roomId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: snap.code, language: snap.language }),
      }).catch((err) => console.error('[History] Failed to persist restoration:', err));
    }
  }, [roomId, setCode, setLanguage]);

  if (!isVisible) return null;

  return (
    <div className="chat-panel" style={{ borderLeft: '1px solid var(--bg-border)' }}>
      {/* Header */}
      <div className="chat-panel-header">
        <div className="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>Version History</span>
          <span className="chat-msg-count">{snapshots.length}</span>
        </div>
        <button onClick={onToggle} className="output-clear-btn" title="Close history">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Manual Snapshot Save Form */}
      <form onSubmit={handleCreateSnapshot} className="p-3 border-b" style={{ borderColor: 'var(--bg-border)' }}>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Label (e.g., Before refactoring)"
            value={labelInput}
            onChange={(e) => setLabelInput(e.target.value)}
            className="chat-input flex-1 py-1 text-xs"
            style={{ height: '32px' }}
          />
          <button
            type="submit"
            disabled={isSaving}
            className="btn-premium btn-premium-primary text-xs px-3"
            style={{ height: '32px' }}
          >
            Save
          </button>
        </div>
      </form>

      {/* Snapshots List */}
      <div className="chat-messages flex-1 overflow-y-auto p-3 flex flex-col gap-3">
        {isLoading && (
          <div className="text-center py-8 text-xs opacity-50">Loading versions...</div>
        )}

        {!isLoading && snapshots.length === 0 && (
          <div className="chat-empty">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="opacity-20">
              <path d="M12 8v4l3 3" />
              <circle cx="12" cy="12" r="9" />
            </svg>
            <span>No snapshots saved yet</span>
            <span className="text-[10px]">Snapshots will show up here.</span>
          </div>
        )}

        {!isLoading && snapshots.map((snap) => (
          <div
            key={snap._id}
            className="p-3 rounded-lg border flex flex-col gap-2 transition-all hover:bg-slate-900/40"
            style={{
              borderColor: 'var(--bg-border)',
              background: 'rgba(30, 41, 59, 0.2)',
            }}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-medium text-white truncate max-w-[150px]">
                  {snap.label || 'Snapshot'}
                </span>
                <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
                  {new Date(snap.createdAt).toLocaleString()}
                </span>
              </div>
              <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[9px] uppercase font-semibold text-slate-400">
                {snap.language}
              </span>
            </div>

            {/* Code Snippet Preview (first 2 lines) */}
            <pre
              className="text-[10px] p-2 rounded bg-black/40 overflow-hidden font-mono text-slate-400 max-h-[44px]"
              style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}
            >
              {snap.code.slice(0, 100) + (snap.code.length > 100 ? '...' : '')}
            </pre>

            <button
              onClick={() => handleRestore(snap)}
              className="btn-premium btn-premium-ghost py-1 text-[11px] w-full text-center mt-1"
            >
              Restore to Editor
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
