'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { socket } from '@/lib/socket';
import { useEditorStore } from '@/store/editorStore';
import { LANGUAGES, getExtensionForLanguage } from '@/lib/languages';
import PresenceDot from '@/components/PresenceDot';

interface ToolbarProps {
  roomId: string;
  isReadOnly: boolean;
}

export default function Toolbar({ roomId, isReadOnly }: ToolbarProps) {
  const router = useRouter();
  const { language, setLanguage, code } = useEditorStore();
  const [copied, setCopied] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const handleLanguageChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newLang = e.target.value;
      setLanguage(newLang);
      socket.emit('language-change', { roomId, language: newLang });

      // Persist to DB
      fetch(`/api/rooms/${roomId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: newLang }),
      }).catch((err) => console.error('[Toolbar] Language save failed:', err));
    },
    [roomId, setLanguage]
  );

  const handleCopyUrl = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy URL:', err);
    }
  }, []);

  const handleNewPad = useCallback(async () => {
    setIsCreating(true);
    try {
      const res = await fetch('/api/rooms', { method: 'POST' });
      const data = await res.json();
      router.push(`/c/${data.roomId}`);
    } catch (err) {
      console.error('Failed to create pad:', err);
      setIsCreating(false);
    }
  }, [router]);

  const handleDownload = useCallback(() => {
    const ext = getExtensionForLanguage(language);
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `codeshare-${roomId.slice(0, 6)}${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [code, language, roomId]);

  const handleCopyCode = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  }, [code]);

  return (
    <div
      className="flex items-center justify-between px-6 flex-shrink-0"
      style={{
        height: '52px',
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--bg-border)',
      }}
    >
      {/* Left section: Logo + Language */}
      <div className="flex items-center gap-4">
        {/* Logo */}
        <span
          className="font-mono text-sm font-bold tracking-tight select-none cursor-pointer"
          style={{ color: 'var(--accent-primary)' }}
          onClick={() => router.push('/')}
        >
          {'{ codeshare }'}
        </span>

        {/* Divider */}
        <div
          style={{
            width: '1px',
            height: '18px',
            background: 'var(--bg-border)',
          }}
        />

        {/* Language selector */}
        <div className="custom-select-wrapper">
          <select
            className="custom-select"
            value={language}
            onChange={handleLanguageChange}
            disabled={isReadOnly}
            id="language-selector"
          >
            {LANGUAGES.map((lang) => (
              <option key={lang.id} value={lang.id}>
                {lang.label}
              </option>
            ))}
          </select>
        </div>

        {/* Presence */}
        <PresenceDot />

        {/* Read-only badge */}
        {isReadOnly && (
          <span
            className="rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border"
            style={{
              background: 'rgba(245, 158, 11, 0.08)',
              color: '#f59e0b',
              borderColor: 'rgba(245, 158, 11, 0.2)',
            }}
          >
            Read Only
          </span>
        )}
      </div>

      {/* Right section: Actions */}
      <div className="flex items-center gap-3">
        {isReadOnly ? (
          <button
            onClick={handleCopyCode}
            className="btn-premium btn-premium-ghost py-1.5 px-4"
            id="copy-code-btn"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="opacity-80">
              <rect x="5" y="5" width="9" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
              <path d="M11 5V3.5A1.5 1.5 0 009.5 2h-6A1.5 1.5 0 002 3.5v6A1.5 1.5 0 003.5 11H5" stroke="currentColor" strokeWidth="1.5" />
            </svg>
            Copy Code
          </button>
        ) : (
          <>
            <button
              onClick={handleNewPad}
              disabled={isCreating}
              className="btn-premium btn-premium-primary py-1.5 px-4"
              id="new-pad-btn"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              {isCreating ? 'Creating...' : 'New Pad'}
            </button>

            <button
              onClick={handleCopyUrl}
              className="btn-premium btn-premium-ghost py-1.5 px-4"
              id="copy-url-btn"
            >
              {copied ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <path d="M3 8.5l3 3 7-7" stroke="var(--accent-green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span style={{ color: 'var(--accent-green)' }}>Copied!</span>
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="opacity-80">
                    <path d="M6.5 10.5L3.75 13.25a1.77 1.77 0 01-2.5-2.5L4 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    <path d="M9.5 5.5l2.75-2.75a1.77 1.77 0 012.5 2.5L12 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    <path d="M6 10l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  Copy URL
                </>
              )}
            </button>

            <button
              onClick={handleDownload}
              className="btn-premium btn-premium-ghost py-1.5 px-4"
              id="download-btn"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="opacity-80">
                <path d="M8 2v9M4.5 7.5L8 11l3.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M2 13h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              Save & Download
            </button>
          </>
        )}
      </div>
    </div>
  );
}
