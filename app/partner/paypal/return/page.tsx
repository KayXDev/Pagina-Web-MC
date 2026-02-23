'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Button, Card, Badge } from '@/components/ui';

export default function PartnerPaypalReturnPage() {
  const sp = useSearchParams();
  const bookingId = String(sp?.get('bookingId') || '').trim();
  const token = String(sp?.get('token') || '').trim(); // PayPal order id

  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');
  const [message, setMessage] = useState<string>('Confirmando pago…');

  useEffect(() => {
    const run = async () => {
      if (!bookingId || !token) {
        setStatus('error');
        setMessage('Faltan parámetros de PayPal.');
        return;
      }
      try {
        const res = await fetch('/api/partner/checkout/paypal/capture', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookingId, paypalOrderId: token }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(String((data as any)?.error || 'Error'));
        setStatus('ok');
        const next = String((data as any)?.status || '').toUpperCase();
        if (next === 'ACTIVE') {
          setMessage('Pago confirmado. Tu slot ya está activo.');
        } else {
          setMessage('Pago confirmado. Tu solicitud está pendiente de aprobación y se activará al aprobarse.');
        }
      } catch (e: any) {
        setStatus('error');
        setMessage(String(e?.message || 'Error'));
      }
    };
    void run();
  }, [bookingId, token]);

  return (
    <main className="max-w-2xl mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">PayPal</h1>
      <Card hover={false} className="rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-gray-950/25">
        <div className="flex items-center justify-between mb-3">
          <div className="text-gray-900 dark:text-white font-semibold">Resultado</div>
          {status === 'ok' ? <Badge variant="success">OK</Badge> : status === 'error' ? <Badge variant="danger">ERROR</Badge> : <Badge variant="info">...</Badge>}
        </div>
        <div className="text-gray-700 dark:text-gray-300">{message}</div>
        <div className="mt-5 flex items-center gap-2">
          <Link href="/partner/publicar" className="inline-flex">
            <Button variant="primary" size="sm">Ir a mi anuncio</Button>
          </Link>
          <Link href="/partner" className="inline-flex">
            <Button variant="secondary" size="sm">Ver Partners</Button>
          </Link>
        </div>
      </Card>
    </main>
  );
}
