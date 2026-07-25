import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const GEMINI_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const apiKey =
      body.apiKey ||
      request.headers.get('x-gemini-api-key') ||
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      process.env.NEXT_PUBLIC_GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Gemini API key is not configured. Add GEMINI_API_KEY to Vercel settings or enter your key in the AI Assistant settings.',
        },
        { status: 400 }
      );
    }

    const { prompt, code, language, action } = body;

    if (!prompt && !action) {
      return NextResponse.json(
        { success: false, error: 'Prompt or action is required' },
        { status: 400 }
      );
    }

    let finalPrompt = '';

    if (action === 'explain') {
      finalPrompt = `Explain this ${language} code clearly and concisely:\n\n\`\`\`${language}\n${code}\n\`\`\``;
    } else if (action === 'bugs') {
      finalPrompt = `Analyze this ${language} code for bugs, logic errors, or performance issues and suggest fixes:\n\n\`\`\`${language}\n${code}\n\`\`\``;
    } else if (action === 'refactor') {
      finalPrompt = `Refactor this ${language} code to make it more clean, readable, and performant. Provide the refactored code block and explain the improvements:\n\n\`\`\`${language}\n${code}\n\`\`\``;
    } else if (action === 'tests') {
      finalPrompt = `Generate comprehensive unit tests for this ${language} code:\n\n\`\`\`${language}\n${code}\n\`\`\``;
    } else {
      finalPrompt = `Code context (${language}):\n\`\`\`${language}\n${code}\n\`\`\`\n\nUser Request: ${prompt}`;
    }

    let lastError = '';

    for (const model of GEMINI_MODELS) {
      try {
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: finalPrompt,
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.2,
              maxOutputTokens: 2048,
            },
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const reply =
            data.candidates?.[0]?.content?.parts?.[0]?.text ||
            'No response generated.';
          return NextResponse.json({ success: true, response: reply });
        } else {
          const errorData = await response.json().catch(() => ({}));
          lastError = errorData.error?.message || `Model ${model} failed (${response.status})`;
          console.warn(`[AI] Model ${model} failed:`, lastError);
        }
      } catch (err: any) {
        lastError = err.message || 'Network error';
        console.warn(`[AI] Model ${model} fetch exception:`, lastError);
      }
    }

    return NextResponse.json(
      { success: false, error: lastError || 'Gemini API call failed across all models' },
      { status: 500 }
    );
  } catch (error: any) {
    console.error('[API] Gemini API handler error:', error.message);
    return NextResponse.json(
      { success: false, error: 'Internal server error while calling Gemini AI' },
      { status: 500 }
    );
  }
}
