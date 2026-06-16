import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Map Monaco language IDs to Piston runtime names + versions
const LANGUAGE_MAP: Record<string, { language: string; version: string }> = {
  javascript: { language: 'javascript', version: '18.15.0' },
  typescript: { language: 'typescript', version: '5.0.3' },
  python: { language: 'python', version: '3.10.0' },
  java: { language: 'java', version: '15.0.2' },
  csharp: { language: 'csharp', version: '6.12.0' },
  cpp: { language: 'c++', version: '10.2.0' },
  go: { language: 'go', version: '1.16.2' },
  rust: { language: 'rust', version: '1.68.2' },
  php: { language: 'php', version: '8.2.3' },
  ruby: { language: 'ruby', version: '3.0.1' },
  swift: { language: 'swift', version: '5.3.3' },
  kotlin: { language: 'kotlin', version: '1.8.20' },
  shell: { language: 'bash', version: '5.2.0' },
  sql: { language: 'sqlite3', version: '3.36.0' },
};

export async function POST(request: NextRequest) {
  try {
    const { language, code } = await request.json();

    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { error: 'No code provided' },
        { status: 400 }
      );
    }

    // Check if it's an HTML-renderable language (handled client-side)
    if (['html', 'css'].includes(language)) {
      return NextResponse.json(
        { error: 'HTML/CSS should be rendered client-side via iframe' },
        { status: 400 }
      );
    }

    const runtime = LANGUAGE_MAP[language];
    if (!runtime) {
      return NextResponse.json(
        { error: `Language "${language}" is not supported for execution` },
        { status: 400 }
      );
    }

    const startTime = Date.now();

    // Call Piston API with a 10s timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch('https://emkc.org/api/v2/piston/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        language: runtime.language,
        version: runtime.version,
        files: [{ content: code }],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const text = await response.text();
      console.error('[Execute] Piston error:', text);
      return NextResponse.json(
        { error: 'Execution service error', details: text },
        { status: 502 }
      );
    }

    const result = await response.json();
    const executionTime = Date.now() - startTime;

    // Piston returns { run: { stdout, stderr, code, signal, output } }
    return NextResponse.json({
      stdout: result.run?.stdout || '',
      stderr: result.run?.stderr || '',
      exitCode: result.run?.code ?? -1,
      executionTime,
      language: runtime.language,
    });
  } catch (error: any) {
    if (error.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Execution timed out (10s limit)' },
        { status: 408 }
      );
    }
    console.error('[Execute] Failed:', error.message);
    return NextResponse.json(
      { error: 'Failed to execute code' },
      { status: 500 }
    );
  }
}
