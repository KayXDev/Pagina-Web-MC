'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Card, Button, Input } from '@/components/ui';
import { FaComments, FaTimes } from 'react-icons/fa';
import { useSession } from 'next-auth/react';
import { usePathname, useRouter } from 'next/navigation';
import { t } from '@/lib/i18n';
import { useClientLang } from '@/lib/useClientLang';

type ChatMsg = { role: 'user' | 'assistant'; content: string };

type Mode = 'AI' | 'AGENT';

type TicketReply = {
  _id: string;
  message: string;
  isStaff: boolean;
  isAi?: boolean;
  createdAt: string;
  username: string;
};

const CHATBOT_STORAGE_KEY = 'chatbot:messages:v1';

export default function ChatbotWidget() {
  const { status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  const lang = useClientLang();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState('');
  const [mode, setMode] = useState<Mode>('AI');
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [ticketReplies, setTicketReplies] = useState<TicketReply[]>([]);
  const [ticketSyncing, setTicketSyncing] = useState(false);
  const [handoffConfirm, setHandoffConfirm] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);

  const listRef = useRef<HTMLDivElement | null>(null);

  const trimmed = text.trim();

  const apiPayloadMessages = useMemo(
    () => messages.map((m) => ({ role: m.role, content: m.content })),
    [messages]
  );

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CHATBOT_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;
      const safe = parsed
        .filter((m: any) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
        .map((m: any) => ({ role: m.role as ChatMsg['role'], content: String(m.content).slice(0, 2000) }))
        .slice(-50);
      if (safe.length > 0) setMessages(safe);
    } catch {
      // ignore malformed localStorage
    }
  }, []);

  useEffect(() => {
    try {
      if (mode !== 'AI') return;
      localStorage.setItem(CHATBOT_STORAGE_KEY, JSON.stringify(messages.slice(-50)));
    } catch {
      // ignore quota/storage errors
    }
  }, [messages, mode]);

  useEffect(() => {
    setMessages((prev) => {
      if (prev.length === 0) return [{ role: 'assistant', content: t(lang, 'chatbot.greet') }];
      if (prev.length === 1 && prev[0]?.role === 'assistant') {
        return [{ role: 'assistant', content: t(lang, 'chatbot.greet') }];
      }
      return prev;
    });
  }, [lang]);

  const transcript = useMemo(() => {
    const lines = messages
      .map((m) => `${m.role === 'user' ? 'Usuario' : 'Asistente'}: ${m.content}`)
      .join('\n');
    return lines.trim();
  }, [messages]);

  useEffect(() => {
    if (!open) return;
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [open, messages.length]);

  const pushAssistant = (content: string) => {
    setMessages((prev) => [...prev, { role: 'assistant', content }]);
  };

  const goLoginForAgent = () => {
    const cb = typeof pathname === 'string' && pathname.length > 0 ? pathname : '/';
    router.push(`/auth/login?callbackUrl=${encodeURIComponent(cb)}`);
  };

  const normalizeIntent = (value: string) => value.trim().toLowerCase();

  const wantsHuman = (value: string) => {
    const v = normalizeIntent(value);
    const hasHumanWord =
      v.includes('agente') || v.includes('humano') || v.includes('admin') || v.includes('persona');
    const hasAskVerb = v.includes('hablar') || v.includes('deriva') || v.includes('pasame') || v.includes('pásame');
    return hasHumanWord && (hasAskVerb || v.startsWith('agente') || v.startsWith('humano'));
  };

  const createTicketAndSwitch = async () => {
    if (status !== 'authenticated') {
      pushAssistant(t(lang, 'chatbot.handoffNeedsLogin'));
      return;
    }

    setLoading(true);
    setHandoffConfirm(false);

    try {
      const subject = 'Chatbot: derivación a agente';
      const base =
        'El usuario ha pedido hablar con un agente humano desde el chatbot.\n\n' +
        'Transcripción del chat:\n' +
        transcript;
      const message = base.length >= 20 ? base : base.padEnd(20, '.');

      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject,
          category: 'TECHNICAL',
          message,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as any)?.error || 'Error');

      const id = String((data as any)?._id || '').trim();
      if (!id) throw new Error('Error');

      setTicketId(id);
      setMode('AGENT');
      pushAssistant(t(lang, 'chatbot.handoffDone'));

      // Let the AI respond once to the newly created ticket.
      fetch(`/api/tickets/${id}/ai-reply`, { method: 'POST' })
        .catch(() => undefined)
        .finally(() => {
          setTimeout(() => {
            syncTicket(id, { silent: true });
          }, 800);
        });
    } catch (e: any) {
      pushAssistant(String(e?.message || t(lang, 'chatbot.handoffError')));
    } finally {
      setLoading(false);
    }
  };

  const syncTicket = async (id: string, opts?: { silent?: boolean }) => {
    if (!opts?.silent) setTicketSyncing(true);
    try {
      const res = await fetch(`/api/tickets/${id}`, { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as any)?.error || 'Error');
      setTicketReplies(Array.isArray((data as any).replies) ? ((data as any).replies as TicketReply[]) : []);
    } catch {
      // ignore transient polling errors
    } finally {
      if (!opts?.silent) setTicketSyncing(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    if (mode !== 'AGENT') return;
    if (!ticketId) return;

    let cancelled = false;

    const run = async () => {
      if (cancelled) return;
      await syncTicket(ticketId);
    };

    run();

    const interval = setInterval(() => {
      syncTicket(ticketId, { silent: true });
    }, 4_000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [open, mode, ticketId]);

  const send = async () => {
    if (!trimmed || loading) return;

    const nextUserMsg: ChatMsg = { role: 'user', content: trimmed };
    setMessages((prev) => [...prev, nextUserMsg]);
    setText('');

    // If the user explicitly asks for a human agent, offer handoff.
    if (mode === 'AI' && wantsHuman(trimmed)) {
      setHandoffConfirm(true);
      pushAssistant(t(lang, 'chatbot.handoffAsk'));
      return;
    }

    setLoading(true);

    try {
      if (mode === 'AGENT') {
        if (!ticketId) throw new Error(t(lang, 'chatbot.noActiveTicket'));
        if (status !== 'authenticated') {
          throw new Error(t(lang, 'chatbot.requireLoginAgent'));
        }

        const res = await fetch(`/api/tickets/${ticketId}/replies`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: nextUserMsg.content }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error((data as any)?.error || 'Error');

        // Fire-and-forget: AI replies to the latest user message.
        fetch(`/api/tickets/${ticketId}/ai-reply`, { method: 'POST' })
          .catch(() => undefined)
          .finally(() => {
            setTimeout(() => {
              syncTicket(ticketId, { silent: true });
            }, 800);
          });

        await syncTicket(ticketId, { silent: true });
        return;
      }

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lang, messages: [...apiPayloadMessages, nextUserMsg] }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((data as any).error || 'Error');
      }

      const reply = String((data as any).reply || '').trim();
      if (!reply) throw new Error('Error');

      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
    } catch (e: any) {
      const errText = String(e?.message || 'Error del chatbot');
      const offer =
        mode === 'AI'
          ? t(lang, 'chatbot.offerHumanOnError')
          : '';

      setMessages((prev) => {
        const next = [...prev, { role: 'assistant' as const, content: errText }];
        return offer ? [...next, { role: 'assistant' as const, content: offer }] : next;
      });

      if (mode === 'AI') setHandoffConfirm(true);
    } finally {
      setLoading(false);
    }
  };

  const renderConversation = () => {
    if (mode !== 'AGENT') {
      return messages;
    }

    // In agent mode we still show the assistant/system messages we already added,
    // plus the real ticket conversation as assistant bubbles when staff replies.
    // Only render staff replies from the DB to avoid duplicating user messages
    // (user messages are already stored in local state when sending).
    const mappedReplies: ChatMsg[] = ticketReplies
      .filter((r) => r.isStaff)
      .map((r) => ({
        role: 'assistant',
        content: r.isAi ? `${t(lang, 'support.aiLabel')}: ${r.message}` : `${t(lang, 'support.staffLabel')}: ${r.message}`,
      }));

    return [...messages, ...mappedReplies];
  };

  const conversation = renderConversation();

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 z-50 flex justify-end">
      {open ? (
        <Card
          className="border-gray-200 dark:border-white/10 bg-white/95 dark:bg-gray-950/95 rounded-2xl w-full max-w-[420px] shadow-lg shadow-black/10 dark:shadow-black/40"
          hover={false}
        >
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2 min-w-0">
              <div className="h-9 w-9 rounded-xl bg-gray-100 border border-gray-200 dark:bg-white/5 dark:border-white/10 grid place-items-center text-gray-900 dark:text-white shrink-0">
                <FaComments />
              </div>
              <div className="min-w-0">
                <div className="text-gray-900 dark:text-white font-semibold leading-5 truncate">
                  {t(lang, 'chatbot.title')}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400 leading-4">
                    {loading
                    ? t(lang, 'chatbot.typing')
                      : mode === 'AGENT'
                        ? ticketSyncing
                        ? t(lang, 'chatbot.agentConnecting')
                        : t(lang, 'chatbot.subtitleAgent')
                      : t(lang, 'chatbot.subtitleAi')}
                </div>
              </div>
            </div>

            <Button
              variant="secondary"
              size="sm"
              className="!px-3"
              onClick={() => setOpen(false)}
            >
              <FaTimes />
              <span className="sr-only">{t(lang, 'chatbot.closeAria')}</span>
            </Button>
          </div>

            {mode === 'AI' ? (
              <div className="-mt-1 mb-2 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setHandoffConfirm(true);
                    pushAssistant(t(lang, 'chatbot.handoffAsk'));
                  }}
                  disabled={loading}
                >
                  {t(lang, 'chatbot.talkToAgent')}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setHandoffConfirm(true);
                    pushAssistant(t(lang, 'chatbot.handoffAskAlt'));
                  }}
                  disabled={loading}
                >
                  {t(lang, 'chatbot.notHelped')}
                </Button>
              </div>
            ) : null}

            {handoffConfirm ? (
              <div className="mb-2 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-gray-950/70 p-3">
                <div className="text-sm text-gray-800 dark:text-gray-200">
                  {status === 'authenticated'
                    ? t(lang, 'chatbot.handoffConfirmAuthed')
                    : t(lang, 'chatbot.handoffConfirmUnauthed')}
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {status === 'authenticated' ? (
                    <>
                      <Button type="button" size="sm" onClick={createTicketAndSwitch} disabled={loading}>
                        {t(lang, 'chatbot.handoffYes')}
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => setHandoffConfirm(false)}
                        disabled={loading}
                      >
                        {t(lang, 'chatbot.handoffStayAi')}
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button type="button" size="sm" onClick={goLoginForAgent}>
                        {t(lang, 'user.login')}
                      </Button>
                      <Button type="button" variant="secondary" size="sm" onClick={() => setHandoffConfirm(false)}>
                        {t(lang, 'common.cancel')}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ) : null}

          <div
            ref={listRef}
            className="h-72 overflow-y-auto rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-950 p-3 space-y-2"
          >
            {conversation.map((m, idx) => (
              <div key={idx} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                <div
                  className={
                    m.role === 'user'
                      ? 'max-w-[85%] rounded-2xl px-3 py-2 text-sm bg-minecraft-grass text-white border border-minecraft-grass/20'
                      : 'max-w-[85%] rounded-2xl px-3 py-2 text-sm bg-gray-100 border border-gray-200 text-gray-900 dark:bg-white/10 dark:border-white/10 dark:text-gray-100'
                  }
                >
                  <span className="whitespace-pre-wrap break-words">{m.content}</span>
                </div>
              </div>
            ))}

            {loading ? (
              <div className="flex justify-start">
                <div className="max-w-[85%] rounded-2xl px-3 py-2 text-sm bg-gray-100 border border-gray-200 text-gray-700 dark:bg-white/10 dark:border-white/10 dark:text-gray-100">
                  <span className="opacity-80">…</span>
                </div>
              </div>
            ) : null}
          </div>

          <div className="mt-3 flex items-center gap-2">
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={
                mode === 'AGENT'
                  ? t(lang, 'chatbot.inputPlaceholderAgent')
                  : t(lang, 'chatbot.inputPlaceholderAi')
              }
              disabled={loading}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  send();
                }
              }}
            />
            <Button onClick={send} disabled={loading || !trimmed}>
              {t(lang, 'common.send')}
            </Button>
          </div>

          {mode === 'AGENT' && ticketId ? (
            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              {t(lang, 'chatbot.ticketLabel')}{': '}
              <a className="underline hover:text-gray-700 dark:hover:text-gray-300" href={`/soporte/${ticketId}`}>
                /soporte/{ticketId}
              </a>
            </div>
          ) : null}
        </Card>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="h-12 w-12 rounded-full bg-white border border-gray-200 text-gray-900 grid place-items-center hover:bg-gray-50 dark:bg-white/10 dark:border-white/10 dark:text-white dark:hover:bg-white/15"
          aria-label={t(lang, 'chatbot.openAria')}
        >
          <FaComments />
        </button>
      )}
    </div>
  );
}
