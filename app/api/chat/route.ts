import { NextResponse } from 'next/server';

type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export async function POST(request: Request) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'DeepSeek API key is missing.' },
      { status: 500 }
    );
  }

  const body = await request.json();
  const messages = body.messages as ChatMessage[] | undefined;
  const temperature = typeof body.temperature === 'number' ? body.temperature : 0.7;
  const stream = body.stream === true;

  if (!messages || messages.length === 0) {
    return NextResponse.json(
      { error: 'Messages are required.' },
      { status: 400 }
    );
  }

  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'deepseek-reasoner',
      messages,
      temperature,
      stream,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    return NextResponse.json({ error: errorText }, { status: response.status });
  }

  if (stream) {
    return new Response(response.body, {
      status: response.status,
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    });
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content ?? '';

  return NextResponse.json({ content });
}
