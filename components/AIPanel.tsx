'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useEditorStore } from '@/store/editorStore';
import { socket } from '@/lib/socket';
import { gsap } from 'gsap';

interface AIMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: number;
}

interface AIPanelProps {
  roomId: string;
  isVisible: boolean;
  onToggle: () => void;
}

export default function AIPanel({ roomId, isVisible, onToggle }: AIPanelProps) {
  const { code, language, setCode } = useEditorStore();
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isVisible && panelRef.current) {
      gsap.fromTo(
        panelRef.current,
        { x: 320, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.4, ease: 'power3.out' }
      );
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isVisible]);

  const [apiKey, setApiKey] = useState('');
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [savedKeySuccess, setSavedKeySuccess] = useState(false);

  useEffect(() => {
    const storedKey = localStorage.getItem('codeshare_gemini_api_key');
    if (storedKey) setApiKey(storedKey);
  }, []);

  const saveApiKey = (key: string) => {
    setApiKey(key);
    if (key.trim()) {
      localStorage.setItem('codeshare_gemini_api_key', key.trim());
      setSavedKeySuccess(true);
      setTimeout(() => setSavedKeySuccess(false), 2000);
    } else {
      localStorage.removeItem('codeshare_gemini_api_key');
    }
  };

  const handleSend = useCallback(async (promptText?: string, actionType?: string) => {
    const queryText = promptText || input.trim();
    if (!queryText && !actionType) return;

    if (!promptText) setInput('');

    const userMsg: AIMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: actionType ? `Triggered: ${actionType.toUpperCase()}` : queryText,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const storedKey = localStorage.getItem('codeshare_gemini_api_key') || apiKey;
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: queryText,
          code,
          language,
          action: actionType || '',
          apiKey: storedKey || undefined,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        const aiMsg: AIMessage = {
          id: `ai-${Date.now()}`,
          sender: 'ai',
          text: data.response,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, aiMsg]);
      } else {
        const errorMsg: AIMessage = {
          id: `error-${Date.now()}`,
          sender: 'ai',
          text: `Error: ${data.error || 'Failed to generate response'}`,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, errorMsg]);
      }
    } catch (err) {
      const errorMsg: AIMessage = {
        id: `error-${Date.now()}`,
        sender: 'ai',
        text: 'Failed to communicate with AI server.',
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  }, [input, code, language, apiKey]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const extractCode = (text: string): string | null => {
    // Regex to match markdown code blocks
    const match = text.match(/```[\w]*\n([\s\S]*?)\n```/);
    return match ? match[1] : null;
  };

  const handleApplyCode = (text: string) => {
    const extracted = extractCode(text);
    if (extracted) {
      if (confirm('Are you sure you want to replace the current editor contents with the code suggested by AI?')) {
        setCode(extracted);
        socket.emit('code-change', { roomId, code: extracted });
        fetch(`/api/rooms/${roomId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: extracted }),
        }).catch((err) => console.error('[AI] Save code failed:', err));
      }
    } else {
      alert('No code block found in AI response.');
    }
  };

  if (!isVisible) return null;

  return (
    <div ref={panelRef} className="chat-panel" style={{ borderLeft: '1px solid var(--bg-border)' }}>
      {/* Header */}
      <div className="chat-panel-header">
        <div className="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2a10 10 0 0 1 7.54 16.59l-1.42-1.42A8 8 0 1 0 6.08 14H8v2H3v-5h2v2.42A9.96 9.96 0 0 1 12 2zm1 6v3.59l2.71 2.71-1.42 1.42L11 11V8h2z" />
          </svg>
          <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>AI Code Assistant</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowKeyInput((p) => !p)}
            className={`output-clear-btn p-1 ${apiKey ? 'text-purple-400' : 'text-amber-400 animate-pulse'}`}
            title="Configure Groq or Gemini API Key"
          >
            🔑
          </button>
          <button onClick={onToggle} className="output-clear-btn" title="Close AI Assistant">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {/* API Key Drawer */}
      {showKeyInput && (
        <div className="p-3 border-b flex flex-col gap-2 bg-slate-900/90 text-xs" style={{ borderColor: 'var(--bg-border)' }}>
          <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
            Groq / Gemini API Key (Saved in Local Storage)
          </label>
          <div className="flex gap-1.5">
            <input
              type="password"
              placeholder="gsk_... or AIzaSy..."
              value={apiKey}
              onChange={(e) => saveApiKey(e.target.value)}
              className="chat-input flex-1 py-1 px-2 text-xs font-mono"
            />
            {apiKey && (
              <button
                onClick={() => saveApiKey('')}
                className="px-2 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded text-[10px]"
              >
                Clear
              </button>
            )}
          </div>
          {savedKeySuccess && <span className="text-[10px] text-emerald-400">Key saved!</span>}
          <div className="flex justify-between text-[9px] text-slate-500">
            <span>Groq Key: <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer" className="text-purple-400 underline">console.groq.com</a></span>
            <span>Gemini Key: <a href="https://aistudio.google.com" target="_blank" rel="noreferrer" className="text-purple-400 underline">aistudio.google.com</a></span>
          </div>
        </div>
      )}

      {/* Quick Action Chips */}
      <div className="p-3 border-b flex flex-wrap gap-1.5" style={{ borderColor: 'var(--bg-border)' }}>
        <button
          onClick={() => handleSend('', 'explain')}
          disabled={isLoading}
          className="rounded-full border px-2.5 py-1 text-[10px] font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-transform hover:-translate-y-0.5"
          style={{ borderColor: 'var(--bg-border)' }}
        >
          💡 Explain
        </button>
        <button
          onClick={() => handleSend('', 'bugs')}
          disabled={isLoading}
          className="rounded-full border px-2.5 py-1 text-[10px] font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-transform hover:-translate-y-0.5"
          style={{ borderColor: 'var(--bg-border)' }}
        >
          🐛 Find Bugs
        </button>
        <button
          onClick={() => handleSend('', 'refactor')}
          disabled={isLoading}
          className="rounded-full border px-2.5 py-1 text-[10px] font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-transform hover:-translate-y-0.5"
          style={{ borderColor: 'var(--bg-border)' }}
        >
          ✨ Refactor
        </button>
        <button
          onClick={() => handleSend('', 'tests')}
          disabled={isLoading}
          className="rounded-full border px-2.5 py-1 text-[10px] font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-transform hover:-translate-y-0.5"
          style={{ borderColor: 'var(--bg-border)' }}
        >
          🧪 Unit Tests
        </button>
      </div>

      {/* Messages Log */}
      <div className="chat-messages flex-1 overflow-y-auto p-3 flex flex-col gap-3" data-lenis-prevent>
        {messages.length === 0 && (
          <div className="chat-empty">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="opacity-20">
              <path d="M12 2a10 10 0 0 1 10 10c0 5.52-4.48 10-10 10S2 17.52 2 12s8-10 10-10z" />
            </svg>
            <span>Ask Gemini anything about this code</span>
            <span className="text-[10px]">Use quick actions or type questions below.</span>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`p-3 rounded-lg border max-w-[90%] flex flex-col gap-1.5 ${
              msg.sender === 'user'
                ? 'self-end bg-blue-900/10 border-blue-500/20 text-right'
                : 'self-start bg-slate-900/40 border-slate-700/30'
            }`}
          >
            <span className="text-[9px] uppercase tracking-wider font-semibold opacity-40">
              {msg.sender === 'user' ? 'You' : 'Gemini'}
            </span>
            <div
              className="text-xs text-slate-200 leading-relaxed font-sans select-text text-left"
              style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
            >
              {msg.text}
            </div>

            {msg.sender === 'ai' && msg.text.includes('API key') && (
              <button
                onClick={() => setShowKeyInput(true)}
                className="mt-2 px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-amber-500/30"
              >
                🔑 Click to Enter Gemini API Key
              </button>
            )}

            {msg.sender === 'ai' && extractCode(msg.text) && (
              <button
                onClick={() => handleApplyCode(msg.text)}
                className="btn-premium btn-premium-primary btn-shimmer text-[10px] py-1 mt-1.5 w-full text-center"
              >
                ✦ Apply code suggestions to editor
              </button>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="self-start bg-slate-900/40 border border-slate-700/30 p-3 rounded-lg max-w-[80%] flex flex-col gap-1">
            <span className="text-[9px] uppercase tracking-wider font-semibold opacity-40">Gemini</span>
            <span className="text-xs text-slate-400">Gemini is thinking...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="chat-input-area">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask Gemini to write/refactor code..."
          className="chat-input"
          disabled={isLoading}
        />
        <button
          onClick={() => handleSend()}
          disabled={!input.trim() || isLoading}
          className="chat-send-btn"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
    </div>
  );
}
