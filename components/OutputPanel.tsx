'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useEditorStore } from '@/store/editorStore';

interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  executionTime: number;
  language: string;
}

interface OutputPanelProps {
  isVisible: boolean;
  onToggle: () => void;
}

// Languages that render as HTML in an iframe
const HTML_RENDERABLE = ['html', 'css'];

// Languages supported by the Piston execution API
const EXECUTABLE_LANGUAGES = [
  'javascript', 'typescript', 'python', 'java', 'csharp', 'cpp',
  'go', 'rust', 'php', 'ruby', 'swift', 'kotlin', 'shell', 'sql',
];

/**
 * Execute JavaScript code in a sandboxed iframe, capturing console output.
 */
function runJavaScriptInSandbox(code: string): Promise<ExecutionResult> {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const logs: string[] = [];
    const errors: string[] = [];

    // Build a sandboxed HTML page that captures console output
    const sandboxHtml = `
      <!DOCTYPE html>
      <html><head><meta charset="utf-8"></head><body><script>
        const __logs = [];
        const __errors = [];
        const __origConsole = { ...console };
        function __fmt(args) {
          return Array.from(args).map(a => {
            if (a === null) return 'null';
            if (a === undefined) return 'undefined';
            if (typeof a === 'object') {
              try { return JSON.stringify(a, null, 2); } catch { return String(a); }
            }
            return String(a);
          }).join(' ');
        }
        console.log = function() { __logs.push(__fmt(arguments)); };
        console.info = function() { __logs.push(__fmt(arguments)); };
        console.warn = function() { __logs.push('[warn] ' + __fmt(arguments)); };
        console.error = function() { __errors.push(__fmt(arguments)); };
        console.table = function(data) { __logs.push(JSON.stringify(data, null, 2)); };
        console.dir = function(obj) { __logs.push(JSON.stringify(obj, null, 2)); };

        try {
          const __result = (function() {
            ${code}
          })();
          if (__result !== undefined) {
            __logs.push(typeof __result === 'object' ? JSON.stringify(__result, null, 2) : String(__result));
          }
          parent.postMessage({ type: 'exec-result', stdout: __logs.join('\\n'), stderr: __errors.join('\\n'), exitCode: 0 }, '*');
        } catch (e) {
          __errors.push(e.toString());
          parent.postMessage({ type: 'exec-result', stdout: __logs.join('\\n'), stderr: __errors.join('\\n'), exitCode: 1 }, '*');
        }
      </script></body></html>
    `;

    const iframe = document.createElement('iframe');
    iframe.sandbox.add('allow-scripts');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);

    const cleanup = () => {
      window.removeEventListener('message', handler);
      clearTimeout(timeout);
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
    };

    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'exec-result') {
        cleanup();
        resolve({
          stdout: event.data.stdout || '',
          stderr: event.data.stderr || '',
          exitCode: event.data.exitCode ?? 0,
          executionTime: Date.now() - startTime,
          language: 'javascript',
        });
      }
    };

    const timeout = setTimeout(() => {
      cleanup();
      resolve({
        stdout: '',
        stderr: 'Execution timed out (5s limit)',
        exitCode: 1,
        executionTime: 5000,
        language: 'javascript',
      });
    }, 5000);

    window.addEventListener('message', handler);
    iframe.srcdoc = sandboxHtml;
  });
}

