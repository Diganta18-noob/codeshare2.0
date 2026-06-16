'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { socket } from '@/lib/socket';

interface ChatMessage {
  id: string;
  type: 'user' | 'system';
  socketId?: string;
  text: string;
  color?: {
    id: string;
    bg: string;
    border: string;
    label: string;
  };
  timestamp: number;
}

interface ChatPanelProps {
  roomId: string;
  isVisible: boolean;
  onToggle: () => void;
  onNewMessage: () => void;
}

export default function ChatPanel({ roomId, isVisible, onToggle, onNewMessage }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when panel opens
  useEffect(() => {
    if (isVisible) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isVisible]);

  // Socket event listeners
  useEffect(() => {
    function onChatMessage(data: {
      socketId: string;
      text: string;
      color: ChatMessage['color'];
      timestamp: number;
    }) {
      const msg: ChatMessage = {
        id: `${data.socketId}-${data.timestamp}`,
        type: 'user',
        socketId: data.socketId,
        text: data.text,
        color: data.color,
        timestamp: data.timestamp,
      };
      setMessages((prev) => [...prev, msg]);
      if (!isVisible) onNewMessage();
    }

    function onSystemMessage(data: { text: string; timestamp: number }) {
      const msg: ChatMessage = {
        id: `sys-${data.timestamp}-${Math.random()}`,
        type: 'system',
        text: data.text,
        timestamp: data.timestamp,
      };
      setMessages((prev) => [...prev, msg]);
    }

    socket.on('chat-message', onChatMessage);
    socket.on('system-message', onSystemMessage);

    return () => {
      socket.off('chat-message', onChatMessage);
      socket.off('system-message', onSystemMessage);
    };
  }, [isVisible, onNewMessage]);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text) return;

    socket.emit('chat-send', { roomId, text });
    setInput('');
  }, [input, roomId]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  function formatTime(ts: number) {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function getShortId(socketId?: string) {
    if (!socketId) return 'System';
    // Check if this is our own message
    if (socketId === socket.id) return 'You';
    return `User-${socketId.slice(-4)}`;
  }

  if (!isVisible) return null;

  return (
    <div className="chat-panel">
      {/* Header */}
      <div className="chat-panel-header">
        <div className="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
          </svg>
          <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>Chat</span>
          <span className="chat-msg-count">{messages.length}</span>
        </div>
        <button onClick={onToggle} className="output-clear-btn" title="Close chat">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Messages Area */}
      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="chat-empty">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="opacity-20">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
            </svg>
            <span>No messages yet</span>
            <span className="text-[10px]">Say hi to your collaborators!</span>
          </div>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`chat-message ${msg.type === 'system' ? 'chat-message-system' : ''} ${msg.socketId === socket.id ? 'chat-message-self' : ''}`}
          >
            {msg.type === 'system' ? (
              <div className="chat-system-text">{msg.text}</div>
            ) : (
              <>
                <div className="chat-message-header">
                  <span
                    className="chat-user-dot"
                    style={{ background: msg.color?.border || 'var(--accent-primary)' }}
                  />
                  <span
                    className="chat-username"
                    style={{ color: msg.color?.border || 'var(--accent-primary)' }}
                  >
                    {getShortId(msg.socketId)}
                  </span>
                  <span className="chat-time">{formatTime(msg.timestamp)}</span>
                </div>
                <div className="chat-text">{msg.text}</div>
              </>
            )}
          </div>
        ))}
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
          placeholder="Type a message..."
          className="chat-input"
          maxLength={500}
          autoComplete="off"
          spellCheck={false}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim()}
          className="chat-send-btn"
          title="Send message"
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
