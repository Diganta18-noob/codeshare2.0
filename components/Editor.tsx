'use client';

import { useEffect, useRef, useCallback } from 'react';
import MonacoEditor, { OnMount } from '@monaco-editor/react';
import { socket } from '@/lib/socket';
import { useEditorStore } from '@/store/editorStore';
import type { editor } from 'monaco-editor';

interface EditorProps {
  roomId: string;
  isReadOnly: boolean;
}

interface RemoteSelection {
  socketId: string;
  selection: {
    startLineNumber: number;
    startColumn: number;
    endLineNumber: number;
    endColumn: number;
  };
  color: {
    id: string;
    bg: string;
    border: string;
    label: string;
  };
}

interface RemoteCursor {
  socketId: string;
  position: {
    lineNumber: number;
    column: number;
  };
  color: {
    id: string;
    bg: string;
    border: string;
    label: string;
  };
}

export default function Editor({ roomId, isReadOnly }: EditorProps) {
  const {
    code,
    language,
    files,
    activeFileIndex,
    setCode,
    setLanguage,
    setCursorPosition,
    setFiles,
    setActiveFileIndex,
  } = useEditorStore();

  const isRemoteChange = useRef(false);
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<any>(null);
  const saveTimeout = useRef<ReturnType<typeof setTimeout>>();
  const hasPendingSave = useRef(false);
  const latestCodeRef = useRef(code);
  const latestFilesRef = useRef(files);

  // Sync refs to prevent stale closure issues in visibility handlers
  useEffect(() => {
    latestCodeRef.current = code;
    latestFilesRef.current = files;
  }, [code, files]);

  // Track remote selections and cursors
  const remoteSelections = useRef<Map<string, RemoteSelection>>(new Map());
  const remoteCursors = useRef<Map<string, RemoteCursor>>(new Map());
  const decorationIds = useRef<string[]>([]);

  // Inject dynamic CSS for remote user selection colors
  const injectedStyles = useRef<Set<string>>(new Set());

  function injectSelectionStyle(color: RemoteSelection['color']) {
    if (injectedStyles.current.has(color.id)) return;
    injectedStyles.current.add(color.id);

    const style = document.createElement('style');
    style.textContent = `
      .remote-selection-${color.id} {
        background-color: ${color.bg} !important;
        border-radius: 2px;
      }
      .remote-cursor-${color.id} {
        border-left: 2px solid ${color.border} !important;
        margin-left: -1px;
      }
      .remote-cursor-${color.id}::after {
        content: '';
        position: absolute;
        top: 0;
        left: -1px;
        width: 6px;
        height: 6px;
        background: ${color.border};
        border-radius: 2px 2px 2px 0;
      }
    `;
    document.head.appendChild(style);
  }

  // Update Monaco decorations for all remote selections + cursors
  function updateDecorations() {
    const ed = editorRef.current;
    if (!ed) return;

    const newDecorations: editor.IModelDeltaDecoration[] = [];

    // Add selection decorations
    remoteSelections.current.forEach((sel) => {
      injectSelectionStyle(sel.color);
      newDecorations.push({
        range: {
          startLineNumber: sel.selection.startLineNumber,
          startColumn: sel.selection.startColumn,
          endLineNumber: sel.selection.endLineNumber,
          endColumn: sel.selection.endColumn,
        },
        options: {
          className: `remote-selection-${sel.color.id}`,
          stickiness: 1, // NeverGrowsWhenTypingAtEdges
        },
      });
    });

    // Add cursor decorations
    remoteCursors.current.forEach((cur) => {
      injectSelectionStyle(cur.color);
      newDecorations.push({
        range: {
          startLineNumber: cur.position.lineNumber,
          startColumn: cur.position.column,
          endLineNumber: cur.position.lineNumber,
          endColumn: cur.position.column,
        },
        options: {
          className: `remote-cursor-${cur.color.id}`,
          stickiness: 1,
        },
      });
    });

    decorationIds.current = ed.deltaDecorations(
      decorationIds.current,
      newDecorations
    );
  }

  // Socket listeners for remote changes
  useEffect(() => {
    function onCodeUpdate(data: { code: string; files?: any[] }) {
      isRemoteChange.current = true;
      if (data.files && data.files.length > 0) {
        setFiles(data.files);
      } else {
        setCode(data.code);
      }
    }

    function onLanguageUpdate(lang: string) {
      setLanguage(lang);
    }

    function onFileTreeUpdate(data: { files: any[] }) {
      isRemoteChange.current = true;
      if (data.files) {
        setFiles(data.files);
      }
    }

    function onFileSwitchUpdate(data: { activeFileIndex: number }) {
      setActiveFileIndex(data.activeFileIndex);
    }

    function onSelectionUpdate(data: RemoteSelection) {
      remoteSelections.current.set(data.socketId, data);
      updateDecorations();
    }

    function onCursorUpdate(data: RemoteCursor) {
      remoteCursors.current.set(data.socketId, data);
      updateDecorations();
    }

    function onUserLeft({ socketId }: { socketId: string }) {
      remoteSelections.current.delete(socketId);
      remoteCursors.current.delete(socketId);
      updateDecorations();
    }

    socket.on('code-update', onCodeUpdate);
    socket.on('language-update', onLanguageUpdate);
    socket.on('file-tree-update', onFileTreeUpdate);
    socket.on('file-switch-update', onFileSwitchUpdate);
    socket.on('selection-update', onSelectionUpdate);
    socket.on('cursor-update', onCursorUpdate);
    socket.on('user-left', onUserLeft);

    return () => {
      socket.off('code-update', onCodeUpdate);
      socket.off('language-update', onLanguageUpdate);
      socket.off('file-tree-update', onFileTreeUpdate);
      socket.off('file-switch-update', onFileSwitchUpdate);
      socket.off('selection-update', onSelectionUpdate);
      socket.off('cursor-update', onCursorUpdate);
      socket.off('user-left', onUserLeft);
    };
  }, [setCode, setLanguage, setFiles, setActiveFileIndex]);

  // Force-save unsaved code when user refreshes or leaves the page
  useEffect(() => {
    function flushSave() {
      if (hasPendingSave.current) {
        clearTimeout(saveTimeout.current);
        const payload = JSON.stringify({
          code: latestCodeRef.current,
          files: latestFilesRef.current,
        });
        const sent = navigator.sendBeacon(
          `/api/rooms/${roomId}`,
          new Blob([payload], { type: 'application/json' })
        );
        if (!sent) {
          fetch(`/api/rooms/${roomId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: payload,
            keepalive: true,
          }).catch(() => {});
        }
        hasPendingSave.current = false;
      }
    }

    function onBeforeUnload() {
      flushSave();
    }

    function onVisibilityChange() {
      if (document.visibilityState === 'hidden') {
        flushSave();
      }
    }

    window.addEventListener('beforeunload', onBeforeUnload);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      flushSave();
      window.removeEventListener('beforeunload', onBeforeUnload);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [roomId]);

  // Handle local code changes
  const handleCodeChange = useCallback(
    (value: string | undefined) => {
      if (isRemoteChange.current) {
        isRemoteChange.current = false;
        return;
      }
      const newCode = value ?? '';
      setCode(newCode);

      // Perform store update which recalculates current state
      const nextStoreState = useEditorStore.getState();
      const currentFiles = nextStoreState.files;

      latestCodeRef.current = newCode;
      hasPendingSave.current = true;

      // Sync both code content and files tree list via socket
      socket.emit('code-change', { roomId, code: newCode, files: currentFiles });

      // Debounced DB persist (1.5s after last keystroke)
      clearTimeout(saveTimeout.current);
      saveTimeout.current = setTimeout(() => {
        fetch(`/api/rooms/${roomId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: newCode, files: currentFiles }),
        })
          .then(() => {
            hasPendingSave.current = false;
          })
          .catch((err) => console.error('[Editor] Save failed:', err));
      }, 1500);
    },
    [roomId, setCode]
  );

  // Monaco mount handler
  const handleMount: OnMount = useCallback((editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Define custom theme
    monaco.editor.defineTheme('codeshare-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '4a5568', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'c084fc' },
        { token: 'string', foreground: '34d399' },
        { token: 'number', foreground: 'f59e0b' },
        { token: 'type', foreground: '22d3ee' },
      ],
      colors: {
        'editor.background': '#0a0a0a',
        'editor.foreground': '#e5e5e5',
        'editor.lineHighlightBackground': '#111111',
        'editor.lineHighlightBorder': '#00000000',
        'editorLineNumber.foreground': '#3a3a3a',
        'editorLineNumber.activeForeground': '#f59e0b',
        'editor.selectionBackground': '#f59e0b33',
        'editor.inactiveSelectionBackground': '#f59e0b1a',
        'editorCursor.foreground': '#f59e0b',
        'editorWhitespace.foreground': '#1e1e1e',
        'editorIndentGuide.background': '#1e1e1e',
        'editorIndentGuide.activeBackground': '#2a2a2a',
        'editorWidget.background': '#111111',
        'editorWidget.border': '#1e1e1e',
        'input.background': '#0a0a0a',
        'input.border': '#1e1e1e',
        'focusBorder': '#f59e0b',
        'list.activeSelectionBackground': '#f59e0b33',
        'list.hoverBackground': '#161616',
      },
    });
    monaco.editor.setTheme('codeshare-dark');

    // Track cursor position for status bar
    editor.onDidChangeCursorPosition((e) => {
      setCursorPosition({
        lineNumber: e.position.lineNumber,
        column: e.position.column,
      });

      // Emit cursor to remote users
      socket.emit('cursor-change', {
        roomId,
        position: {
          lineNumber: e.position.lineNumber,
          column: e.position.column,
        },
      });
    });

    // Track selection changes — emit to remote users
    editor.onDidChangeCursorSelection((e) => {
      const sel = e.selection;
      socket.emit('selection-change', {
        roomId,
        selection: {
          startLineNumber: sel.startLineNumber,
          startColumn: sel.startColumn,
          endLineNumber: sel.endLineNumber,
          endColumn: sel.endColumn,
        },
      });
    });

    editor.focus();
  }, [setCursorPosition, roomId]);

  const handleTabClick = (index: number) => {
    setActiveFileIndex(index);
    socket.emit('file-switch', { roomId, activeFileIndex: index });
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* File Tabs Bar */}
      {files.length > 0 && (
        <div
          className="flex items-center overflow-x-auto flex-shrink-0"
          style={{
            height: '36px',
            background: '#0d1117',
            borderBottom: '1px solid var(--bg-border)',
          }}
        >
          {files.map((file, idx) => {
            const isActive = idx === activeFileIndex;
            return (
              <button
                key={file.name + '-tab-' + idx}
                onClick={() => handleTabClick(idx)}
                className="flex items-center gap-1.5 px-3 h-full text-xs font-mono whitespace-nowrap transition-colors flex-shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent-primary)]"
                style={{
                  color: isActive ? 'var(--text-primary)' : 'var(--text-dim)',
                  background: isActive ? '#0a0a0a' : 'transparent',
                  borderTop: isActive
                    ? '2px solid var(--accent-primary)'
                    : '2px solid transparent',
                  borderRight: '1px solid var(--bg-border)',
                  borderBottom: isActive ? '1px solid #0a0a0a' : 'none',
                  borderLeft: 'none',
                  marginBottom: isActive ? '-1px' : '0',
                }}
              >
                <span>{file.name}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Editor Frame */}
      <div className="flex-1 overflow-hidden">
        <MonacoEditor
          height="100%"
          language={language}
          value={code}
          onChange={handleCodeChange}
          onMount={handleMount}
          loading={
            <div className="editor-skeleton">
              <div className="editor-skeleton-pulse" />
            </div>
          }
          options={{
            readOnly: isReadOnly,
            fontSize: 14,
            fontFamily: "'JetBrains Mono', monospace",
            fontLigatures: true,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            lineNumbers: 'on',
            renderLineHighlight: 'line',
            cursorBlinking: 'smooth',
            cursorSmoothCaretAnimation: 'on',
            smoothScrolling: true,
            padding: { top: 16, bottom: 16 },
            automaticLayout: true,
            tabSize: 2,
            bracketPairColorization: { enabled: true },
            guides: { bracketPairs: true },
            overviewRulerLanes: 0,
            hideCursorInOverviewRuler: true,
            overviewRulerBorder: false,
            scrollbar: {
              verticalScrollbarSize: 8,
              horizontalScrollbarSize: 8,
              useShadows: false,
            },
          }}
        />
      </div>
    </div>
  );
}
