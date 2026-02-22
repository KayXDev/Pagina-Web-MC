'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Card, Button, Input } from '@/components/ui';
import { FaComments, FaTimes } from 'react-icons/fa';

type ChatMsg = { role: 'user' | 'assistant'; content: string };

export default function ChatbotWidget() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState('');
  const [messages, setMessages] = useState<ChatMsg[]>([
    { role: 'assistant', content: 'Hola, ¿en qué puedo ayudarte?' },
  ]);

  const listRef = useRef<HTMLDivElement | null>(null);

  const trimmed = text.trim();

  const apiPayloadMessages = useMemo(
    () => messages.map((m) => ({ role: m.role, content: m.content })),
    [messages]
  );

  useEffect(() => {
    if (!open) return;
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [open, messages.length]);

  const send = async () => {
    if (!trimmed || loading) return;

    const nextUserMsg: ChatMsg = { role: 'user', content: trimmed };
    setMessages((prev) => [...prev, nextUserMsg]);
    setText('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...apiPayloadMessages, nextUserMsg] }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((data as any).error || 'Error');
      }

      const reply = String((data as any).reply || '').trim();
      if (!reply) throw new Error('Error');

      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
    } catch (e: any) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: String(e?.message || 'Error del chatbot') },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {open ? (
        <Card
          className="border-white/10 bg-gray-950/25 rounded-2xl w-[360px] shadow-lg shadow-black/40"
          hover={false}
        >
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2 min-w-0">
              <div className="h-9 w-9 rounded-xl bg-white/5 border border-white/10 grid place-items-center text-white shrink-0">
                <FaComments />
              </div>
              <div className="min-w-0">
                <div className="text-white font-semibold leading-5 truncate">Asistente</div>
                <div className="text-xs text-gray-400 leading-4">
                  {loading ? 'Escribiendo…' : 'Soporte automático'}
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
              <span className="sr-only">Cerrar</span>
            </Button>
          </div>

          <div
            ref={listRef}
            className="h-72 overflow-y-auto rounded-xl border border-white/10 bg-black/20 p-3 space-y-2"
          >
            {messages.map((m, idx) => (
              <div key={idx} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                <div
                  className={
                    m.role === 'user'
                      ? 'max-w-[85%] rounded-2xl px-3 py-2 text-sm bg-white/10 border border-white/10 text-white'
                      : 'max-w-[85%] rounded-2xl px-3 py-2 text-sm bg-white/5 border border-white/10 text-gray-100'
                  }
                >
                  <span className="whitespace-pre-wrap break-words">{m.content}</span>
                </div>
              </div>
            ))}

            {loading ? (
              <div className="flex justify-start">
                <div className="max-w-[85%] rounded-2xl px-3 py-2 text-sm bg-white/5 border border-white/10 text-gray-100">
                  <span className="opacity-80">…</span>
                </div>
              </div>
            ) : null}
          </div>

          <div className="mt-3 flex items-center gap-2">
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Escribe tu mensaje…"
              disabled={loading}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  send();
                }
              }}
            />
            <Button onClick={send} disabled={loading || !trimmed}>
              Enviar
            </Button>
          </div>
        </Card>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="h-12 w-12 rounded-full bg-white/10 border border-white/10 text-white grid place-items-center hover:bg-white/15"
          aria-label="Abrir chat"
        >
          <FaComments />
        </button>
      )}
    </div>
  );
}
