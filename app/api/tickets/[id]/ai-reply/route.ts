import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/session';
import dbConnect from '@/lib/mongodb';
import Ticket from '@/models/Ticket';
import TicketReply from '@/models/TicketReply';
import { ollamaChat } from '@/lib/ai/ollama';
import { getKbSnippets } from '@/lib/ai/kb';
import { groqChat } from '@/lib/ai/groq';

function parseBool(v: string | undefined, defaultValue: boolean) {
  if (typeof v !== 'string') return defaultValue;
  const s = v.trim().toLowerCase();
  if (!s) return defaultValue;
  if (s === '1' || s === 'true' || s === 'yes' || s === 'on') return true;
  if (s === '0' || s === 'false' || s === 'no' || s === 'off') return false;
  return defaultValue;
}

function parseProvider(v: string | undefined) {
  const s = String(v || '').trim().toLowerCase();
  if (s === 'groq') return 'groq' as const;
  if (s === 'auto') return 'auto' as const;
  return 'ollama' as const;
}

async function listOllamaModels(baseUrl: string): Promise<string[]> {
  try {
    const res = await fetch(`${baseUrl.replace(/\/+$/, '')}/api/tags`, { method: 'GET' });
    const data = await res.json().catch(() => ({}));
    const models = Array.isArray((data as any)?.models) ? ((data as any).models as any[]) : [];
    return models
      .map((m) => String(m?.name || '').trim())
      .filter(Boolean)
      .slice(0, 12);
  } catch {
    return [];
  }
}

function isStaffRole(role?: string) {
  return role === 'ADMIN' || role === 'STAFF' || role === 'OWNER';
}

