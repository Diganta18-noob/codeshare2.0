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
    const { prompt, code, language, action, provider, model: reqModel, baseUrl: reqBaseUrl } = body;

    const apiKey =
      body.apiKey ||
      request.headers.get('x-ai-api-key') ||
      request.headers.get('x-gemini-api-key') ||
      process.env.OMNIROUTE_API_KEY ||
      process.env.GROQ_API_KEY ||
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      process.env.OPENAI_API_KEY;

    const baseUrl =
      reqBaseUrl ||
      process.env.OMNIROUTE_BASE_URL ||
      process.env.OPENAI_BASE_URL ||
      (provider === 'omniroute' ? 'http://localhost:20128/v1' : '');

    if (!apiKey && !baseUrl && provider !== 'omniroute') {
      return NextResponse.json(
        {
          success: false,
          error:
            'API key or OmniRoute URL is not configured. Please enter your OmniRoute URL, Groq API Key (gsk_), or Gemini API Key in the AI Assistant settings.',
        },
        { status: 400 }
      );
    }

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

    // --- 1. OMNIROUTE / CUSTOM OPENAI COMPATIBLE GATEWAY ---
    if (baseUrl || provider === 'omniroute') {
      const targetBase = (baseUrl || 'http://localhost:20128/v1').replace(/\/$/, '');
      const endpoint = targetBase.endsWith('/chat/completions')
        ? targetBase
        : `${targetBase}/chat/completions`;

      const targetModel = reqModel || process.env.OMNIROUTE_MODEL || 'llama-3.3-70b-versatile';

      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey || 'omniroute'}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: targetModel,
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
          const reply =
            data.choices?.[0]?.message?.content ||
            data.choices?.[0]?.text ||
            'No response generated from OmniRoute.';
          return NextResponse.json({ success: true, response: reply, provider: 'omniroute', model: targetModel });
        } else {
          const errorData = await response.json().catch(() => ({}));
          const omniErr = errorData.error?.message || `OmniRoute endpoint returned HTTP ${response.status}`;
          console.warn(`[OmniRoute AI] Request failed:`, omniErr);
          return NextResponse.json({ success: false, error: omniErr }, { status: 500 });
        }
      } catch (err: any) {
        console.error('[OmniRoute AI] Fetch error:', err.message);
        return NextResponse.json(
          { success: false, error: `Failed to connect to OmniRoute gateway at ${endpoint}: ${err.message}` },
          { status: 500 }
        );
      }
    }

    const isGroq = apiKey?.startsWith('gsk_') || Boolean(process.env.GROQ_API_KEY && !apiKey?.startsWith('AIza'));

    // --- 2. GROQ PROVIDER EXECUTION ---
    if (isGroq) {
      let lastGroqError = '';
      const groqModels = reqModel ? [reqModel, ...GROQ_MODELS] : GROQ_MODELS;

      for (const model of groqModels) {
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

    // --- 3. GEMINI PROVIDER EXECUTION ---
    let lastGeminiError = '';
    const geminiModels = reqModel ? [reqModel, ...GEMINI_MODELS] : GEMINI_MODELS;

    for (const model of geminiModels) {
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
