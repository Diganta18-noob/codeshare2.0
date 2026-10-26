'use client';

import { useEffect, useRef, useCallback } from 'react';
import MonacoEditor, { OnMount } from '@monaco-editor/react';
import { socket } from '@/lib/socket';
import { useEditorStore } from '@/store/editorStore';
import type { editor } from 'monaco-editor';
import { gsap } from 'gsap';
import FileIcon from '@/components/FileIcon';
import UIIcon from '@/components/UIIcon';

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
  const containerRef = useRef<HTMLDivElement>(null);
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

    if (containerRef.current && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      gsap.fromTo(
        containerRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.5, ease: 'power2.out' }
      );
    }

    // Define custom theme with void background depth
    monaco.editor.defineTheme('codeshare-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '7c879f', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'b9a1ef' },
        { token: 'string', foreground: '9cc9af' },
        { token: 'number', foreground: 'dfbd8b' },
        { token: 'type', foreground: '8dbed5' },
      ],
      colors: {
        'editor.background': '#0d1017',
        'editor.foreground': '#dbe1ee',
        'editor.lineHighlightBackground': '#151a26',
        'editor.lineHighlightBorder': '#00000000',
        'editorLineNumber.foreground': '#626d83',
        'editorLineNumber.activeForeground': '#b49aee',
        'editor.selectionBackground': '#8b5cf633',
        'editor.inactiveSelectionBackground': '#8b5cf61a',
        'editorCursor.foreground': '#b49aee',
        'editorWhitespace.foreground': '#1e293b',
        'editorIndentGuide.background': '#1e293b',
        'editorIndentGuide.activeBackground': '#626d83',
        'editorWidget.background': '#0f172a',
        'editorWidget.border': '#1e293b',
        'input.background': '#06090f',
        'input.border': '#1e293b',
        'focusBorder': '#b49aee',
        'list.activeSelectionBackground': '#8b5cf633',
        'list.hoverBackground': '#1e293b',
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

  useEffect(() => {
    document.getElementById(`file-tab-${activeFileIndex}`)?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [activeFileIndex, files.length]);

  return (
    <div ref={containerRef} className="ws-editor flex flex-col h-full overflow-hidden relative">
      {files.length > 0 && (
        <div className="ws-tabs" role="tablist" aria-label="Open files">
          {files.map((file, index) => (
            <button
              key={file.name + '-tab-' + index}
              id={`file-tab-${index}`}
              role="tab"
              aria-selected={index === activeFileIndex}
              aria-controls="workspace-editor"
              tabIndex={index === activeFileIndex ? 0 : -1}
              onClick={() => handleTabClick(index)}
              onKeyDown={(event) => {
                let next = index;
                if (event.key === 'ArrowRight') next = (index + 1) % files.length;
                else if (event.key === 'ArrowLeft') next = (index - 1 + files.length) % files.length;
                else if (event.key === 'Home') next = 0;
                else if (event.key === 'End') next = files.length - 1;
                else return;
                event.preventDefault();
                handleTabClick(next);
                document.getElementById(`file-tab-${next}`)?.focus();
              }}
              className={`ws-tab ${index === activeFileIndex ? 'is-active' : ''}`}
              title={file.name}
            ><FileIcon name={file.name} /><span>{file.name}</span>{index === activeFileIndex && <i aria-hidden="true" />}</button>
          ))}
        </div>
      )}
      <div className="ws-breadcrumb" aria-label="Current file"><UIIcon name="folder" /><span>{roomId}</span><UIIcon name="chevron" /><FileIcon name={files[activeFileIndex]?.name || 'index.js'} /><strong>{files[activeFileIndex]?.name || 'index.js'}</strong><span className="ws-editor-mode">{isReadOnly ? 'Read only' : 'Editing'}</span></div>
      {/* Editor Frame */}
      <div id="workspace-editor" role="tabpanel" aria-labelledby={`file-tab-${activeFileIndex}`} className="flex-1 overflow-hidden relative">
        <MonacoEditor
          height="100%"
          language={language}
          value={code}
          onChange={handleCodeChange}
          onMount={handleMount}
          loading={
            <div className="editor-skeleton p-8 flex flex-col gap-3 w-full h-full bg-[#06090F]">
              <div className="skeleton-line w-1/3" />
              <div className="skeleton-line w-2/3" />
              <div className="skeleton-line w-1/2" />
              <div className="skeleton-line w-3/4" />
              <div className="skeleton-line w-2/5" />
            </div>
          }
          options={{
            readOnly: isReadOnly,
            fontSize: 14,
            lineHeight: 24,
            fontFamily: "'JetBrains Mono', monospace",
            fontLigatures: true,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            lineNumbers: 'on',
            renderLineHighlight: 'line',
            cursorBlinking: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'solid' : 'smooth',
            cursorSmoothCaretAnimation: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'off' : 'on',
            smoothScrolling: !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
            padding: { top: 20, bottom: 20 },
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
