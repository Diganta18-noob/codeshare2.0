'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useEditorStore } from '@/store/editorStore';
import { usePanelEntrance } from '@/components/providers/usePanelEntrance';
import SqlResults from '@/components/SqlResults';
import SqlError from '@/components/SqlError';
import SqlHistory from '@/components/SqlHistory';
import type { SqlResponse, SqlDiagnostic } from '@/lib/sql-types';

// ─── Types ─────────────────────────────────────────────────────────────────────

type RunStatus = 'idle' | 'running' | 'success' | 'error' | 'timeout';

interface ExecutionResult {
  stdout:        string;
  stderr:        string;
  exitCode:      number;
  executionTime: number;
  language:      string;
}

interface OutputPanelProps {
  roomId: string;
  isReadOnly?: boolean;
  isVisible: boolean;
  onToggle:  () => void;
}

// ─── Language helpers ──────────────────────────────────────────────────────────

const HTML_RENDERABLE   = new Set(['html', 'css']);
const CLIENT_SIDE_JS    = new Set(['javascript']);
const EXECUTABLE_SERVER = new Set([
  'typescript', 'python', 'java', 'csharp', 'cpp', 'c',
  'go', 'rust', 'php', 'ruby', 'swift', 'kotlin', 'shell', 'sql',
]);

function isExecutable(lang: string) {
  return HTML_RENDERABLE.has(lang) || CLIENT_SIDE_JS.has(lang) || EXECUTABLE_SERVER.has(lang);
}

// ─── Client-side JS sandbox ────────────────────────────────────────────────────

