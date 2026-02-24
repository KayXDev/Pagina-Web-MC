export type OllamaChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export async function ollamaChat(opts: {
  messages: OllamaChatMessage[];
  model?: string;
  temperature?: number;
  baseUrl?: string;
}): Promise<string> {
  const baseUrl = (opts.baseUrl || process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434').replace(/\/+$/, '');
  const model = opts.model || process.env.OLLAMA_MODEL || 'llama3.1';
  const temperature = typeof opts.temperature === 'number' ? opts.temperature : 0.2;

  const res = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      stream: false,
      messages: opts.messages,
      options: { temperature },
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Ollama error (${res.status}): ${text || res.statusText}`);
  }

  const data = (await res.json().catch(() => null)) as any;
  const content = data?.message?.content;
  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('Ollama returned empty content');
  }
  return content;
}
