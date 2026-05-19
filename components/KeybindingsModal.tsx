'use client';

import { useEffect, useRef } from 'react';

interface KeybindingsModalProps {
  onClose: () => void;
}

const KEYBINDINGS = [
  { keys: 'Ctrl + /', description: 'Toggle keyboard shortcuts' },
  { keys: 'Ctrl + S', description: 'Save (auto-saves to cloud)' },
  { keys: 'Ctrl + Z', description: 'Undo' },
  { keys: 'Ctrl + Shift + Z', description: 'Redo' },
  { keys: 'Ctrl + D', description: 'Select next occurrence' },
  { keys: 'Ctrl + Shift + L', description: 'Select all occurrences' },
  { keys: 'Ctrl + F', description: 'Find' },
  { keys: 'Ctrl + H', description: 'Find and replace' },
  { keys: 'Alt + ↑/↓', description: 'Move line up/down' },
  { keys: 'Ctrl + Shift + K', description: 'Delete line' },
  { keys: 'Ctrl + ]', description: 'Indent line' },
  { keys: 'Ctrl + [', description: 'Outdent line' },
  { keys: 'Ctrl + /', description: 'Toggle comment' },
  { keys: 'Ctrl + G', description: 'Go to line' },
  { keys: 'Ctrl + P', description: 'Quick open' },
];

export default function KeybindingsModal({ onClose }: KeybindingsModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className="modal-content" ref={modalRef}>
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2
            className="text-base font-semibold"
            style={{ color: 'var(--text-primary)' }}
          >
            Keyboard Shortcuts
          </h2>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-7 h-7 rounded"
            style={{
              color: 'var(--text-muted)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 1l12 12M1 13L13 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Keybindings list */}
        <div className="flex flex-col gap-1">
          {KEYBINDINGS.map((kb, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between py-2 px-1"
              style={{
                borderBottom: idx < KEYBINDINGS.length - 1 ? '1px solid var(--bg-border)' : 'none',
              }}
            >
              <span
                className="text-sm"
                style={{ color: 'var(--text-muted)' }}
              >
                {kb.description}
              </span>
              <kbd
                className="inline-flex items-center gap-1 rounded px-2 py-0.5 font-mono text-xs"
                style={{
                  background: 'var(--bg-base)',
                  border: '1px solid var(--bg-border)',
                  color: 'var(--text-primary)',
                }}
              >
                {kb.keys}
              </kbd>
            </div>
          ))}
        </div>

        {/* Footer hint */}
        <p
          className="mt-4 text-center text-xs"
          style={{ color: 'var(--text-dim)' }}
        >
          Press <kbd className="font-mono" style={{ color: 'var(--accent-amber)' }}>Esc</kbd> to close
        </p>
      </div>
    </div>
  );
}
