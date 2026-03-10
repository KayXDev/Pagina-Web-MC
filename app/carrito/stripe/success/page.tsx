'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { FaCheckCircle, FaExclamationTriangle, FaSpinner } from 'react-icons/fa';
import PageHeader from '@/components/PageHeader';
import { Badge, Button, Card } from '@/components/ui';
import { toast } from 'react-toastify';

export default function StripeSuccessPage() {
  const sp = useSearchParams();
  const orderId = sp?.get('orderId') || '';
  const sessionId = sp?.get('session_id') || '';

  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState<string>('');

  const canConfirm = useMemo(() => Boolean(orderId && sessionId), [orderId, sessionId]);

  useEffect(() => {
    const run = async () => {
      if (!canConfirm) {
        setStatus('error');
        setMessage('Faltan datos de Stripe.');
        return;
      }

      setStatus('loading');
      try {
        const res = await fetch('/api/shop/stripe/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId, sessionId }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error((data as any).error || 'Error');

        // Clear cart (both guest + authenticated)
        try {
          localStorage.setItem('shop.cart.items', JSON.stringify([]));
          window.dispatchEvent(new Event('shop-cart-updated'));
        } catch {
          // ignore
        }
        await fetch('/api/shop/cart', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: [] }),
        }).catch(() => null);

        setStatus('success');
        setMessage('Pago confirmado. ¡Gracias!');
        toast.success('Pago confirmado');
      } catch (err: any) {
        setStatus('error');
        setMessage(err?.message || 'No se pudo confirmar el pago.');
        toast.error(err?.message || 'No se pudo confirmar el pago');
      }
    };

    run();
  }, [canConfirm, orderId, sessionId]);

  return (
    <div className="mx-auto min-h-screen max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
      <PageHeader
        title="Tarjeta / Apple Pay"
        description={status === 'success' ? 'Pago completado' : status === 'error' ? 'Hubo un problema' : 'Confirmando pago…'}
        icon={
          status === 'loading' ? (
            <FaSpinner className="text-6xl text-minecraft-gold animate-spin" />
          ) : status === 'success' ? (
            <FaCheckCircle className="text-6xl text-minecraft-grass" />
          ) : (
            <FaExclamationTriangle className="text-6xl text-yellow-400" />
          )
        }
      />

      <div className="mx-auto max-w-3xl">
        <Card hover={false} className="overflow-hidden rounded-[30px] border-white/10 bg-gray-950/25 p-0">
          <div className="flex flex-col gap-3 border-b border-white/10 bg-gray-950/30 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="text-white font-semibold">Resultado</div>
            <Badge variant={status === 'success' ? 'success' : status === 'error' ? 'danger' : 'info'}>{status}</Badge>
          </div>

          <div className="space-y-4 p-5 sm:p-6">
            <div className="text-gray-300">{message || 'Procesando…'}</div>

            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Link href="/tienda" className="w-full sm:w-auto">
                <Button className="w-full sm:w-auto">Volver a la tienda</Button>
              </Link>
              <Link href="/carrito" className="w-full sm:w-auto">
                <Button variant="secondary" className="w-full sm:w-auto">Volver al carrito</Button>
              </Link>
            </div>

            {orderId ? <div className="text-xs text-gray-500">Pedido: {orderId}</div> : null}
          </div>
        </Card>
      </div>
    </div>
  );
}
