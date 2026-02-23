'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Button, Card, Badge } from '@/components/ui';

export default function PartnerPaypalCancelPage() {
  const sp = useSearchParams();
  const bookingId = String(sp?.get('bookingId') || '').trim();

  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');
  const [message, setMessage] = useState<string>('Cancelando reserva…');

  useEffect(() => {
    const run = async () => {
      if (!bookingId) {
        setStatus('ok');
        setMessage('Pago cancelado.');
        return;
      }
      try {
        const res = await fetch('/api/partner/checkout/cancel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookingId }),
        });
        await res.json().catch(() => ({}));
        setStatus('ok');
        setMessage('Pago cancelado. Reserva liberada.');
      } catch (e: any) {
        setStatus('error');
        setMessage(String(e?.message || 'Error'));
      }
    };
    void run();
  }, [bookingId]);

  return (
    <main className="max-w-2xl mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">PayPal</h1>
      <Card hover={false} className="rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-gray-950/25">
        <div className="flex items-center justify-between mb-3">
          <div className="text-gray-900 dark:text-white font-semibold">Cancelado</div>
          {status === 'error' ? <Badge variant="danger">ERROR</Badge> : <Badge variant="warning">CANCELADO</Badge>}
        </div>
        <div className="text-gray-700 dark:text-gray-300">{message}</div>
        <div className="mt-5 flex items-center gap-2">
          <Link href="/partner/publicar" className="inline-flex">
            <Button variant="primary" size="sm">Volver a publicar</Button>
          </Link>
          <Link href="/partner" className="inline-flex">
            <Button variant="secondary" size="sm">Ver Partners</Button>
          </Link>
        </div>
      </Card>
    </main>
  );
}