export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();

    const enabled = parseBool(process.env.TICKETS_AI_ENABLED, true);
    if (!enabled) {
      return NextResponse.json({ ok: false, skipped: 'disabled' }, { status: 200 });
    }

    const provider = parseProvider(process.env.TICKETS_AI_PROVIDER);

    const baseUrl = (process.env.OLLAMA_BASE_URL || '').trim();
    if ((provider === 'ollama' || provider === 'auto') && !baseUrl) {
      return NextResponse.json(
        {
          error: 'AI not configured',
          hint: 'Set OLLAMA_BASE_URL (e.g. http://127.0.0.1:11434) and optionally OLLAMA_MODEL (e.g. llama3.1).',
        },
        { status: 501 }
      );
    }

    if ((provider === 'groq' || provider === 'auto') && !(process.env.GROQ_API_KEY || '').trim()) {
      return NextResponse.json(
        {
          ok: false,
          skipped: 'ai_not_configured',
          error: 'AI not configured',
          hint: 'Set GROQ_API_KEY (and optionally GROQ_MODEL) or switch TICKETS_AI_PROVIDER to ollama.',
        },
        { status: 501 }
      );
    }

    await dbConnect();

    const ticket = await Ticket.findById(params.id);
    if (!ticket) {
      return NextResponse.json({ error: 'Ticket no encontrado' }, { status: 404 });
    }

    const isStaff = isStaffRole((user as any)?.role);
    const isOwner = (ticket as any).userId === user.id;
    if (!isStaff && !isOwner) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    if ((ticket as any).status === 'CLOSED') {
      return NextResponse.json({ ok: false, skipped: 'closed' }, { status: 200 });
    }

    // Avoid loops / spam: only reply if the latest message is from the user.
    const latest = await TicketReply.findOne({ ticketId: params.id }).sort({ createdAt: -1 }).lean();
    if (latest && (latest as any).isStaff) {
      return NextResponse.json({ ok: false, skipped: 'latest_is_staff' }, { status: 200 });
    }

    // Cooldown between AI replies.
    const lastAi = await TicketReply.findOne({ ticketId: params.id, isAi: true }).sort({ createdAt: -1 }).lean();
    if (lastAi?.createdAt) {
      const elapsedMs = Date.now() - new Date(lastAi.createdAt as any).getTime();
      if (elapsedMs < 20_000) {
        return NextResponse.json({ ok: false, skipped: 'cooldown' }, { status: 200 });
      }
    }

    const replies = await TicketReply.find({ ticketId: params.id }).sort({ createdAt: 1 }).lean();

    const convo = [
      {
        from: 'user',
        username: (ticket as any).username,
        message: (ticket as any).message,
        at: (ticket as any).createdAt,
      },
      ...replies.map((r: any) => ({
        from: r.isAi ? 'ai' : r.isStaff ? 'staff' : 'user',
        username: r.username,
        message: r.message,
        at: r.createdAt,
      })),
    ];

    const lastUserMsg = (() => {
      for (let i = convo.length - 1; i >= 0; i--) {
        const m = convo[i];
        if (m.from === 'user') return String(m.message || '');
      }
      return String((ticket as any).message || '');
    })();

    const kb = await getKbSnippets(`${(ticket as any).subject}\n${lastUserMsg}`);

    const kbText = kb
      .map((k) => `--- ${k.id}\n${k.snippet.trim()}`)
      .join('\n\n')
      .slice(0, 6000);

    const convoText = convo
      .map((m) => {
        const who = m.from === 'staff' ? 'STAFF' : m.from === 'ai' ? 'AI' : 'USER';
        return `[${who}] ${m.username}: ${String(m.message || '').trim()}`;
      })
      .join('\n')
      .slice(0, 9000);

    const system =
      'You are an AI support assistant for a Minecraft server website.\n' +
      '- You are NOT a human staff member. Do not claim you are staff.\n' +
      '- Be concise and helpful.\n' +
      '- Use the provided knowledge snippets when relevant.\n' +
      "- If you are unsure, say so and ask 1-3 clarifying questions.\n" +
      '- Do not invent policies, prices, or actions taken by staff.\n' +
      '- Reply in the language used by the user (Spanish or English).\n' +
      'Return ONLY the reply text (no JSON, no markdown code fences).\n';

    const userPrompt =
      `Ticket subject: ${(ticket as any).subject}\n` +
      `Ticket category: ${(ticket as any).category}\n` +
      `Ticket status: ${(ticket as any).status}\n` +
      `\nConversation:\n${convoText}\n` +
      `\nKnowledge snippets (may be empty):\n${kbText || '(none)'}\n` +
      `\nWrite the next reply message addressed to the user.`;

    const raw =
      provider === 'groq'
        ? await groqChat({
            messages: [
              { role: 'system', content: system },
              { role: 'user', content: userPrompt },
            ],
            temperature: 0.2,
            maxTokens: 450,
          })
        : await ollamaChat({
            baseUrl,
            messages: [
              { role: 'system', content: system },
              { role: 'user', content: userPrompt },
            ],
            temperature: 0.2,
          });

    const replyText = String(raw || '').trim();
    if (!replyText) {
      return NextResponse.json({ error: 'AI returned empty reply' }, { status: 502 });
    }

    const reply = await TicketReply.create({
      ticketId: params.id,
      userId: 'ai',
      username: 'IA',
      message: replyText,
      isStaff: true,
      isAi: true,
    });

    // Mark activity on the ticket and move to IN_PROGRESS.
    if ((ticket as any).status === 'OPEN') {
      (ticket as any).status = 'IN_PROGRESS';
    }
    (ticket as any).updatedAt = new Date();
    await ticket.save();

    return NextResponse.json({ ok: true, reply }, { status: 201 });
  } catch (error: any) {
    if (error?.message === 'Unauthorized') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const causeCode = (error as any)?.cause?.code;
    const msg = String(error?.message || '');
    const isConnRefused = causeCode === 'ECONNREFUSED' || msg.toLowerCase().includes('fetch failed');
    if (isConnRefused) {
      const baseUrl = (process.env.OLLAMA_BASE_URL || '').trim() || 'http://127.0.0.1:11434';
      return NextResponse.json(
        {
          ok: false,
          skipped: 'ai_unavailable',
          error: 'AI unavailable',
          hint:
            `Cannot reach Ollama at ${baseUrl}. Start Ollama and ensure the model exists (e.g. ollama pull llama3.1).`,
        },
        { status: 502 }
      );
    }

    const isOllamaModelMissing = msg.includes("Ollama error (404)") && msg.toLowerCase().includes('model') && msg.toLowerCase().includes('not found');
    if (isOllamaModelMissing) {
      const baseUrl = (process.env.OLLAMA_BASE_URL || '').trim() || 'http://127.0.0.1:11434';
      const wantModel = (process.env.OLLAMA_MODEL || 'llama3.1').trim();
      const models = await listOllamaModels(baseUrl);
      return NextResponse.json(
        {
          ok: false,
          skipped: 'model_missing',
          error: 'Ollama model not found',
          hint:
            models.length > 0
              ? `Model '${wantModel}' is not installed. Set OLLAMA_MODEL to one of: ${models.join(', ')} (or pull it with: ollama pull ${wantModel}).`
              : `Model '${wantModel}' is not installed. Run: ollama pull ${wantModel} OR set OLLAMA_MODEL to an installed model (check /api/tags).`,
        },
        { status: 502 }
      );
    }

    console.error('tickets/[id]/ai-reply error:', error);
    return NextResponse.json({ error: 'Server Error' }, { status: 500 });
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