export default function OutputPanel({ isVisible, onToggle }: OutputPanelProps) {
  const { code, language } = useEditorStore();
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<ExecutionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [htmlOutput, setHtmlOutput] = useState<string | null>(null);
  const outputRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const canExecute = HTML_RENDERABLE.includes(language) || EXECUTABLE_LANGUAGES.includes(language);
  const isHtmlMode = HTML_RENDERABLE.includes(language);

  // Auto-scroll to bottom of output
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [result, error]);

  const handleRun = useCallback(async () => {
    if (isRunning) return;

    setIsRunning(true);
    setError(null);
    setResult(null);
    setHtmlOutput(null);

    try {
      if (isHtmlMode) {
        // Render HTML/CSS in sandboxed iframe
        let htmlContent = code;
        if (language === 'css') {
          htmlContent = `<!DOCTYPE html>
<html><head><style>${code}</style></head>
<body><div class="preview">CSS Preview</div></body></html>`;
        }
        setHtmlOutput(htmlContent);
        setIsRunning(false);
        return;
      }

      // JavaScript — run client-side in sandbox (no API needed)
      if (language === 'javascript') {
        const sandboxResult = await runJavaScriptInSandbox(code);
        setResult(sandboxResult);
        setIsRunning(false);
        return;
      }

      // Execute via API proxy for other languages
      const res = await fetch('/api/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language, code }),
      });

      const data = await res.json();

      if (data.clientSide && data.language === 'javascript') {
        // Fallback: server told us to run client-side
        const sandboxResult = await runJavaScriptInSandbox(code);
        setResult(sandboxResult);
      } else if (!res.ok) {
        setError(data.error || 'Execution failed');
      } else {
        setResult(data);
      }
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setIsRunning(false);
    }
  }, [code, language, isRunning, isHtmlMode]);

  const handleClear = useCallback(() => {
    setResult(null);
    setError(null);
    setHtmlOutput(null);
  }, []);

  if (!isVisible) return null;

  return (
    <div className="output-panel">
      {/* Header */}
      <div className="output-panel-header">
        <div className="flex items-center gap-3">
          <span className="output-panel-title">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="4 17 10 11 4 5" />
              <line x1="12" y1="19" x2="20" y2="19" />
            </svg>
            Output
          </span>
          {result && (
            <span className={`output-badge ${result.exitCode === 0 ? 'output-badge-success' : 'output-badge-error'}`}>
              {result.exitCode === 0 ? '✓ Success' : `✗ Exit ${result.exitCode}`}
            </span>
          )}
          {result && (
            <span className="output-time">
              {result.executionTime}ms
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Run Button */}
          <button
            onClick={handleRun}
            disabled={isRunning || !canExecute}
            className="output-run-btn"
            title={canExecute ? 'Run code (Ctrl+Enter)' : 'Language not supported'}
          >
            {isRunning ? (
              <span className="output-spinner" />
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            )}
            {isRunning ? 'Running...' : 'Run'}
          </button>

          {/* Clear Button */}
          <button onClick={handleClear} className="output-clear-btn" title="Clear output">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          {/* Close Button */}
          <button onClick={onToggle} className="output-clear-btn" title="Close panel">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="18 15 12 9 6 15" />
            </svg>
          </button>
        </div>
      </div>

      {/* Output Content */}
      <div className="output-panel-content" ref={outputRef}>
        {/* HTML iframe preview */}
        {htmlOutput && (
          <iframe
            ref={iframeRef}
            srcDoc={htmlOutput}
            className="output-iframe"
            sandbox="allow-scripts"
            title="HTML Preview"
          />
        )}

        {/* Console output */}
        {result && (
          <pre className="output-text">
            {result.stdout && (
              <span className="output-stdout">{result.stdout}</span>
            )}
            {result.stderr && (
              <span className="output-stderr">{result.stderr}</span>
            )}
            {!result.stdout && !result.stderr && (
              <span className="output-dim">No output</span>
            )}
          </pre>
        )}

        {/* Error message */}
        {error && (
          <pre className="output-text">
            <span className="output-stderr">Error: {error}</span>
          </pre>
        )}

        {/* Empty state */}
        {!result && !error && !htmlOutput && (
          <div className="output-empty">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="opacity-30">
              <polyline points="4 17 10 11 4 5" />
              <line x1="12" y1="19" x2="20" y2="19" />
            </svg>
            <span>
              {canExecute
                ? language === 'javascript'
                  ? 'Press Run or Ctrl+Enter to execute (runs in browser sandbox)'
                  : 'Press Run or Ctrl+Enter to execute'
                : `"${language}" is not supported for execution`}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
