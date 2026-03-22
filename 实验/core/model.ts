import { requireEnv } from './env.ts';

type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export async function callDeepSeekModel(
  messages: ChatMessage[],
  options: { model?: string; temperature?: number } = {}
) {
  const apiKey = requireEnv('DEEPSEEK_API_KEY');
  const model = options.model || 'deepseek-reasoner';
  const temperature = typeof options.temperature === 'number' ? options.temperature : 0.4;
  const timeoutMs = Number(process.env.EXPERIMENT_DEEPSEEK_TIMEOUT_MS || 120000);

  let response: Response;
  try {
    response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        temperature,
        messages,
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error: any) {
    const message = error?.message || String(error);
    if (error?.name === 'TimeoutError' || error?.name === 'AbortError' || /timeout|aborted/i.test(message)) {
      throw new Error(`DeepSeek request timed out after ${timeoutMs}ms`);
    }
    throw new Error(`DeepSeek request failed: ${message}`);
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`DeepSeek request failed: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? '';
}
