'use client';

import { useState, useEffect } from 'react';
import { useEditorStore } from '@/store/editorStore';
import { socket } from '@/lib/socket';

interface Version {
  _id: string;
  roomId: string;
  code: string;
  language: string;
  files: any[];
  savedBy: string;
  createdAt: string;
}

interface HistoryPanelProps {
  roomId: string;
  isOpen: boolean;
  onClose: () => void;
  isReadOnly: boolean;
}

export default function HistoryPanel({ roomId, isOpen, onClose, isReadOnly }: HistoryPanelProps) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { setCode, setFiles, setLanguage, code, files, language } = useEditorStore();

  const fetchVersions = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/rooms/${roomId}/versions`);
      if (res.ok) {
        const data = await res.json();
        setVersions(data.versions || []);
      }
    } catch (err) {
      console.error('Failed to fetch versions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchVersions();
    }
  }, [isOpen, roomId]);

  const handleSaveVersion = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/rooms/${roomId}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          files,
          language,
          savedBy: socket.id ? `User-${socket.id.slice(-4)}` : 'Manual Save',
        }),
      });
      if (res.ok) {
        await fetchVersions();
      }
    } catch (err) {
      console.error('Failed to save version:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleRestore = (version: Version) => {
    if (isReadOnly) return;
    if (!confirm('Are you sure you want to restore this version? This will overwrite the current editor state.')) return;

    if (version.files && version.files.length > 0) {
      setFiles(version.files);
      socket.emit('file-tree-change', { roomId, files: version.files });
      socket.emit('code-change', { roomId, code: version.files[0].code, files: version.files });
    } else {
      setCode(version.code);
      setLanguage(version.language);
      socket.emit('code-change', { roomId, code: version.code, files: [] });
      socket.emit('language-change', { roomId, language: version.language });
    }
    
    // Automatically save a new version of the state before restore
    fetch(`/api/rooms/${roomId}/versions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        files,
        language,
        savedBy: 'Auto-save (Before Restore)',
      }),
    });

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="absolute inset-y-0 right-0 w-80 bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col z-40 animate-fade-in font-sans">
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-850">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          Version History
        </h3>
        <button onClick={onClose} className="text-slate-400 hover:text-white transition">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {!isReadOnly && (
        <div className="p-4 border-b border-slate-800 bg-slate-900/50">
          <button
            onClick={handleSaveVersion}
            disabled={saving}
            className="w-full btn-premium btn-premium-primary text-xs py-2 justify-center"
          >
            {saving ? 'Saving...' : '💾 Save Current State'}
          </button>
          <p className="text-[10px] text-slate-500 mt-2 text-center">
            Max 30 versions stored per room
          </p>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-32 gap-3 text-slate-500">
            <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-medium">Loading history...</span>
          </div>
        ) : versions.length === 0 ? (
          <div className="text-center text-slate-500 text-xs py-8">
            No saved versions yet.
          </div>
        ) : (
          versions.map((version) => (
            <div key={version._id} className="bg-slate-850 border border-slate-800 rounded-xl p-3 hover:border-slate-700 transition-colors group">
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-semibold text-slate-300">
                  {new Date(version.createdAt).toLocaleString()}
                </span>
              </div>
              <div className="text-[10px] text-slate-500 mb-3 flex items-center justify-between">
                <span>Saved by: <span className="text-violet-300">{version.savedBy}</span></span>
                <span className="uppercase text-slate-400 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                  {version.language}
                </span>
              </div>
              {!isReadOnly && (
                <button
                  onClick={() => handleRestore(version)}
                  className="w-full text-xs font-medium bg-slate-900 border border-slate-700 hover:bg-violet-600 hover:border-violet-500 hover:text-white text-slate-300 py-1.5 rounded transition-all opacity-0 md:opacity-100 lg:opacity-0 group-hover:opacity-100"
                >
                  Restore Version
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
