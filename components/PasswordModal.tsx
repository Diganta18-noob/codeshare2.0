'use client';

import { useState, useRef, useEffect } from 'react';

interface PasswordModalProps {
  roomId: string;
  onSuccess: (code: string, language: string, createdAt: string) => void;
}

export default function PasswordModal({ roomId, onSuccess }: PasswordModalProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;

    setIsVerifying(true);
    setError('');

    try {
      const res = await fetch(`/api/rooms/${roomId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        onSuccess(data.code || '', data.language || 'javascript', data.createdAt || new Date().toISOString());
      } else {
        setError(data.error || 'Incorrect password');
        setPassword('');
        inputRef.current?.focus();
      }
    } catch (err) {
      setError('Failed to verify password');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={(e) => e.stopPropagation()}>
      <div className="modal-content" style={{ maxWidth: '400px' }}>
        {/* Lock Icon */}
        <div className="flex justify-center mb-4">
          <div
            className="flex items-center justify-center"
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid rgba(245, 158, 11, 0.2)',
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
        </div>

        <h2 className="text-center text-sm font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
          Password Protected
        </h2>
        <p className="text-center text-xs mb-6" style={{ color: 'var(--text-secondary)' }}>
          This room requires a password to access.
        </p>

        <form onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter room password"
            className="chat-input w-full mb-3"
            autoComplete="off"
            disabled={isVerifying}
          />

          {error && (
            <p className="text-xs mb-3 text-center" style={{ color: '#ef4444' }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={!password.trim() || isVerifying}
            className="btn-premium btn-premium-primary w-full py-2.5"
            style={{ width: '100%' }}
          >
            {isVerifying ? 'Verifying...' : 'Unlock Room'}
          </button>
        </form>
      </div>
    </div>
  );
}
