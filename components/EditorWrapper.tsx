'use client';

import { useEffect, useState } from 'react';
import { socket } from '@/lib/socket';
import { useEditorStore } from '@/store/editorStore';
import Editor from '@/components/Editor';
import Toolbar from '@/components/Toolbar';
import StatusBar from '@/components/StatusBar';
import KeybindingsModal from '@/components/KeybindingsModal';

interface EditorWrapperProps {
  roomId: string;
  initialCode: string;
  initialLanguage: string;
  initialCreatedAt: string;
  isReadOnly: boolean;
  isEmbed: boolean;
}

export default function EditorWrapper({
  roomId,
  initialCode,
  initialLanguage,
  initialCreatedAt,
  isReadOnly,
  isEmbed,
}: EditorWrapperProps) {
  const { setCode, setLanguage, setViewerCount, setCreatedAt } = useEditorStore();
  const [showKeybindings, setShowKeybindings] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  // Initialize store with server data
  useEffect(() => {
    setCode(initialCode);
    setLanguage(initialLanguage);
    if (initialCreatedAt) {
      setCreatedAt(initialCreatedAt);
    }
  }, [initialCode, initialLanguage, initialCreatedAt, setCode, setLanguage, setCreatedAt]);

  // Socket connection & room join
  useEffect(() => {
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

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('presence-update', onPresenceUpdate);

    // If already connected, join immediately
    if (socket.connected) {
      onConnect();
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('presence-update', onPresenceUpdate);
    };
  }, [roomId, setViewerCount]);

  // Keyboard shortcut: Ctrl+/ for keybindings
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        setShowKeybindings((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      {!isEmbed && (
        <Toolbar
          roomId={roomId}
          isReadOnly={isReadOnly}
        />
      )}

      <div className="flex-1 overflow-hidden">
        <Editor
          roomId={roomId}
          isReadOnly={isReadOnly}
        />
      </div>

      {!isEmbed && (
        <StatusBar roomId={roomId} />
      )}

      {showKeybindings && (
        <KeybindingsModal onClose={() => setShowKeybindings(false)} />
      )}
    </>
  );
}
