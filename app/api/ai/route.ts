import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const GROQ_MODELS = [
  'llama-3.3-70b-versatile',
  'llama-3.1-70b-versatile',
  'llama3-70b-8192',
  'llama3-8b-8192',
  'mixtral-8x7b-32768',
];

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
      request.headers.get('x-ai-api-key') ||
      request.headers.get('x-gemini-api-key') ||
      process.env.GROQ_API_KEY ||
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      process.env.NEXT_PUBLIC_GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error:
            'API key is not configured. Please enter your Groq API Key (starts with gsk_) or Gemini API Key in the AI Assistant settings, or set GROQ_API_KEY / GEMINI_API_KEY in Vercel.',
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
      finalPrompt = `Refactor this ${language} code to make it clean, readable, and performant. Provide the refactored code block and explain improvements:\n\n\`\`\`${language}\n${code}\n\`\`\``;
    } else if (action === 'tests') {
      finalPrompt = `Generate comprehensive unit tests for this ${language} code:\n\n\`\`\`${language}\n${code}\n\`\`\``;
    } else {
      finalPrompt = `Code context (${language}):\n\`\`\`${language}\n${code}\n\`\`\`\n\nUser Request: ${prompt}`;
    }

    const isGroq = apiKey.startsWith('gsk_') || Boolean(process.env.GROQ_API_KEY && !apiKey.startsWith('AIza'));

    // --- 1. GROQ PROVIDER EXECUTION ---
    if (isGroq) {
      let lastGroqError = '';

      for (const model of GROQ_MODELS) {
        try {
          const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model,
              messages: [
                {
                  role: 'system',
                  content: 'You are an expert AI software engineer assistant.',
                },
                {
                  role: 'user',
                  content: finalPrompt,
                },
              ],
              temperature: 0.2,
              max_tokens: 2048,
            }),
          });

          if (response.ok) {
            const data = await response.json();
            const reply = data.choices?.[0]?.message?.content || 'No response generated.';
            return NextResponse.json({ success: true, response: reply, provider: 'groq', model });
          } else {
            const errorData = await response.json().catch(() => ({}));
            lastGroqError = errorData.error?.message || `Groq model ${model} returned HTTP ${response.status}`;
            console.warn(`[Groq AI] Model ${model} failed:`, lastGroqError);
          }
        } catch (err: any) {
          lastGroqError = err.message || 'Groq network request failed';
        }
      }

      return NextResponse.json(
        { success: false, error: lastGroqError || 'Groq API request failed across all models.' },
        { status: 500 }
      );
    }

    // --- 2. GEMINI PROVIDER EXECUTION ---
    let lastGeminiError = '';

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
          return NextResponse.json({ success: true, response: reply, provider: 'gemini', model });
        } else {
          const errorData = await response.json().catch(() => ({}));
          lastGeminiError = errorData.error?.message || `Gemini model ${model} failed (${response.status})`;
          console.warn(`[Gemini AI] Model ${model} failed:`, lastGeminiError);
        }
      } catch (err: any) {
        lastGeminiError = err.message || 'Network error';
        console.warn(`[Gemini AI] Model ${model} fetch exception:`, lastGeminiError);
      }
    }

    return NextResponse.json(
      { success: false, error: lastGeminiError || 'Gemini API call failed across all models' },
      { status: 500 }
    );
  } catch (error: any) {
    console.error('[API] AI handler error:', error.message);
    return NextResponse.json(
      { success: false, error: 'Internal server error while processing AI request' },
      { status: 500 }
    );
  }
}
