'use client';

import { useEditorStore } from '@/store/editorStore';
import { getLabelForLanguage } from '@/lib/languages';

interface StatusBarProps {
  roomId: string;
}

export default function StatusBar({ roomId }: StatusBarProps) {
  const { code, language, cursorPosition } = useEditorStore();
  const charCount = code.length;
  const lineCount = code.split('\n').length;
  const langLabel = getLabelForLanguage(language);

  return (
    <div className="status-bar">
      {/* Position */}
      <div className="status-bar-item">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="opacity-60">
          <path d="M4 6h16M4 12h10M4 18h16" strokeLinecap="round"/>
        </svg>
        <span>Ln {cursorPosition.lineNumber}, Col {cursorPosition.column}</span>
      </div>

      <div className="status-bar-separator" />

      {/* Characters */}
      <div className="status-bar-item">
        <span>{charCount.toLocaleString()} chars</span>
      </div>

      <div className="status-bar-separator" />

      {/* Lines */}
      <div className="status-bar-item">
        <span>{lineCount} lines</span>
      </div>

      <div className="status-bar-separator" />

      {/* Language */}
      <div className="status-bar-item font-semibold" style={{ color: 'var(--accent-primary)' }}>
        {langLabel}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Active Room Workspace ID */}
      <div className="status-bar-item text-[10px]" style={{ color: 'var(--text-dim)' }}>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="opacity-40">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        <span>room: {roomId}</span>
      </div>
    </div>
  );
}
