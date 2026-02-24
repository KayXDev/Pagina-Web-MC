export type GroqChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

function truncate(s: string, max: number) {
  if (s.length <= max) return s;
  return s.slice(0, max);
}

export async function groqChat(opts: {
  messages: GroqChatMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
}): Promise<string> {
  const apiKey = (process.env.GROQ_API_KEY || '').trim();
  if (!apiKey) {
    throw new Error('Missing GROQ_API_KEY');
  }

  const model = (opts.model || process.env.GROQ_MODEL || 'llama-3.1-8b-instant').trim();
  const temperature = typeof opts.temperature === 'number' ? opts.temperature : 0.3;
  const maxTokens = typeof opts.maxTokens === 'number' ? opts.maxTokens : 500;

  const messages = (opts.messages || [])
    .filter((m) => m && typeof m.content === 'string' && m.content.trim())
    .slice(0, 25)
    .map((m) => ({ role: m.role, content: truncate(m.content, 4000) }));

  const upstream = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
    }),
  });

  const data = await upstream.json().catch(() => ({}));
  if (!upstream.ok) {
    const errMsg =
      typeof (data as any)?.error?.message === 'string'
        ? (data as any).error.message
        : upstream.statusText;
    throw new Error(`Groq error (${upstream.status}): ${errMsg}`);
  }

  const content = (data as any)?.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('Groq returned empty content');
  }

  return content;
}
