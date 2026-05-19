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
      <div className="status-bar-item">
        Ln {cursorPosition.lineNumber}, Col {cursorPosition.column}
      </div>

      <div className="status-bar-separator" />

      <div className="status-bar-item">
        {charCount.toLocaleString()} chars
      </div>

      <div className="status-bar-separator" />

      <div className="status-bar-item">
        {lineCount} lines
      </div>

      <div className="status-bar-separator" />

      <div className="status-bar-item" style={{ color: 'var(--accent-amber)' }}>
        {langLabel}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      <div className="status-bar-item" style={{ color: 'var(--text-dim)' }}>
        {roomId.slice(0, 8)}…
      </div>
    </div>
  );
}
