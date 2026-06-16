import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: 'Gemini API key is not configured. Please add GEMINI_API_KEY to your .env.local file.',
        },
        { status: 400 }
      );
    }

    const { prompt, code, language, action } = await request.json();

    if (!prompt && !action) {
      return NextResponse.json(
        { success: false, error: 'Prompt or action is required' },
        { status: 400 }
      );
    }

    let finalPrompt = '';

    if (action === 'explain') {
      finalPrompt = `Explain this ${language} code clearly:\n\n\`\`\`${language}\n${code}\n\`\`\``;
    } else if (action === 'bugs') {
      finalPrompt = `Analyze this ${language} code for bugs, logic errors, or performance issues and suggest fixes:\n\n\`\`\`${language}\n${code}\n\`\`\``;
    } else if (action === 'refactor') {
      finalPrompt = `Refactor this ${language} code to make it more clean, readable, and performant. Provide the refactored code and explain the changes:\n\n\`\`\`${language}\n${code}\n\`\`\``;
    } else if (action === 'tests') {
      finalPrompt = `Generate comprehensive unit tests for this ${language} code:\n\n\`\`\`${language}\n${code}\n\`\`\``;
    } else {
      finalPrompt = `Code context (${language}):\n\`\`\`${language}\n${code}\n\`\`\`\n\nUser Question/Request: ${prompt}`;
    }

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

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

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[API] Gemini API response error:', errorData);
      return NextResponse.json(
        { success: false, error: errorData.error?.message || 'Gemini API returned an error' },
        { status: response.status }
      );
    }

    const data = await response.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated.';

    return NextResponse.json({ success: true, response: reply });
  } catch (error: any) {
    console.error('[API] Gemini API error:', error.message);
    return NextResponse.json(
      { success: false, error: 'Internal server error while calling Gemini' },
      { status: 500 }
    );
  }
}
