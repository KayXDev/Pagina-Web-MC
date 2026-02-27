import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getKbSnippets } from '@/lib/ai/kb';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const chatBodySchema = z
  .object({
    lang: z.enum(['es', 'en']).optional(),
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
    const bodyJson = await request.json().catch(() => ({}));
    const body = chatBodySchema.parse(bodyJson);

    const preferredLang = body.lang === 'en' ? 'en' : 'es';

    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) {
      const reply =
        preferredLang === 'en'
          ? 'The AI assistant is temporarily unavailable (missing GROQ_API_KEY). You can still open a support ticket at /soporte, or try again later.'
          : 'El asistente IA no está disponible temporalmente (falta GROQ_API_KEY). Puedes abrir un ticket en /soporte o intentarlo de nuevo más tarde.';
      return NextResponse.json({ reply });
    }

    const model = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';

    const upstreamMessages = Array.isArray(body.messages)
      ? body.messages
      : [{ role: 'user' as const, content: String(body.message || '') }];

    const lastUserText = (() => {
      for (let i = upstreamMessages.length - 1; i >= 0; i--) {
        const m = upstreamMessages[i];
        if (m?.role === 'user') return String(m.content || '');
      }
      return String(body.message || '');
    })();

    const kb = await getKbSnippets(lastUserText, { maxDocs: 2, maxCharsPerDoc: 700 });
    const kbText = kb
      .map((k) => `--- ${k.id}\n${k.snippet.trim()}`)
      .join('\n\n')
      .slice(0, 2500);

    const siteName = process.env.SITE_NAME || '999Wrld Network';
    const serverIp =
      process.env.NEXT_PUBLIC_MINECRAFT_SERVER_IP || process.env.MINECRAFT_SERVER_IP || 'play.999wrldnetwork.es';
    const serverPort = process.env.MINECRAFT_SERVER_PORT || '25565';
    const discordUrl = process.env.DISCORD_URL;

    const systemPrompt =
      `You are a support assistant for ${siteName}, a Minecraft server/community website. ` +
      'CRITICAL: Reply in the same language as the user message. If the user writes in English, reply in English. If the user writes in Spanish, reply in Spanish. ' +
      `If unsure, default to the website language: ${preferredLang === 'en' ? 'English' : 'Spanish'}. ` +
      'Use a professional, clear tone and step-by-step troubleshooting. Keep it concise and actionable. ' +
      'First identify the issue and ask 1-2 key clarifying questions if needed (e.g., username, Java/Bedrock, version, server IP, exact error). ' +
      'Then provide short, verifiable steps. When helpful, link users to relevant pages: /vote, /tienda, /foro, /soporte. ' +
      'If the issue requires internal actions (moderation, billing, account access) or you cannot safely resolve it, say so and suggest talking to a human staff/admin agent. ' +
      'Never ask for or accept passwords, tokens, API keys, or other sensitive data; if requested, refuse and explain why.\n' +
      `\nServer info (if asked): Java IP ${serverIp}, port ${serverPort}.` +
      (discordUrl ? ` Discord: ${discordUrl}.` : '') +
      `\nKnowledge snippets (may be empty):\n${kbText || '(none)'}\n`;

    const messages = [{ role: 'system' as const, content: systemPrompt }, ...upstreamMessages];

    const upstream = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${groqKey}`,
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
          : 'Error al contactar con Groq';
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
