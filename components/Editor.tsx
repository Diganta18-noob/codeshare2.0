'use client';

import { useEffect, useRef, useCallback } from 'react';
import MonacoEditor, { OnMount } from '@monaco-editor/react';
import { socket } from '@/lib/socket';
import { useEditorStore } from '@/store/editorStore';
import type { editor, IDisposable } from 'monaco-editor';

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
  const { code, language, setCode, setLanguage, setCursorPosition } = useEditorStore();
  const isRemoteChange = useRef(false);
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<any>(null);
  const saveTimeout = useRef<ReturnType<typeof setTimeout>>();

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
    function onCodeUpdate(newCode: string) {
      isRemoteChange.current = true;
      setCode(newCode);
    }

    function onLanguageUpdate(lang: string) {
      setLanguage(lang);
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
    socket.on('selection-update', onSelectionUpdate);
    socket.on('cursor-update', onCursorUpdate);
    socket.on('user-left', onUserLeft);

    return () => {
      socket.off('code-update', onCodeUpdate);
      socket.off('language-update', onLanguageUpdate);
      socket.off('selection-update', onSelectionUpdate);
      socket.off('cursor-update', onCursorUpdate);
      socket.off('user-left', onUserLeft);
    };
  }, [setCode, setLanguage]);

  // Handle local code changes
  const handleCodeChange = useCallback(
    (value: string | undefined) => {
      if (isRemoteChange.current) {
        isRemoteChange.current = false;
        return;
      }
      const newCode = value ?? '';
      setCode(newCode);
      socket.emit('code-change', { roomId, code: newCode });

      // Debounced DB persist (1.5s after last keystroke)
      clearTimeout(saveTimeout.current);
      saveTimeout.current = setTimeout(() => {
        fetch(`/api/rooms/${roomId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: newCode }),
        }).catch((err) => console.error('[Editor] Save failed:', err));
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

    // Focus editor
    editor.focus();
  }, [setCursorPosition, roomId]);

  return (
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
  );
}
