'use client';

import { useState } from 'react';
import { useEditorStore } from '@/store/editorStore';
import { socket } from '@/lib/socket';
import { getLanguageForExtension } from '@/lib/languages';

interface FileTreeProps {
  roomId: string;
  isVisible: boolean;
  onToggle: () => void;
}

export default function FileTree({ roomId, isVisible, onToggle }: FileTreeProps) {
  const { files, activeFileIndex, setActiveFileIndex, addFile, deleteFile, renameFile } = useEditorStore();
  const [newFileName, setNewFileName] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [renamingIndex, setRenamingIndex] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const handleCreateFile = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newFileName.trim();
    if (!name) return;

    // Determine language by extension
    const ext = name.split('.').pop() || '';
    const lang = getLanguageForExtension(ext);

    addFile(name, `// Code sharing pad for ${name}\n\n`, lang);
    setNewFileName('');
    setIsAdding(false);

    // Sync with sockets
    const updatedFiles = useEditorStore.getState().files;
    socket.emit('file-tree-change', { roomId, files: updatedFiles });
  };

  const handleDelete = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (files.length <= 1) {
      alert('You must keep at least one file in the workspace.');
      return;
    }
    const file = files[index];
    if (confirm(`Are you sure you want to delete ${file.name}?`)) {
      deleteFile(index);
      // Sync
      const updatedFiles = useEditorStore.getState().files;
      socket.emit('file-tree-change', { roomId, files: updatedFiles });
    }
  };

  const startRename = (index: number, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRenamingIndex(index);
    setRenameValue(name);
  };

  const handleRenameSubmit = (index: number) => {
    const val = renameValue.trim();
    if (val && val !== files[index].name) {
      renameFile(index, val);
      // Sync
      const updatedFiles = useEditorStore.getState().files;
      socket.emit('file-tree-change', { roomId, files: updatedFiles });
    }
    setRenamingIndex(null);
  };

  const handleFileClick = (index: number) => {
    setActiveFileIndex(index);
    socket.emit('file-switch', { roomId, activeFileIndex: index });
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'js':
      case 'jsx':
        return <span style={{ color: '#f7df1e' }}>JS</span>;
      case 'ts':
      case 'tsx':
        return <span style={{ color: '#3178c6' }}>TS</span>;
      case 'py':
        return <span style={{ color: '#3776ab' }}>PY</span>;
      case 'html':
        return <span style={{ color: '#e34f26' }}>H</span>;
      case 'css':
        return <span style={{ color: '#1572b6' }}>C</span>;
      case 'json':
        return <span style={{ color: '#8bc34a' }}>{'{}'}</span>;
      case 'md':
        return <span style={{ color: '#0086ff' }}>M↓</span>;
      default:
        return <span style={{ color: '#a0aec0' }}>📄</span>;
    }
  };

  return (
    <>
      {/* Mobile drawer overlay */}
      <div
        className={`sidebar-drawer-overlay ${isVisible ? 'open' : ''}`}
        onClick={onToggle}
      />

      {/* Sidebar */}
      <div
        className={`sidebar ${isVisible ? 'sidebar-open' : ''}`}
        style={{ display: isVisible ? undefined : 'none' }}
        role="complementary"
        aria-label="File tree sidebar"
      >
        {/* Header */}
        <div className="sidebar-header">
          <span className="sidebar-header-title">
            Workspace Files
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setIsAdding(!isAdding)}
              className="output-clear-btn p-1"
              title="Create File"
              aria-label="Create new file"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>
            <button onClick={onToggle} className="output-clear-btn p-1" title="Close sidebar" aria-label="Close sidebar">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Create New File Form */}
        {isAdding && (
          <form onSubmit={handleCreateFile} className="p-3 border-b" style={{ borderColor: 'var(--bg-border)' }}>
            <input
              type="text"
              placeholder="filename.js"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              className="chat-input w-full py-1.5 text-xs"
              autoFocus
              onBlur={() => {
                if (!newFileName.trim()) setIsAdding(false);
              }}
            />
          </form>
        )}

        {/* Files List */}
        <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-0.5">
          {files.map((file, idx) => {
            const isActive = idx === activeFileIndex;
            const isRenaming = idx === renamingIndex;

            return (
              <div
                key={file.name + '-' + idx}
                onClick={() => !isRenaming && handleFileClick(idx)}
                className="flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer group text-xs transition-colors"
                style={{
                  background: isActive ? 'rgba(139, 92, 246, 0.08)' : 'transparent',
                  color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
                }}
              >
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <span className="font-bold font-mono text-[9px] w-5 text-center leading-none opacity-80 flex-shrink-0">
                    {getFileIcon(file.name)}
                  </span>

                  {isRenaming ? (
                    <input
                      type="text"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={() => handleRenameSubmit(idx)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRenameSubmit(idx);
                        if (e.key === 'Escape') setRenamingIndex(null);
                      }}
                      className="chat-input py-0 px-1 w-full text-xs font-mono"
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <span className="truncate font-mono">{file.name}</span>
                  )}
                </div>

                {!isRenaming && (
                  <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity flex-shrink-0">
                    <button
                      onClick={(e) => startRename(idx, file.name, e)}
                      className="p-1 hover:text-white transition-colors"
                      title="Rename File"
                      aria-label={`Rename ${file.name}`}
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => handleDelete(idx, e)}
                      className="p-1 hover:text-red-400 transition-colors"
                      title="Delete File"
                      aria-label={`Delete ${file.name}`}
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
