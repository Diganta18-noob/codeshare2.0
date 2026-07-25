'use client';

import { useEffect, useState, useRef } from 'react';
import { useEditorStore } from '@/store/editorStore';
import { getLabelForLanguage } from '@/lib/languages';
import { gsap } from 'gsap';

interface StatusBarProps {
  roomId: string;
}

export default function StatusBar({ roomId }: StatusBarProps) {
  const { code, language, cursorPosition, createdAt } = useEditorStore();
  const charCount = code.length;
  const lineCount = code.split('\n').length;
  const langLabel = getLabelForLanguage(language);
  const [timeAgo, setTimeAgo] = useState<string>('');

  const langRef = useRef<HTMLDivElement>(null);
  const charRef = useRef<HTMLSpanElement>(null);
  const lineRef = useRef<HTMLSpanElement>(null);

  // 3D Card flip animation on language change
  useEffect(() => {
    if (langRef.current) {
      const tl = gsap.timeline();
      tl.to(langRef.current, { rotateX: 90, duration: 0.15, ease: 'power2.in' })
        .set(langRef.current, { color: '#8b5cf6' })
        .to(langRef.current, { rotateX: 0, duration: 0.2, ease: 'back.out(1.5)' });
    }
  }, [language]);

  // Pulse effect on char / line count changes
  useEffect(() => {
    if (charRef.current) {
      gsap.fromTo(
        charRef.current,
        { scale: 1.15, color: '#8b5cf6' },
        { scale: 1, color: 'var(--text-secondary)', duration: 0.25, ease: 'power1.out' }
      );
    }
  }, [charCount]);

  useEffect(() => {
    if (lineRef.current) {
      gsap.fromTo(
        lineRef.current,
        { scale: 1.15, color: '#8b5cf6' },
        { scale: 1, color: 'var(--text-secondary)', duration: 0.25, ease: 'power1.out' }
      );
    }
  }, [lineCount]);

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
      {/* Connection Breathing Status Indicator */}
      <div className="status-bar-item flex items-center gap-1.5 pr-1">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
      </div>

      <div className="status-bar-separator" />

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
        <span ref={charRef} className="inline-block transition-transform">{charCount.toLocaleString()} chars</span>
      </div>

      <div className="status-bar-separator status-bar-hide-tablet" />

      {/* Lines */}
      <div className="status-bar-item">
        <span ref={lineRef} className="inline-block transition-transform">{lineCount} lines</span>
      </div>

      <div className="status-bar-separator" />

      {/* Language with 3D Flip */}
      <div
        ref={langRef}
        className="status-bar-item font-semibold inline-block transition-transform origin-center"
        style={{ color: 'var(--accent-primary)', perspective: '400px' }}
      >
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

      {/* Active Room Workspace ID with hover expand */}
      <div className="status-bar-item text-[10px] status-bar-hide-mobile cursor-pointer group" style={{ color: 'var(--text-dim)' }}>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="opacity-40 group-hover:opacity-100 transition-opacity">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        <span className="font-mono transition-all duration-200 group-hover:tracking-wider group-hover:text-purple-400">
          room: {roomId}
        </span>
      </div>
    </div>
  );
}
