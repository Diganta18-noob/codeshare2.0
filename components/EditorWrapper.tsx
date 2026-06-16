'use client';

import { useEffect, useState, useCallback } from 'react';
import { socket } from '@/lib/socket';
import { useEditorStore } from '@/store/editorStore';
import Editor from '@/components/Editor';
import Toolbar from '@/components/Toolbar';
import StatusBar from '@/components/StatusBar';
import KeybindingsModal from '@/components/KeybindingsModal';
import OutputPanel from '@/components/OutputPanel';
import ChatPanel from '@/components/ChatPanel';
import HistoryPanel from '@/components/HistoryPanel';
import PasswordModal from '@/components/PasswordModal';
import AIPanel from '@/components/AIPanel';
import FileTree from '@/components/FileTree';

interface EditorWrapperProps {
  roomId: string;
  initialCode: string;
  initialLanguage: string;
  initialCreatedAt: string;
  isReadOnly: boolean;
  isEmbed: boolean;
  initialIsLocked: boolean;
  initialHasPassword: boolean;
  initialFiles?: any[];
}

export default function EditorWrapper({
  roomId,
  initialCode,
  initialLanguage,
  initialCreatedAt,
  isReadOnly,
  isEmbed,
  initialIsLocked,
  initialHasPassword,
  initialFiles,
}: EditorWrapperProps) {
  const { setCode, setLanguage, setViewerCount, setCreatedAt, setFiles, code, language } = useEditorStore();
  const [showKeybindings, setShowKeybindings] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [showOutput, setShowOutput] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [unreadChat, setUnreadChat] = useState(0);

  // Lock and Password states
  const [isLocked, setIsLocked] = useState(initialIsLocked);
  const [hasPassword, setHasPassword] = useState(initialHasPassword);
  const [isUnlocked, setIsUnlocked] = useState(!initialHasPassword || initialIsLocked);
  const [isLockedByMe, setIsLockedByMe] = useState(false);

  // History panel state
  const [showHistory, setShowHistory] = useState(false);

  // AI assistant panel state
  const [showAI, setShowAI] = useState(false);

  // FileTree sidebar state
  const [showFileTree, setShowFileTree] = useState(true);

  // Initialize store with server data if unlocked
  useEffect(() => {
    if (isUnlocked) {
      if (initialFiles && initialFiles.length > 0) {
        setFiles(initialFiles);
      } else {
        setFiles([{ name: 'index.js', code: initialCode, language: initialLanguage }]);
      }
      if (initialCreatedAt) {
        setCreatedAt(initialCreatedAt);
      }
    }
  }, [initialCode, initialLanguage, initialCreatedAt, initialFiles, setFiles, setCreatedAt, isUnlocked]);

  // Socket connection & room join
  useEffect(() => {
    if (!isUnlocked) return;

    if (!socket.connected) {
      socket.connect();
    }

    function onConnect() {
      setIsConnected(true);
      socket.emit('join-room', { roomId });
    }

    function onDisconnect() {
      setIsConnected(false);
    }

    function onPresenceUpdate(count: number) {
      setViewerCount(count);
    }

    function onRoomLockUpdate(data: { isLocked: boolean; lockedBy: string }) {
      setIsLocked(data.isLocked);
      setIsLockedByMe(data.isLocked && data.lockedBy === socket.id);
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('presence-update', onPresenceUpdate);
    socket.on('room-lock-update', onRoomLockUpdate);

    // If already connected, join immediately
    if (socket.connected) {
      onConnect();
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('presence-update', onPresenceUpdate);
      socket.off('room-lock-update', onRoomLockUpdate);
    };
  }, [roomId, setViewerCount, isUnlocked]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+/ for keybindings
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        setShowKeybindings((prev) => !prev);
      }
      // Ctrl+Enter to run code
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        setShowOutput(true);
        window.dispatchEvent(new CustomEvent('codeshare-run'));
      }
      // Ctrl+Shift+C to toggle chat
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'C') {
        e.preventDefault();
        setShowChat((prev) => !prev);
        setUnreadChat(0);
      }
      // Ctrl+Shift+H to toggle history
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'H') {
        e.preventDefault();
        setShowHistory((prev) => !prev);
      }
      // Ctrl+Shift+A to toggle AI
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'A') {
        e.preventDefault();
        setShowAI((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Auto-snapshot of code on 5-minute inactivity
  useEffect(() => {
    if (!code || isReadOnly || !isUnlocked || (isLocked && !isLockedByMe)) return;

    const timer = setTimeout(async () => {
      try {
        await fetch(`/api/rooms/${roomId}/snapshots`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code,
            language,
            label: 'Auto Snapshot',
          }),
        });
      } catch (err) {
        console.error('Failed to save auto snapshot:', err);
      }
    }, 5 * 60 * 1000);

    return () => clearTimeout(timer);
  }, [code, language, roomId, isReadOnly, isUnlocked, isLocked, isLockedByMe]);

  const handleToggleOutput = useCallback(() => {
    setShowOutput((prev) => !prev);
  }, []);

  const handleToggleChat = useCallback(() => {
    setShowChat((prev) => {
      if (!prev) setUnreadChat(0);
      return !prev;
    });
  }, []);

  const handleToggleHistory = useCallback(() => {
    setShowHistory((prev) => !prev);
  }, []);

  const handleToggleAI = useCallback(() => {
    setShowAI((prev) => !prev);
  }, []);

  const handleToggleFileTree = useCallback(() => {
    setShowFileTree((prev) => !prev);
  }, []);

  const handleNewChatMessage = useCallback(() => {
    setUnreadChat((prev) => prev + 1);
  }, []);

  const handleToggleLock = useCallback(async () => {
    const nextLocked = !isLocked;
    try {
      const res = await fetch(`/api/rooms/${roomId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isLocked: nextLocked }),
      });
      if (res.ok) {
        setIsLocked(nextLocked);
        setIsLockedByMe(nextLocked);
        socket.emit('room-lock-change', {
          roomId,
          isLocked: nextLocked,
          lockedBy: socket.id,
        });
      }
    } catch (err) {
      console.error('Failed to toggle room lock:', err);
    }
  }, [roomId, isLocked]);

  const handleSetPassword = useCallback(async (password: string | null) => {
    try {
      const res = await fetch(`/api/rooms/${roomId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        setHasPassword(password !== null && password !== '');
      } else {
        throw new Error('Failed to update password');
      }
    } catch (err) {
      console.error('Failed to set password:', err);
      throw err;
    }
  }, [roomId]);

  const handleUnlockWithPassword = useCallback(async (password: string) => {
    try {
      const res = await fetch(`/api/rooms/${roomId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const patchRes = await fetch(`/api/rooms/${roomId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isLocked: false }),
        });
        if (patchRes.ok) {
          setIsLocked(false);
          setIsLockedByMe(false);
          socket.emit('room-lock-change', {
            roomId,
            isLocked: false,
            lockedBy: socket.id,
          });
          return { success: true };
        }
      }
      return { success: false, error: data.error || 'Incorrect password' };
    } catch (err) {
      return { success: false, error: 'Verification failed' };
    }
  }, [roomId]);

  const handlePasswordSuccess = (verifiedCode: string, verifiedLanguage: string, verifiedCreatedAt: string) => {
    setCode(verifiedCode);
    setLanguage(verifiedLanguage);
    if (verifiedCreatedAt) {
      setCreatedAt(verifiedCreatedAt);
    }
    setIsUnlocked(true);
  };

  const editorIsReadOnly = isReadOnly || (isLocked && !isLockedByMe);

  if (!isUnlocked) {
    return <PasswordModal roomId={roomId} onSuccess={handlePasswordSuccess} />;
  }

  return (
    <>
      {!isEmbed && (
        <Toolbar
          roomId={roomId}
          isReadOnly={isReadOnly}
          showOutput={showOutput}
          onToggleOutput={handleToggleOutput}
          showChat={showChat}
          onToggleChat={handleToggleChat}
          unreadChat={unreadChat}
          isLocked={isLocked}
          hasPassword={hasPassword}
          isLockedByMe={isLockedByMe}
          onToggleLock={handleToggleLock}
          onSetPassword={handleSetPassword}
          onUnlockWithPassword={handleUnlockWithPassword}
          showHistory={showHistory}
          onToggleHistory={handleToggleHistory}
          showAI={showAI}
          onToggleAI={handleToggleAI}
          showFileTree={showFileTree}
          onToggleFileTree={handleToggleFileTree}
        />
      )}

      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Sidebar: File Tree */}
        <FileTree
          roomId={roomId}
          isVisible={showFileTree}
          onToggle={handleToggleFileTree}
        />

        {/* Main editor area */}
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-hidden">
            <Editor roomId={roomId} isReadOnly={editorIsReadOnly} />
          </div>

          {/* Output Panel (bottom) */}
          <OutputPanel isVisible={showOutput} onToggle={handleToggleOutput} />
        </div>

        {/* History Panel (right sidebar, before Chat sidebar if both open) */}
        <HistoryPanel
          roomId={roomId}
          isVisible={showHistory}
          onToggle={handleToggleHistory}
        />

        {/* AI Assistant Panel */}
        <AIPanel
          roomId={roomId}
          isVisible={showAI}
          onToggle={handleToggleAI}
        />

        {/* Chat Panel (right sidebar) */}
        <ChatPanel
          roomId={roomId}
          isVisible={showChat}
          onToggle={handleToggleChat}
          onNewMessage={handleNewChatMessage}
        />
      </div>

      {!isEmbed && <StatusBar roomId={roomId} />}

      {showKeybindings && <KeybindingsModal onClose={() => setShowKeybindings(false)} />}
    </>
  );
}
