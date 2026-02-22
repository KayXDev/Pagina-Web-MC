import { NextResponse } from 'next/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const chatBodySchema = z
  .object({
    message: z.string().min(1).max(2000).optional(),
    messages: z
      .array(
        z.object({
          role: z.enum(['user', 'assistant', 'system']),
          content: z.string().min(1).max(2000),
        })
      )
      .max(20)
      .optional(),
  })
  .refine((v) => typeof v.message === 'string' || Array.isArray(v.messages), {
    message: 'message or messages is required',
  });

export async function POST(request: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Falta OPENAI_API_KEY en variables de entorno' },
        { status: 500 }
      );
    }

    const bodyJson = await request.json().catch(() => ({}));
    const body = chatBodySchema.parse(bodyJson);

    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

    const systemPrompt =
      'Eres un asistente de soporte para un servidor/comunidad de Minecraft. Responde en español de forma breve y útil. ' +
      'Si te piden datos sensibles (contraseñas, tokens) o acciones inseguras, rechaza. Si no sabes algo del servidor, pregunta por detalles.';

    const upstreamMessages = Array.isArray(body.messages)
      ? body.messages
      : [{ role: 'user' as const, content: String(body.message || '') }];

    const messages = [{ role: 'system' as const, content: systemPrompt }, ...upstreamMessages];

    const upstream = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.4,
        max_tokens: 400,
      }),
    });

    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      const msg =
        typeof (data as any)?.error?.message === 'string'
          ? (data as any).error.message
          : 'Error al contactar con OpenAI';
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    const reply = String((data as any)?.choices?.[0]?.message?.content || '').trim();
    if (!reply) {
      return NextResponse.json({ error: 'Respuesta vacía del modelo' }, { status: 500 });
    }

    return NextResponse.json({ reply });
  } catch (error: any) {
    if (error?.name === 'ZodError') {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
    }

    console.error('Chat API error:', error);
    return NextResponse.json({ error: 'Error del chatbot' }, { status: 500 });
  }
}
