'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { socket } from '@/lib/socket';
import { useEditorStore } from '@/store/editorStore';
import { LANGUAGES } from '@/lib/languages';
import PresenceDot from '@/components/PresenceDot';

interface ToolbarProps {
  roomId: string;
  isReadOnly: boolean;
  showOutput: boolean;
  onToggleOutput: () => void;
  showChat: boolean;
  onToggleChat: () => void;
  unreadChat: number;
  // Lock / Password props
  isLocked: boolean;
  hasPassword: boolean;
  isLockedByMe: boolean;
  onToggleLock: () => void;
  onSetPassword: (password: string | null) => Promise<void>;
  onUnlockWithPassword: (password: string) => Promise<{ success: boolean; error?: string }>;
  // History props
  showHistory: boolean;
  onToggleHistory: () => void;
  // AI props
  showAI: boolean;
  onToggleAI: () => void;
  // FileTree props
  showFileTree: boolean;
  onToggleFileTree: () => void;
}

export default function Toolbar({
  roomId,
  isReadOnly,
  showOutput,
  onToggleOutput,
  showChat,
  onToggleChat,
  unreadChat,
  isLocked,
  hasPassword,
  isLockedByMe,
  onToggleLock,
  onSetPassword,
  onUnlockWithPassword,
  showHistory,
  onToggleHistory,
  showAI,
  onToggleAI,
  showFileTree,
  onToggleFileTree,
}: ToolbarProps) {
  const router = useRouter();
  const { language, setLanguage, code } = useEditorStore();
  const [copied, setCopied] = useState(false);
  const [copiedReadOnly, setCopiedReadOnly] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Settings dropdown state
  const [showSettings, setShowSettings] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordStatus, setPasswordStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Unlock password states
  const [unlockPassword, setUnlockPassword] = useState('');
  const [showUnlockInput, setShowUnlockInput] = useState(false);
  const [unlockError, setUnlockError] = useState('');

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowSettings(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const handleCopyReadOnlyUrl = useCallback(async () => {
    try {
      const readOnlyUrl = window.location.origin + window.location.pathname + '?view=1';
      await navigator.clipboard.writeText(readOnlyUrl);
      setCopiedReadOnly(true);
      setTimeout(() => setCopiedReadOnly(false), 2000);
    } catch (err) {
      console.error('Failed to copy Read-Only URL:', err);
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
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `codeshare-${roomId}.txt`;
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

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordInput.trim()) return;
    setPasswordStatus('saving');
    try {
      await onSetPassword(passwordInput);
      setPasswordStatus('success');
      setPasswordInput('');
      setTimeout(() => setPasswordStatus('idle'), 2000);
    } catch (err) {
      setPasswordStatus('error');
      setTimeout(() => setPasswordStatus('idle'), 2000);
    }
  };

  const handleRemovePassword = async () => {
    setPasswordStatus('saving');
    try {
      await onSetPassword(null);
      setPasswordInput('');
      setPasswordStatus('success');
      setTimeout(() => setPasswordStatus('idle'), 2000);
    } catch (err) {
      setPasswordStatus('error');
      setTimeout(() => setPasswordStatus('idle'), 2000);
    }
  };  const handleVerifyAndUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unlockPassword.trim()) return;
    setUnlockError('');
    const result = await onUnlockWithPassword(unlockPassword);
    if (result.success) {
      setShowUnlockInput(false);
      setUnlockPassword('');
    } else {
      setUnlockError(result.error || 'Incorrect password');
    }
  };

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

        {/* Sidebar Toggle */}
        <button
          onClick={onToggleFileTree}
          className={`btn-premium ${showFileTree ? 'btn-premium-chat-active' : 'btn-premium-ghost'} p-1.5`}
          style={{ padding: '6px' }}
          title="Toggle File Tree"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </svg>
        </button>

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

        {/* Read-only / Locked badges */}
        {(isReadOnly || (isLocked && !isLockedByMe)) && (
          <span
            className="rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border cursor-pointer hover:opacity-80 transition"
            title={isLocked ? "Room is locked. Click settings to unlock." : "Read-only mode"}
            style={{
              background: isLocked ? 'rgba(239, 68, 68, 0.08)' : 'rgba(245, 158, 11, 0.08)',
              color: isLocked ? '#ef4444' : '#f59e0b',
              borderColor: isLocked ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)',
            }}
            onClick={() => {
              if (isLocked) {
                setShowSettings(true);
              }
            }}
          >
            {isLocked ? '🔒 Locked' : 'Read Only'}
          </span>
        )}
      </div>

      {/* Right section: Actions */}
      <div className="flex items-center gap-2">
        {/* Run Code Button */}
        <button
          onClick={onToggleOutput}
          className={`btn-premium ${showOutput ? 'btn-premium-run-active' : 'btn-premium-run'} py-1.5 px-3`}
          id="run-code-btn"
          title="Run Code (Ctrl+Enter)"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
          Run
        </button>

        {/* Chat Toggle Button */}
        <button
          onClick={onToggleChat}
          className={`btn-premium ${showChat ? 'btn-premium-chat-active' : 'btn-premium-ghost'} py-1.5 px-3 relative`}
          id="chat-toggle-btn"
          title="Chat (Ctrl+Shift+C)"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
          </svg>
          Chat
          {unreadChat > 0 && (
            <span className="chat-unread-badge">{unreadChat > 9 ? '9+' : unreadChat}</span>
          )}
        </button>

        {/* History Toggle Button */}
        <button
          onClick={onToggleHistory}
          className={`btn-premium ${showHistory ? 'btn-premium-chat-active' : 'btn-premium-ghost'} py-1.5 px-3`}
          id="history-toggle-btn"
          title="History (Ctrl+Shift+H)"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          History
        </button>

        {/* AI Assistant Toggle Button */}
        <button
          onClick={onToggleAI}
          className={`btn-premium ${showAI ? 'btn-premium-chat-active' : 'btn-premium-ghost'} py-1.5 px-3`}
          id="ai-toggle-btn"
          title="AI Assistant (Ctrl+Shift+A)"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2a10 10 0 0 1 7.54 16.59l-1.42-1.42A8 8 0 1 0 6.08 14H8v2H3v-5h2v2.42A9.96 9.96 0 0 1 12 2zm1 6v3.59l2.71 2.71-1.42 1.42L11 11V8h2z" />
          </svg>
          AI
        </button>

        {/* Room Lock & settings dropdown */}
        {!isReadOnly && (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`btn-premium ${showSettings ? 'btn-premium-chat-active' : 'btn-premium-ghost'} py-1.5 px-3`}
              title="Room Settings"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
              </svg>
              Settings
            </button>

            {showSettings && (
              <div
                className="absolute right-0 mt-2 p-4 rounded-xl border z-50 text-left flex flex-col gap-3"
                style={{
                  width: '280px',
                  background: 'rgba(15, 23, 42, 0.95)',
                  backdropFilter: 'blur(12px)',
                  borderColor: 'var(--bg-border)',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
                }}
              >
                <h4 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                  Room Security
                </h4>

                {/* Lock Toggle */}
                <div className="flex flex-col gap-2 py-1 border-b" style={{ borderColor: 'var(--bg-border)' }}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs" style={{ color: 'var(--text-primary)' }}>
                      Lock Room Editing
                    </span>
                    {isLocked && hasPassword && !isLockedByMe ? (
                      <button
                        onClick={() => {
                          setShowUnlockInput(!showUnlockInput);
                          setUnlockError('');
                        }}
                        className={`btn-premium ${showUnlockInput ? 'btn-premium-run-active' : 'btn-premium-ghost'} py-1 px-2.5 text-xs`}
                      >
                        {showUnlockInput ? 'Cancel' : 'Unlock...'}
                      </button>
                    ) : (
                      <button
                        onClick={onToggleLock}
                        className={`btn-premium ${isLocked ? 'btn-premium-run-active' : 'btn-premium-ghost'} py-1 px-2.5 text-xs`}
                      >
                        {isLocked ? 'Locked' : 'Unlock'}
                      </button>
                    )}
                  </div>
                  {isLocked && hasPassword && !isLockedByMe && showUnlockInput && (
                    <form onSubmit={handleVerifyAndUnlock} className="flex flex-col gap-1.5 mt-1">
                      <div className="flex gap-1.5">
                        <input
                          type="password"
                          placeholder="Password to unlock"
                          value={unlockPassword}
                          onChange={(e) => {
                            setUnlockPassword(e.target.value);
                            setUnlockError('');
                          }}
                          className="chat-input flex-1 py-1 text-xs"
                          style={{ height: '28px' }}
                        />
                        <button
                          type="submit"
                          className="btn-premium btn-premium-primary text-xs px-2.5"
                          style={{ height: '28px' }}
                        >
                          Verify
                        </button>
                      </div>
                      {unlockError && (
                        <span className="text-[10px] text-red-400">{unlockError}</span>
                      )}
                    </form>
                  )}
                </div>

                {/* Password Setting Form */}
                <form onSubmit={handleSavePassword} className="flex flex-col gap-2">
                  <span className="text-xs" style={{ color: 'var(--text-primary)' }}>
                    {hasPassword ? 'Password is Active' : 'Set Access Password'}
                  </span>
                  <div className="flex gap-1.5">
                    <input
                      type="password"
                      placeholder={hasPassword ? 'Enter new password' : 'Set password'}
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      className="chat-input flex-1 py-1 text-xs"
                      style={{ height: '28px' }}
                    />
                    <button
                      type="submit"
                      className="btn-premium btn-premium-primary text-xs px-2.5"
                      style={{ height: '28px' }}
                      disabled={passwordStatus === 'saving'}
                    >
                      Save
                    </button>
                  </div>
                  {hasPassword && (
                    <button
                      type="button"
                      onClick={handleRemovePassword}
                      className="text-left text-[10px] text-red-400 hover:text-red-300 transition-colors"
                      style={{ color: '#ef4444' }}
                    >
                      Remove Password
                    </button>
                  )}
                  {passwordStatus === 'saving' && <p className="text-[10px] text-blue-400">Saving password...</p>}
                  {passwordStatus === 'success' && <p className="text-[10px] text-green-400">Success!</p>}
                  {passwordStatus === 'error' && <p className="text-[10px] text-red-400">Error saving password.</p>}
                </form>
              </div>
            )}
          </div>
        )}

        {/* Divider */}
        <div style={{ width: '1px', height: '18px', background: 'var(--bg-border)' }} />

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
              onClick={handleCopyReadOnlyUrl}
              className="btn-premium btn-premium-ghost py-1.5 px-4"
              id="copy-readonly-url-btn"
              title="Copy link that only allows reading/viewing"
            >
              {copiedReadOnly ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <path d="M3 8.5l3 3 7-7" stroke="var(--accent-green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span style={{ color: 'var(--accent-green)' }}>Copied Read-Only!</span>
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="opacity-80">
                    <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
                    <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.5" />
                  </svg>
                  Copy Read-Only Link
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
