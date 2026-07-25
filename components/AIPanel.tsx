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
  const [provider, setProvider] = useState<'auto' | 'omniroute' | 'groq' | 'gemini'>('auto');
  const [omnirouteUrl, setOmnirouteUrl] = useState('http://localhost:20128/v1');
  const [omnirouteModel, setOmnirouteModel] = useState('llama-3.3-70b-versatile');
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [savedKeySuccess, setSavedKeySuccess] = useState(false);

  useEffect(() => {
    const storedKey = localStorage.getItem('codeshare_gemini_api_key');
    const storedProvider = localStorage.getItem('codeshare_ai_provider') as any;
    const storedUrl = localStorage.getItem('codeshare_omniroute_url');
    const storedModel = localStorage.getItem('codeshare_omniroute_model');

    if (storedKey) setApiKey(storedKey);
    if (storedProvider) setProvider(storedProvider);
    if (storedUrl) setOmnirouteUrl(storedUrl);
    if (storedModel) setOmnirouteModel(storedModel);
  }, []);

  const saveSettings = (
    newKey?: string,
    newProvider?: 'auto' | 'omniroute' | 'groq' | 'gemini',
    newUrl?: string,
    newModel?: string
  ) => {
    const targetKey = newKey !== undefined ? newKey : apiKey;
    const targetProvider = newProvider !== undefined ? newProvider : provider;
    const targetUrl = newUrl !== undefined ? newUrl : omnirouteUrl;
    const targetModel = newModel !== undefined ? newModel : omnirouteModel;

    setApiKey(targetKey);
    setProvider(targetProvider);
    setOmnirouteUrl(targetUrl);
    setOmnirouteModel(targetModel);

    if (targetKey.trim()) localStorage.setItem('codeshare_gemini_api_key', targetKey.trim());
    else localStorage.removeItem('codeshare_gemini_api_key');

    localStorage.setItem('codeshare_ai_provider', targetProvider);
    localStorage.setItem('codeshare_omniroute_url', targetUrl);
    localStorage.setItem('codeshare_omniroute_model', targetModel);

    setSavedKeySuccess(true);
    setTimeout(() => setSavedKeySuccess(false), 2000);
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
      const storedProvider = localStorage.getItem('codeshare_ai_provider') || provider;
      const storedUrl = localStorage.getItem('codeshare_omniroute_url') || omnirouteUrl;
      const storedModel = localStorage.getItem('codeshare_omniroute_model') || omnirouteModel;

      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: queryText,
          code,
          language,
          action: actionType || '',
          apiKey: storedKey || undefined,
          provider: storedProvider,
          baseUrl: storedProvider === 'omniroute' || storedUrl ? storedUrl : undefined,
          model: storedProvider === 'omniroute' ? storedModel : undefined,
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
  }, [input, code, language, apiKey, provider, omnirouteUrl, omnirouteModel]);

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

      {/* API & Provider Settings Drawer */}
      {showKeyInput && (
        <div className="p-3 border-b flex flex-col gap-2.5 bg-slate-900/95 text-xs" style={{ borderColor: 'var(--bg-border)' }}>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              AI Provider Mode
            </label>
            <select
              value={provider}
              onChange={(e) => saveSettings(undefined, e.target.value as any)}
              className="chat-input py-1 px-2 text-xs font-sans"
            >
              <option value="auto">Auto-Detect (OpenRouter / Groq / Gemini / OmniRoute)</option>
              <option value="openrouter">OpenRouter Cloud AI (Free & Paid Models)</option>
              <option value="groq">Groq AI (gsk_...)</option>
              <option value="gemini">Google Gemini (AIzaSy...)</option>
              <option value="omniroute">OmniRoute / Custom Gateway (Local or Remote)</option>
            </select>
          </div>

          {/* OmniRoute Options */}
          {provider === 'omniroute' && (
            <div className="flex flex-col gap-2 p-2 rounded bg-white/5 border border-white/10">
              <div className="flex flex-col gap-1">
                <label className="text-[9px] uppercase font-bold text-cyan-400 tracking-wider">
                  OmniRoute / Gateway Base URL
                </label>
                <input
                  type="text"
                  placeholder="http://localhost:20128/v1"
                  value={omnirouteUrl}
                  onChange={(e) => saveSettings(undefined, undefined, e.target.value, undefined)}
                  className="chat-input py-1 px-2 text-xs font-mono"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[9px] uppercase font-bold text-cyan-400 tracking-wider">
                  Model Name
                </label>
                <input
                  type="text"
                  placeholder="llama-3.3-70b-versatile, claude-3-7-sonnet, deepseek-r1..."
                  value={omnirouteModel}
                  onChange={(e) => saveSettings(undefined, undefined, undefined, e.target.value)}
                  className="chat-input py-1 px-2 text-xs font-mono"
                />
              </div>
            </div>
          )}

          {/* API Key Input */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              API Key / Auth Token
            </label>
            <div className="flex gap-1.5">
              <input
                type="password"
                placeholder="sk-or-v1-..., gsk_..., or AIzaSy..."
                value={apiKey}
                onChange={(e) => saveSettings(e.target.value)}
                className="chat-input flex-1 py-1 px-2 text-xs font-mono"
              />
              {apiKey && (
                <button
                  onClick={() => saveSettings('')}
                  className="px-2 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded text-[10px]"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {savedKeySuccess && <span className="text-[10px] text-emerald-400 font-semibold">Settings saved!</span>}

          <div className="flex flex-col gap-1 text-[9px] text-slate-400 mt-1 pt-1 border-t border-white/5">
            <span>🌐 <b>OpenRouter (Free Key):</b> <a href="https://openrouter.ai/keys" target="_blank" rel="noreferrer" className="text-purple-400 underline">openrouter.ai/keys</a></span>
            <span>⚡ <b>Groq Key:</b> <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer" className="text-purple-400 underline">console.groq.com</a></span>
            <span>🚀 <b>OmniRoute Repo:</b> <a href="https://github.com/diegosouzapw/OmniRoute" target="_blank" rel="noreferrer" className="text-purple-400 underline">diegosouzapw/OmniRoute</a></span>
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