function runJavaScriptInSandbox(code: string, stdin: string): Promise<ExecutionResult> {
  return new Promise((resolve) => {
    const startTime = Date.now();

    // Inject stdin lines as a readable array the user's code can access via readLine()
    const stdinLines = stdin
      .split('\n')
      .map((l) => l.trimEnd())
      .filter((l) => l.length > 0);

    const sandboxHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body><script>
(function(){
  var __logs=[], __errors=[], __stdinLines=${JSON.stringify(stdinLines)}, __stdinIdx=0;

  function __fmt(a){
    return Array.from(a).map(function(v){
      if(v===null)return'null';
      if(v===undefined)return'undefined';
      if(typeof v==='object'){try{return JSON.stringify(v,null,2)}catch(e){return String(v)}}
      return String(v);
    }).join(' ');
  }

  // Expose readLine() for simple stdin simulation
  window.readLine = function(){ return __stdinLines[__stdinIdx++] ?? ''; };
  window.readline = window.readLine;

  console.log   = function(){ __logs.push(__fmt(arguments)); };
  console.info  = function(){ __logs.push(__fmt(arguments)); };
  console.warn  = function(){ __logs.push('[warn] '+__fmt(arguments)); };
  console.error = function(){ __errors.push(__fmt(arguments)); };
  console.table = function(d){ __logs.push(JSON.stringify(d,null,2)); };
  console.dir   = function(o){ __logs.push(JSON.stringify(o,null,2)); };

  try{
    (function(){ ${code} })();
    parent.postMessage({type:'exec-result',stdout:__logs.join('\\n'),stderr:__errors.join('\\n'),exitCode:0},'*');
  }catch(e){
    __errors.push(e.toString());
    parent.postMessage({type:'exec-result',stdout:__logs.join('\\n'),stderr:__errors.join('\\n'),exitCode:1},'*');
  }
})();
<\/script></body></html>`;

    const iframe = document.createElement('iframe');
    iframe.sandbox.add('allow-scripts');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);

    let settled = false;
    const cleanup = () => {
      if (!settled) {
        settled = true;
        window.removeEventListener('message', handler);
        clearTimeout(timer);
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
      }
    };

    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'exec-result') {
        cleanup();
        resolve({
          stdout:        e.data.stdout        || '',
          stderr:        e.data.stderr        || '',
          exitCode:      e.data.exitCode      ?? 0,
          executionTime: Date.now() - startTime,
          language:      'javascript',
        });
      }
    };

    const timer = setTimeout(() => {
      cleanup();
      resolve({ stdout:'', stderr:'Execution timed out (5 s limit)', exitCode:1, executionTime:5000, language:'javascript' });
    }, 5000);

    window.addEventListener('message', handler);
    iframe.srcdoc = sandboxHtml;
  });
}

// ─── Status icon ──────────────────────────────────────────────────────────────

function StatusIcon({ status }: { status: RunStatus }) {
  if (status === 'running') {
    return <span className="output-spinner" style={{ width:10, height:10, borderWidth:1.5 }} />;
  }
  if (status === 'success') {
    return (
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="3">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    );
  }
  if (status === 'error' || status === 'timeout') {
    return (
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="3">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6"  y1="6" x2="18" y2="18" />
      </svg>
    );
  }
  return null;
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function OutputPanel({ roomId, isReadOnly = false, isVisible, onToggle }: OutputPanelProps) {
  const { code, language } = useEditorStore();

  const [status,      setStatus     ] = useState<RunStatus>('idle');
  const [statusText,  setStatusText ] = useState('');
  const [result,      setResult     ] = useState<ExecutionResult | null>(null);
  const [errorMsg,    setErrorMsg   ] = useState<string | null>(null);
  const [htmlOutput,  setHtmlOutput ] = useState<string | null>(null);
  const [copied,      setCopied     ] = useState(false);
  const [sqlResult, setSqlResult] = useState<SqlResponse | null>(null);
  const [sqlDiagnostic, setSqlDiagnostic] = useState<SqlDiagnostic | null>(null);
  const [showSqlHistory, setShowSqlHistory] = useState(false);
  const [historyWarning, setHistoryWarning] = useState('');
  useEffect(() => {
    const show = () => setShowSqlHistory(true);
    window.addEventListener('codeshare-sql-history', show);
    return () => window.removeEventListener('codeshare-sql-history', show);
  }, []);
  const [previewTable, setPreviewTable] = useState<string | null>(null);
  const [previewPage, setPreviewPage] = useState(0);
  const previewRef = useRef<(table: string, page: number) => void>(() => {});

  const loadTable = useCallback(async (table: string, page = 0) => {
    setShowSqlHistory(false); setHistoryWarning('');
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setStatus('running'); setStatusText('Loading table…'); setErrorMsg(null); setSqlDiagnostic(null); setResult(null); setHtmlOutput(null); setSqlResult(null);
    setPreviewTable(table); setPreviewPage(page);
    try {
      const res = await fetch(`/api/rooms/${encodeURIComponent(roomId)}/sql?table=${encodeURIComponent(table)}&page=${page}`, { signal: controller.signal });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not load table');
      if (controller.signal.aborted) return;
      setSqlResult(data); setStatus('success');
    } catch (err: any) { if (!controller.signal.aborted) { setErrorMsg(err.message); setStatus('error'); } }
    finally { if (!controller.signal.aborted) setStatusText(''); }
  }, [roomId]);
  previewRef.current = loadTable;
  useEffect(() => {
    const handler = (event: Event) => { const table = (event as CustomEvent).detail?.table; if (typeof table === 'string') previewRef.current(table, 0); };
    window.addEventListener('codeshare-sql-preview', handler);
    return () => { window.removeEventListener('codeshare-sql-preview', handler); abortRef.current?.abort(); };
  }, []);

  // stdin panel
  const [showStdin,   setShowStdin  ] = useState(false);
  const [stdinValue,  setStdinValue ] = useState('');

  const outputRef = useRef<HTMLDivElement>(null);
  const abortRef  = useRef<AbortController | null>(null);
  const panelRef  = useRef<HTMLDivElement>(null);

  // GSAP Output Panel expansion
  usePanelEntrance(panelRef, isVisible, 'bottom');

  // Auto-listen for Ctrl+Enter run events dispatched from EditorWrapper
  useEffect(() => {
    const handler = () => { runCode(); };
    window.addEventListener('codeshare-run', handler);
    return () => window.removeEventListener('codeshare-run', handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible, code, language, stdinValue, status, roomId, isReadOnly]);

  // Auto-scroll output to bottom
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = sqlResult || sqlDiagnostic ? 0 : outputRef.current.scrollHeight;
    }
  }, [result, sqlResult, sqlDiagnostic, errorMsg, status]);

  const runCode = useCallback(async () => {
    if (status === 'running') return;
    setShowSqlHistory(false); setHistoryWarning('');

    // Cancel any in-flight request
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setStatus('running');
    setStatusText('Preparing…');
    setResult(null);
    setErrorMsg(null);
    setHtmlOutput(null);
    setSqlResult(null);
    setSqlDiagnostic(null);
    setPreviewTable(null);

    try {
      if (language === 'sql') {
        setStatusText('Running SQL…');
        const controller = abortRef.current!;
        const response = await fetch(`/api/rooms/${encodeURIComponent(roomId)}/sql`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sql: code, readOnly: isReadOnly }), signal: controller.signal,
        });
        const data = await response.json();
        if (controller.signal.aborted) return;
        setHistoryWarning(data.historyWarning || '');
        window.dispatchEvent(new Event('codeshare-sql-history-updated'));
        if (!response.ok) {
          if (data.diagnostic && data.rolledBack) setSqlDiagnostic(data.diagnostic);
          throw new Error(data.error || 'SQL execution failed');
        }
        setSqlResult(data); setStatus('success'); setStatusText('');
        window.dispatchEvent(new Event('codeshare-sql-saved'));
        return;
      }
      // ── HTML / CSS → iframe preview ─────────────────────────────────────────
      if (HTML_RENDERABLE.has(language)) {
        setStatusText('Rendering…');
        const htmlContent = language === 'css'
          ? `<!DOCTYPE html><html><head><style>${code}</style></head><body><div class="preview">CSS Preview</div></body></html>`
          : code;
        setHtmlOutput(htmlContent);
        setStatus('success');
        setStatusText('');
        return;
      }

      // ── JavaScript → client-side sandbox ────────────────────────────────────
      if (CLIENT_SIDE_JS.has(language)) {
        setStatusText('Executing…');
        const res = await runJavaScriptInSandbox(code, stdinValue);
        setResult(res);
        setStatus(res.exitCode === 0 ? 'success' : 'error');
        setStatusText('');
        return;
      }

      // ── Server-side execution ────────────────────────────────────────────────
      if (!EXECUTABLE_SERVER.has(language)) {
        setErrorMsg(`"${language}" is not supported for execution.`);
        setStatus('error');
        setStatusText('');
        return;
      }

      // Compile phase indicator for compiled languages
      const compiledLangs = new Set(['java','csharp','cpp','c','go','rust','swift','kotlin','typescript']);
      if (compiledLangs.has(language)) {
        setStatusText('Compiling…');
      } else {
        setStatusText('Executing…');
      }

      const res = await fetch('/api/execute', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ language, code, stdin: stdinValue }),
        signal:  abortRef.current.signal,
      });

      const data = await res.json();

      // Server says: run JS client-side (shouldn't happen but handle gracefully)
      if (data.clientSide && data.language === 'javascript') {
        setStatusText('Executing…');
        const sandboxRes = await runJavaScriptInSandbox(code, stdinValue);
        setResult(sandboxRes);
        setStatus(sandboxRes.exitCode === 0 ? 'success' : 'error');
        setStatusText('');
        return;
      }

      if (!res.ok) {
        const msg = data.error || `Server error ${res.status}`;
        // Provide a helpful message for the Piston unavailability case
        if (res.status === 503) {
          setErrorMsg(
            `Execution service unavailable.\n\n` +
            `To fix this, self-host Piston (e.g. via Docker) and add the URL to your environment variables:\n` +
            `• Local: PISTON_API_URL=http://localhost:2000/api/v2/execute\n` +
            `• Vercel: Add PISTON_API_URL in Project Settings -> Environment Variables.\n\n` +
            `Or use JavaScript which runs directly in your browser sandbox.`
          );
        } else {
          setErrorMsg(msg);
        }
        setStatus('error');
        setStatusText('');
        return;
      }

      setResult(data);
      setStatus(data.exitCode === 0 ? 'success' : 'error');
      setStatusText('');

    } catch (err: any) {
      if (err.name === 'AbortError') return; // user cancelled
      setErrorMsg(err.message || 'Network error. Check your connection.');
      setStatus('error');
      setStatusText('');
    }
  }, [code, language, stdinValue, status, roomId, isReadOnly]);

  const handleClear = useCallback(() => {
    setShowSqlHistory(false); setHistoryWarning('');
    abortRef.current?.abort();
    setStatus('idle');
    setStatusText('');
    setResult(null);
    setErrorMsg(null);
    setHtmlOutput(null);
    setSqlResult(null);
    setSqlDiagnostic(null);
    setPreviewTable(null);
  }, []);

  const handleCopyOutput = useCallback(async () => {
    const text = result
      ? [result.stdout, result.stderr].filter(Boolean).join('\n')
      : sqlDiagnostic ? `${sqlDiagnostic.title}\nStatement ${sqlDiagnostic.statement} starts at line ${sqlDiagnostic.line}, column ${sqlDiagnostic.column}\nSQLite: ${sqlDiagnostic.message}\n\n${sqlDiagnostic.sql}\n\n${sqlDiagnostic.hint}\nNo changes from this run were saved.` : errorMsg || '';
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard access denied */ }
  }, [result, errorMsg, sqlDiagnostic]);

  const outputText = result
    ? [result.stdout, result.stderr].filter(Boolean).join('\n')
    : errorMsg || '';

  if (!isVisible) return null;

  const canRun = isExecutable(language);

  return (
    <div ref={panelRef} className="output-panel" style={{ height: showSqlHistory ? 420 : sqlResult || language === 'sql' ? 350 : 260, minHeight: 160, maxHeight: '60vh' }}>
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="output-panel-header">
        <div className="flex items-center gap-3">
          {/* Title */}
          <span className="output-panel-title">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="4 17 10 11 4 5" />
              <line x1="12" y1="19" x2="20" y2="19" />
            </svg>
            {showSqlHistory ? 'Query history' : language === 'sql' || sqlResult ? 'SQL Results' : 'Output'}
          </span>

          {/* Status badge */}
          {!showSqlHistory && status === 'running' && (
            <span className="output-badge" style={{ background:'rgba(99,102,241,0.12)', color:'#818cf8', border:'1px solid rgba(99,102,241,0.25)' }}>
              <StatusIcon status="running" />
              {statusText || 'Running…'}
            </span>
          )}
          {!showSqlHistory && status === 'success' && result && (
            <span className="output-badge output-badge-success">
              <StatusIcon status="success" />
              Exit {result.exitCode} · {result.executionTime}ms
            </span>
          )}
          {!showSqlHistory && status === 'error' && (
            <span className="output-badge output-badge-error">
              <StatusIcon status="error" />
              {result ? `Exit ${result.exitCode}` : 'Error'}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {(language === 'sql' || sqlResult || showSqlHistory) && <button className="sql-small-button" aria-label="Show SQL query history" aria-pressed={showSqlHistory} onClick={() => setShowSqlHistory(value => !value)}>{showSqlHistory ? 'Results' : 'Query history'}</button>}
          {/* Stdin toggle */}
          {language !== 'sql' && !showSqlHistory && <button
            onClick={() => setShowStdin((p) => !p)}
            className={`output-clear-btn px-2 text-[10px] font-semibold ${showStdin ? 'text-indigo-400' : ''}`}
            title="Toggle stdin input"
            style={{ width: 'auto', padding: '4px 8px' }}
          >
            stdin
          </button>}

          {/* Copy output */}
          {outputText && !showSqlHistory && (
            <button onClick={handleCopyOutput} className="output-clear-btn" title="Copy output">
              {copied ? (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
              )}
            </button>
          )}

          {/* Run button */}
          <button
            onClick={runCode}
            disabled={status === 'running' || !canRun}
            className="output-run-btn"
            title={canRun ? 'Run (Ctrl+Enter)' : 'Language not supported for execution'}
          >
            {status === 'running' ? (
              <span className="output-spinner" style={{ width:10, height:10 }} />
            ) : (
              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            )}
            {status === 'running' ? statusText || 'Running…' : 'Run'}
          </button>

          {/* Clear */}
          <button onClick={handleClear} className="output-clear-btn hover:scale-105 transition-transform" title="Clear output">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              <path d="M10 11v6M14 11v6" />
            </svg>
          </button>

          {/* Close */}
          <button onClick={onToggle} className="output-clear-btn hover:rotate-90 transition-transform duration-200" title="Close panel">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="18 15 12 9 6 15" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── Stdin input ──────────────────────────────────────────────────────── */}
      {showStdin && language !== 'sql' && !showSqlHistory && (
        <div
          style={{
            borderBottom: '1px solid var(--bg-border)',
            background:   '#0a0d14',
            padding:      '8px 16px',
            display:      'flex',
            flexDirection:'column',
            gap:          4,
          }}
        >
          <label style={{ fontSize:10, color:'var(--text-secondary)', fontFamily:'JetBrains Mono, monospace', letterSpacing:'0.05em' }}>
            STDIN (one value per line)
          </label>
          <textarea
            value={stdinValue}
            onChange={(e) => setStdinValue(e.target.value)}
            placeholder="5&#10;1 2 3 4 5"
            rows={3}
            className="chat-input"
            style={{ resize:'vertical', fontFamily:'JetBrains Mono, monospace', fontSize:12, lineHeight:1.6 }}
          />
        </div>
      )}

      {/* ── Output content ───────────────────────────────────────────────────── */}
      <div className="output-panel-content" ref={outputRef}>
        {showSqlHistory ? <SqlHistory roomId={roomId} isReadOnly={isReadOnly} /> : <>
        {historyWarning && <p className="sql-notice" role="status">{historyWarning}</p>}
        {sqlResult && <>
          <SqlResults data={sqlResult} title={previewTable ? `${previewTable} · table preview` : undefined} tableName={previewTable || undefined} />
          {previewTable && <div className="sql-pagination"><button className="sql-small-button" disabled={previewPage === 0 || status === 'running'} onClick={() => loadTable(previewTable, previewPage - 1)}>Previous</button><span>Page {previewPage + 1} · 100 rows per page</span><button className="sql-small-button" disabled={status === 'running' || (previewPage + 1) * 100 >= (sqlResult.schema.find(t => t.name === previewTable)?.rowCount || 0)} onClick={() => loadTable(previewTable, previewPage + 1)}>Next</button></div>}
        </>}
        {/* HTML iframe preview */}
        {htmlOutput && (
          <iframe
            srcDoc={htmlOutput}
            className="output-iframe"
            sandbox="allow-scripts"
            title="HTML Preview"
          />
        )}

        {/* Running placeholder */}
        {status === 'running' && !result && !errorMsg && (
          <div className="output-empty">
            <span className="output-spinner" style={{ width:16, height:16 }} />
            <span style={{ color:'var(--text-secondary)' }}>{statusText || 'Running…'}</span>
          </div>
        )}

        {/* Execution result */}
        {result && (
          <pre className="output-text" style={{ margin:0 }}>
            {result.stdout && (
              <span className="output-stdout">{result.stdout}</span>
            )}
            {result.stderr && (
              <>
                {result.stdout && <span className="output-dim">{'\n--- stderr ---\n'}</span>}
                <span className="output-stderr">{result.stderr}</span>
              </>
            )}
            {!result.stdout && !result.stderr && (
              <span className="output-dim">Program exited with no output (exit {result.exitCode})</span>
            )}
          </pre>
        )}

        {/* Error message */}
        {sqlDiagnostic && <SqlError diagnostic={sqlDiagnostic} roomId={roomId} />}
        {errorMsg && !sqlDiagnostic && (
          <pre className="output-text" role="alert">
            <span className="output-stderr">{errorMsg}</span>
          </pre>
        )}

        {/* Idle empty state */}
        {status === 'idle' && !result && !sqlResult && !errorMsg && !htmlOutput && (
          <div className="output-empty">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.3">
              <polyline points="4 17 10 11 4 5" />
              <line x1="12" y1="19" x2="20" y2="19" />
            </svg>
            <span>
              {canRun
                ? CLIENT_SIDE_JS.has(language)
                  ? 'Press Run or Ctrl+Enter — executes in browser sandbox'
                  : HTML_RENDERABLE.has(language)
                    ? 'Press Run to preview your HTML/CSS'
                    : 'Press Run or Ctrl+Enter to execute'
                : `"${language}" is not supported for execution`}
            </span>
          </div>
        )}
        </>}
      </div>
    </div>
  );
}
