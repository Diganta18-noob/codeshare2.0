'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { socket } from '@/lib/socket';
import { useEditorStore } from '@/store/editorStore';
import { LANGUAGES } from '@/lib/languages';
import PresenceDot from '@/components/PresenceDot';
import UIIcon from '@/components/UIIcon';
import { gsap } from 'gsap';

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
  const [actionMessage, setActionMessage] = useState('');

  const toolbarRef = useRef<HTMLElement>(null);


  // Settings dropdown state
  const [showSettings, setShowSettings] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordStatus, setPasswordStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDetailsElement>(null);

  // A short entrance keeps the workspace calm and respects motion preferences.
  useEffect(() => {
    const media = gsap.matchMedia();
    media.add('(prefers-reduced-motion: no-preference)', () => {
      if (toolbarRef.current) {
        gsap.fromTo(toolbarRef.current, { y: -8, opacity: 0 }, {
          y: 0, opacity: 1, duration: 0.25, ease: 'power2.out',
        });
      }
    });
    return () => media.revert();
  }, []);
  // Unlock password states
  const [unlockPassword, setUnlockPassword] = useState('');
  const [showUnlockInput, setShowUnlockInput] = useState(false);
  const [unlockError, setUnlockError] = useState('');

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowSettings(false);
      }
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        menuRef.current.open = false;
      }
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape' && showSettings) {
        setShowSettings(false);
        dropdownRef.current?.querySelector('button')?.focus();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [showSettings]);

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
      setActionMessage('Couldn’t copy the link. Please try again.');
    }
  }, []);

  const handleCopyReadOnlyUrl = useCallback(async () => {
    try {
      const readOnlyUrl = window.location.origin + window.location.pathname + '?view=1';
      await navigator.clipboard.writeText(readOnlyUrl);
      setCopiedReadOnly(true);
      setTimeout(() => setCopiedReadOnly(false), 2000);
    } catch (err) {
      setActionMessage('Couldn’t copy the read-only link. Please try again.');
    }
  }, []);

  const handleNewPad = useCallback(async () => {
    if (isCreating) return;
    setIsCreating(true);
    try {
      const res = await fetch('/api/rooms', { method: 'POST' });
      if (!res.ok) throw new Error('Room creation failed');
      const data = await res.json();
      if (typeof data.roomId !== 'string' || !data.roomId.trim()) throw new Error('Missing room ID');
      router.push(`/c/${encodeURIComponent(data.roomId)}`);
    } catch (err) {
      setActionMessage('Couldn’t create a workspace. Please try again.');
      setIsCreating(false);
    }
  }, [router, isCreating]);

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
  }, [code, roomId]);

  const handleCopyCode = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setActionMessage('Code copied.');
    } catch (err) {
      setActionMessage('Couldn’t copy the code. Please try again.');
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
  };

  const handleVerifyAndUnlock = async (e: React.FormEvent) => {
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

  // Shared icon components
  const RunIcon = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  );

  const ChatIcon = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  );

  const HistoryIcon = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );

  const SettingsIcon = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  );

  // Settings dropdown JSX (shared between desktop and mobile)
  const settingsDropdown = showSettings && (
    <div
      className="absolute right-0 mt-2 p-4 rounded-xl border z-50 text-left flex flex-col gap-3"
      style={{
        width: 'min(280px, 90vw)',
        background: 'rgba(15, 23, 42, 0.95)',
        backdropFilter: 'blur(16px)',
        borderColor: 'var(--bg-border)',
        boxShadow: '0 10px 30px -5px rgba(0, 0, 0, 0.5)',
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
  );

  return (
    <header ref={toolbarRef} className="ws-header">
      <div className="ws-topbar">
        <a href="/" className="ws-brand" aria-label="CodeShare home"><span><UIIcon name="code" /></span>codeshare<span className="ws-brand-dot">.</span></a>
        <span className="ws-header-divider" aria-hidden="true" />
        <div className="ws-room"><UIIcon name="folder" /><span className="ws-room-label">Workspace</span><UIIcon name="chevron" /><strong title={roomId}>{roomId}</strong></div>
        <span className="ws-mode">{isReadOnly ? 'Read only' : isLocked ? 'Editing locked' : 'Shared room'}</span>
        <div className="ws-topbar-actions">
          <div className="ws-presence"><PresenceDot /></div>
          <button className="ws-share" onClick={handleCopyUrl} aria-label="Copy room link"><UIIcon name={copied ? 'check' : 'link'} /><span>{copied ? 'Link copied' : 'Share room'}</span></button>
          <details ref={menuRef} className="ws-more" onClick={(event) => {
            if ((event.target as HTMLElement).closest('button')) event.currentTarget.open = false;
          }} onKeyDown={(event) => {
            if (event.key === 'Escape') { event.currentTarget.open = false; event.currentTarget.querySelector('summary')?.focus(); }
          }}>
            <summary className="ws-icon-button" aria-label="More workspace actions" title="More workspace actions"><UIIcon name="more" /></summary>
            <div className="ws-menu">
              <div className="ws-menu-label">WORKSPACE ACTIONS</div>
              <button onClick={handleNewPad} disabled={isCreating}><UIIcon name="plus" />{isCreating ? 'Creating workspace…' : 'New workspace'}</button>
              <button onClick={handleCopyReadOnlyUrl}><UIIcon name={copiedReadOnly ? 'check' : 'eye'} />{copiedReadOnly ? 'Read-only link copied' : 'Copy read-only link'}</button>
              <button onClick={handleCopyCode}><UIIcon name="copy" />Copy code</button>
              <button onClick={handleDownload}><UIIcon name="download" />Download file</button>
              <div className="ws-menu-note">Your room link brings people here.</div>
            </div>
          </details>
        </div>
      </div>
      <div className="ws-toolrow" role="toolbar" aria-label="Editor toolbar">
        <div className="ws-editing-tools">
          <button onClick={onToggleFileTree} className={`ws-tool ws-files-toggle ${showFileTree ? 'is-active' : ''}`} aria-label="Toggle file tree" aria-pressed={showFileTree} title="Toggle file explorer"><UIIcon name="folder" /><span>Explorer</span></button>
          <span className="ws-tool-divider" />
          <div className="ws-language"><span className="ws-language-dot" /><select value={language} onChange={handleLanguageChange} disabled={isReadOnly} aria-label="Programming language" id="language-selector">{LANGUAGES.map((lang) => <option key={lang.id} value={lang.id}>{lang.label}</option>)}</select></div>
          {isReadOnly && <span className="ws-readonly"><UIIcon name="eye" />Read only</span>}
        </div>
        <div className="ws-utility-tools">
          <button onClick={onToggleOutput} className={`ws-run ${showOutput ? 'is-active' : ''}`} id="run-code-btn" aria-label="Run code" aria-pressed={showOutput} title="Run code (Ctrl+Enter)"><RunIcon /><span>Run</span><kbd>⌃ ↵</kbd></button>
          <span className="ws-tool-divider" />
          <button onClick={onToggleChat} className={`ws-tool ${showChat ? 'is-active' : ''}`} aria-label="Toggle chat" aria-pressed={showChat} title="Chat (Ctrl+Shift+C)" id="chat-toggle-btn"><ChatIcon /><span>Chat</span>{unreadChat > 0 && <b className="ws-unread">{unreadChat > 9 ? '9+' : unreadChat}</b>}</button>
          <button onClick={onToggleHistory} className={`ws-tool ${showHistory ? 'is-active' : ''}`} aria-label="Toggle history" aria-pressed={showHistory} title="History (Ctrl+Shift+H)" id="history-toggle-btn"><HistoryIcon /><span>History</span></button>
          <button onClick={onToggleAI} className={`ws-tool ws-ai ${showAI ? 'is-active' : ''}`} aria-label="Toggle AI assistant" aria-pressed={showAI} title="AI assistant (Ctrl+Shift+A)" id="ai-toggle-btn"><UIIcon name="sparkles" /><span>AI assistant</span></button>
          {!isReadOnly && <div className="ws-settings" ref={dropdownRef}>
            <button onClick={() => setShowSettings(!showSettings)} className={`ws-tool ${showSettings ? 'is-active' : ''}`} aria-label="Room settings" aria-expanded={showSettings} title="Room security settings"><SettingsIcon /><span>Settings</span></button>
            {settingsDropdown}
          </div>}
        </div>
      </div>
      <span className="sr-only" role="status">{copied ? 'Room link copied' : copiedReadOnly ? 'Read-only link copied' : ''}</span>
      {actionMessage && <div className="ws-notice" role="status"><span>{actionMessage}</span><button onClick={() => setActionMessage('')} aria-label="Dismiss notification"><UIIcon name="close" /></button></div>}
    </header>
  );
}
