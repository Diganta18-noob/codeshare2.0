'use client';

import { useEffect, useState } from 'react';
import { useEditorStore } from '@/store/editorStore';
import { getLabelForLanguage } from '@/lib/languages';

interface StatusBarProps {
  roomId: string;
}

export default function StatusBar({ roomId }: StatusBarProps) {
  const { code, language, cursorPosition, createdAt } = useEditorStore();
  const charCount = code.length;
  const lineCount = code.split('\n').length;
  const langLabel = getLabelForLanguage(language);
  const [timeAgo, setTimeAgo] = useState<string>('');

  useEffect(() => {
    if (!createdAt) return;

    const updateTime = () => {
      const createdDate = new Date(createdAt);
      const diffMs = Date.now() - createdDate.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      
      if (diffMins < 1) {
        setTimeAgo('Created just now');
        return;
      }
      
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 1) {
        setTimeAgo(`Created ${diffMins}m ago`);
        return;
      }
      
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays < 1) {
        setTimeAgo(`Created ${diffHours}h ago`);
        return;
      }
      
      setTimeAgo(`Created ${diffDays}d ago`);
    };

    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, [createdAt]);

  return (
    <div className="status-bar" role="status" aria-label="Editor status bar">
      {/* Position */}
      <div className="status-bar-item">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="opacity-60">
          <path d="M4 6h16M4 12h10M4 18h16" strokeLinecap="round"/>
        </svg>
        <span>Ln {cursorPosition.lineNumber}, Col {cursorPosition.column}</span>
      </div>

      <div className="status-bar-separator" />

      {/* Characters */}
      <div className="status-bar-item status-bar-hide-tablet">
        <span>{charCount.toLocaleString()} chars</span>
      </div>

      <div className="status-bar-separator status-bar-hide-tablet" />

      {/* Lines */}
      <div className="status-bar-item">
        <span>{lineCount} lines</span>
      </div>

      <div className="status-bar-separator" />

      {/* Language */}
      <div className="status-bar-item font-semibold" style={{ color: 'var(--accent-primary)' }}>
        {langLabel}
      </div>

      {timeAgo && (
        <>
          <div className="status-bar-separator status-bar-hide-mobile" />
          {/* Room Age / Creation Time */}
          <div className="status-bar-item text-[11px] status-bar-hide-mobile" style={{ color: 'var(--text-dim)' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="opacity-60">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span>{timeAgo}</span>
          </div>
        </>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Active Room Workspace ID */}
      <div className="status-bar-item text-[10px] status-bar-hide-mobile" style={{ color: 'var(--text-dim)' }}>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="opacity-40">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        <span>room: {roomId}</span>
      </div>
    </div>
  );
}
