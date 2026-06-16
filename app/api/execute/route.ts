import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

// ─── Language → Piston runtime map ────────────────────────────────────────────
// Piston language IDs and pinned versions (v2 API)
const PISTON_RUNTIMES: Record<string, { language: string; version: string; fileName: string }> = {
  python:     { language: 'python',     version: '3.10.0',  fileName: 'main.py'    },
  javascript: { language: 'javascript', version: '18.15.0', fileName: 'main.js'    },
  typescript: { language: 'typescript', version: '5.0.3',   fileName: 'main.ts'    },
  java:       { language: 'java',       version: '15.0.2',  fileName: 'Main.java'  },
  csharp:     { language: 'csharp',     version: '6.12.0',  fileName: 'main.cs'    },
  cpp:        { language: 'c++',        version: '10.2.0',  fileName: 'main.cpp'   },
  c:          { language: 'c',          version: '10.2.0',  fileName: 'main.c'     },
  go:         { language: 'go',         version: '1.16.2',  fileName: 'main.go'    },
  rust:       { language: 'rust',       version: '1.68.2',  fileName: 'main.rs'    },
  php:        { language: 'php',        version: '8.2.3',   fileName: 'main.php'   },
  ruby:       { language: 'ruby',       version: '3.0.1',   fileName: 'main.rb'    },
  swift:      { language: 'swift',      version: '5.3.3',   fileName: 'main.swift' },
  kotlin:     { language: 'kotlin',     version: '1.8.20',  fileName: 'main.kt'    },
  shell:      { language: 'bash',       version: '5.2.0',   fileName: 'main.sh'    },
  sql:        { language: 'sqlite3',    version: '3.36.0',  fileName: 'main.sql'   },
};

// Multiple Piston endpoints to try in order
const PISTON_ENDPOINTS = [
  process.env.PISTON_API_URL,                         // custom self-hosted (highest priority)
  'https://emkc.org/api/v2/piston/execute',            // official (may be restricted)
  'https://piston.rodentcommunity.net/api/v2/execute', // community mirror 1
].filter(Boolean) as string[];

const REQUEST_TIMEOUT_MS = 20_000; // 20 s per attempt
const MAX_OUTPUT_BYTES    = 64_000; // 64 KB output cap

// ─── Helpers ──────────────────────────────────────────────────────────────────

function truncate(s: string): string {
  if (!s) return '';
  if (s.length <= MAX_OUTPUT_BYTES) return s;
  return s.slice(0, MAX_OUTPUT_BYTES) + '\n\n[Output truncated — exceeded 64 KB limit]';
}

async function callPiston(
  endpoint: string,
  runtime: { language: string; version: string; fileName: string },
  code: string,
  stdin: string
): Promise<{ stdout: string; stderr: string; exitCode: number; executionTime: number }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  const startTime = Date.now();
  let response: Response;

  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        language: runtime.language,
        version: runtime.version,
        files: [{ name: runtime.fileName, content: code }],
        stdin: stdin || '',
        run_timeout: 10000,   // ms
        compile_timeout: 15000,
      }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Piston ${response.status}: ${text.slice(0, 200)}`);
  }

  const data = await response.json();

  // Piston v2: { run: { stdout, stderr, code, signal, output }, compile?: { ... } }
  const compileStdout = data.compile?.stdout || '';
  const compileStderr = data.compile?.stderr || '';
  const runStdout     = data.run?.stdout     || '';
  const runStderr     = data.run?.stderr     || '';
  const exitCode      = data.run?.code       ?? (data.compile?.code ?? -1);

  // Merge compile output before run output so users see the full picture
  const stdout = [compileStdout, runStdout].filter(Boolean).join('');
  const stderr = [compileStderr, runStderr].filter(Boolean).join('');

  return {
    stdout:        truncate(stdout),
    stderr:        truncate(stderr),
    exitCode,
    executionTime: Date.now() - startTime,
  };
}

// ─── Route handler ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { language, code, stdin = '' } = body;

  // Basic validation
  if (!code || typeof code !== 'string' || !code.trim()) {
    return NextResponse.json({ error: 'No code provided' }, { status: 400 });
  }
  if (!language || typeof language !== 'string') {
    return NextResponse.json({ error: 'No language provided' }, { status: 400 });
  }

  // HTML/CSS → client-side rendering only
  if (['html', 'css'].includes(language)) {
    return NextResponse.json(
      { error: 'HTML and CSS are rendered client-side' },
      { status: 400 }
    );
  }

  // JavaScript → tell client to run in its own sandbox (fast, no API needed)
  if (language === 'javascript') {
    return NextResponse.json({ clientSide: true, language: 'javascript' }, { status: 200 });
  }

  const runtime = PISTON_RUNTIMES[language];
  if (!runtime) {
    return NextResponse.json(
      { error: `Language "${language}" is not supported for server-side execution` },
      { status: 400 }
    );
  }

  // Try each Piston endpoint in order
  const errors: string[] = [];
  for (const endpoint of PISTON_ENDPOINTS) {
    try {
      const result = await callPiston(endpoint, runtime, code, stdin);
      return NextResponse.json({
        success:       true,
        stdout:        result.stdout,
        stderr:        result.stderr,
        exitCode:      result.exitCode,
        executionTime: result.executionTime,
        language:      runtime.language,
      });
    } catch (err: any) {
      const msg = err?.name === 'AbortError'
        ? `Timeout after ${REQUEST_TIMEOUT_MS / 1000}s`
        : err?.message || 'Unknown error';
      console.warn(`[Execute] Endpoint ${endpoint} failed: ${msg}`);
      errors.push(`${endpoint} → ${msg}`);
    }
  }

  // All endpoints failed
  console.error('[Execute] All Piston endpoints failed:', errors);
  return NextResponse.json(
    {
      error: 'Code execution service is currently unavailable. All execution endpoints failed.',
      details: errors,
      suggestion: 'Set PISTON_API_URL in your .env.local to point to a self-hosted Piston instance for reliable execution.',
    },
    { status: 503 }
  );
}
