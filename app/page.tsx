'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function HomePage() {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [customName, setCustomName] = useState('');

  const handleCreatePad = async () => {
    setIsCreating(true);
    try {
      const res = await fetch('/api/rooms', { method: 'POST' });
      const data = await res.json();
      router.push(`/c/${data.roomId}`);
    } catch (err) {
      console.error('Failed to create pad:', err);
      setIsCreating(false);
    }
  };

  const handleCustomJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const name = customName.trim();
    if (name) {
      router.push(`/c/${encodeURIComponent(name)}`);
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCustomJoin(e);
    }
  };

  return (
    <div className="grid-pattern relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4">
      {/* Ambient glow */}
      <div className="radial-glow" />
      <div className="noise-overlay" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center">
        {/* Logo */}
        <h1
          className="mb-6 font-mono text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl"
          style={{ color: 'var(--accent-amber)' }}
        >
          {'{ codeshare }'}
        </h1>

        {/* Tagline */}
        <p
          className="mb-2 text-lg sm:text-xl"
          style={{ color: 'var(--text-primary)' }}
        >
          Real-time code sharing.
        </p>
        <p
          className="mb-10 text-base sm:text-lg"
          style={{ color: 'var(--text-muted)' }}
        >
          No login. No setup. Just code.
        </p>

        {/* Custom room name input */}
        <form onSubmit={handleCustomJoin} className="mb-6 w-full max-w-md">
          <div
            className="flex items-center overflow-hidden"
            style={{
              borderRadius: '10px',
              border: '1px solid var(--bg-border)',
              background: 'var(--bg-surface)',
            }}
          >
            <span
              className="flex-shrink-0 px-4 py-3 font-mono text-sm select-none"
              style={{ color: 'var(--text-dim)' }}
            >
              codeshare/
            </span>
            <input
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder="your-name-here"
              className="flex-1 bg-transparent py-3 pr-2 font-mono text-sm outline-none"
              style={{ color: 'var(--text-primary)' }}
              id="custom-room-input"
              autoComplete="off"
              spellCheck={false}
            />
            <button
              type="submit"
              disabled={!customName.trim()}
              className="toolbar-btn toolbar-btn-primary mr-1.5 flex-shrink-0"
              style={{
                borderRadius: '7px',
                opacity: customName.trim() ? 1 : 0.4,
                fontSize: '13px',
                padding: '6px 16px',
              }}
            >
              Go →
            </button>
          </div>
        </form>

        {/* Divider */}
        <div className="mb-6 flex w-full max-w-xs items-center gap-3">
          <div className="flex-1 h-px" style={{ background: 'var(--bg-border)' }} />
          <span className="text-xs" style={{ color: 'var(--text-dim)' }}>or</span>
          <div className="flex-1 h-px" style={{ background: 'var(--bg-border)' }} />
        </div>

        {/* CTA Button */}
        <button
          onClick={handleCreatePad}
          disabled={isCreating}
          className="toolbar-btn toolbar-btn-primary mb-8 text-base px-8 py-3 transition-all"
          style={{
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: 600,
          }}
        >
          {isCreating ? (
            <>
              <span className="editor-skeleton-pulse" style={{ width: 16, height: 16, borderWidth: 2 }} />
              Creating...
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              Create Random Pad →
            </>
          )}
        </button>

        {/* Feature pills */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          {[
            '30+ languages',
            'Dark only',
            'Monaco Editor',
            'Real-time sync',
            'No account needed',
          ].map((feature) => (
            <span
              key={feature}
              className="rounded-full px-4 py-1.5 text-xs font-medium"
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--bg-border)',
                color: 'var(--text-muted)',
              }}
            >
              {feature}
            </span>
          ))}
        </div>

        {/* Footer */}
        <p
          className="mt-16 text-xs"
          style={{ color: 'var(--text-dim)' }}
        >
          Built with Monaco Editor · Socket.IO · MongoDB
        </p>
      </div>
    </div>
  );
}
