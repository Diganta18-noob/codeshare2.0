'use client';

import { useState, useRef } from 'react';
import FileIcon from '@/components/FileIcon';
import UIIcon from '@/components/UIIcon';
import { useEditorStore } from '@/store/editorStore';
import { socket } from '@/lib/socket';
import { getLanguageForExtension } from '@/lib/languages';
import { usePanelEntrance } from '@/components/providers/usePanelEntrance';
import { useMobileDrawer } from '@/components/providers/useMobileDrawer';

interface FileTreeProps {
  roomId: string;
  isVisible: boolean;
  onToggle: () => void;
  isReadOnly?: boolean;
}

export default function FileTree({ roomId, isVisible, onToggle, isReadOnly = false }: FileTreeProps) {
  const { files, activeFileIndex, setActiveFileIndex, addFile, deleteFile, renameFile } = useEditorStore();
  const [newFileName, setNewFileName] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [renamingIndex, setRenamingIndex] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const sidebarRef = useRef<HTMLDivElement>(null);
  const filesListRef = useRef<HTMLDivElement>(null);

  usePanelEntrance(sidebarRef, isVisible, 'left');
  useMobileDrawer(sidebarRef, isVisible, onToggle);

  const handleCreateFile = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
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
    if (isReadOnly) return;
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
    if (isReadOnly) return;
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

  return (
    <>
      {/* Mobile drawer overlay */}
      <div
        className={`sidebar-drawer-overlay ${isVisible ? 'open' : ''}`}
        onClick={onToggle}
      />

      {/* Sidebar */}
      <div
        ref={sidebarRef}
        className={`sidebar ${isVisible ? 'sidebar-open' : ''}`}
        style={{ display: isVisible ? undefined : 'none' }}
        role="complementary"
        aria-label="File tree sidebar"
      >
        {/* Header */}
        <div className="sidebar-header relative">
          <span className="sidebar-header-title tracking-widest font-mono text-[10px] uppercase font-bold text-slate-400">
            Explorer
          </span>
          <div className="flex gap-2 items-center">
            {!isReadOnly && <button
              onClick={() => setIsAdding(!isAdding)}
              className="output-clear-btn p-1 pulse-ring-btn hover:scale-105 transition-transform"
              title="Create File"
              aria-label="Create new file"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>}
            <button onClick={onToggle} className="output-clear-btn p-1" title="Close sidebar" aria-label="Close sidebar">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        <div className="ws-explorer-root"><UIIcon name="chevron" /><UIIcon name="folder" /><span title={roomId}>{roomId}</span><b>{files.length}</b></div>

        {/* Create New File Form */}
        {isAdding && !isReadOnly && (
          <form onSubmit={handleCreateFile} className="p-3 border-b" style={{ borderColor: 'var(--bg-border)' }}>
            <input
              type="text"
              placeholder="filename.js"
              aria-label="New file name"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              className="chat-input w-full py-1.5 text-xs font-mono"
              autoFocus
              onBlur={() => {
                if (!newFileName.trim()) setIsAdding(false);
              }}
            />
          </form>
        )}

        {/* Files List */}
        <div ref={filesListRef} className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
          {files.map((file, idx) => {
            const isActive = idx === activeFileIndex;
            const isRenaming = idx === renamingIndex;

            return (
              <div
                key={file.name + '-' + idx}
                data-active={isActive}
                className={`file-item flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer group text-xs transition-all duration-200 ${
                  isActive ? 'border-l-3 border-[var(--accent-primary)] shadow-sm' : 'hover:translate-x-0.5'
                }`}
                style={{
                  borderLeft: isActive ? '3px solid var(--accent-primary)' : '3px solid transparent',
                  background: isActive ? 'rgba(139, 92, 246, 0.12)' : 'transparent',
                  color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                }}
              >
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <FileIcon name={file.name} />

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
                    <button className="ws-file-select" onClick={() => handleFileClick(idx)} aria-current={isActive ? 'true' : undefined} title={file.name}>{file.name}</button>
                  )}
                </div>

                {!isRenaming && !isReadOnly && (
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
